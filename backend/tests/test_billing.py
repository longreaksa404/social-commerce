"""Sellers paying Oak Order through ABA PayWay (01_PRODUCT.md §33.1): Pay
now, PayWay's callbacks, the monthly auto-charge and its retries, and the
founder's admin page. PayWay is a fake answering through an httpx
MockTransport, which also checks our signatures."""

import base64
import hashlib
import hmac
import json
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import httpx
import pytest
from sqlalchemy import select, update

from app.core import clock
from app.core.config import get_settings
from app.db.session import unscoped_session
from app.models import PlanPayment, Store
from app.services import billing, payway, telegram
from app.services.plan import add_months
from tests.helpers import add_product, place_order, random_phone, session_of

MERCHANT, KEY = "ec000002", "test-api-key"
PLAN = "/api/v1/seller/plan"


def sign(*values: str) -> str:
    digest = hmac.new(KEY.encode(), "".join(values).encode(), hashlib.sha512).digest()
    return base64.b64encode(digest).decode()


class FakePayway:
    """Transactions by tran_id and saved tokens by request_id, as the test
    sets them."""

    def __init__(self) -> None:
        self.transactions: dict[str, dict] = {}
        self.tokens: dict[str, dict] = {}
        self.charges: list[dict] = []
        self.removed: list[str] = []
        # What charging a token answers, and how the charge then stands.
        self.charge_code, self.charge_message = "00", "Success."
        self.charge_status = "APPROVED"

    def approve(self, tran_id: str, amount: str = "9.99", status: str = "APPROVED") -> None:
        self.transactions[tran_id] = {
            "payment_status": status,
            "payment_amount": float(amount),
            "payment_currency": "USD",
        }

    def handle(self, request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        path = request.url.path
        if path.endswith("/check-transaction-2"):
            assert body["hash"] == sign(body["req_time"], MERCHANT, body["tran_id"])
            found = self.transactions.get(body["tran_id"])
            if found is None:
                return httpx.Response(200, json={"status": {"code": 6, "message": "Not found"}})
            return httpx.Response(
                200, json={"data": found, "status": {"code": "00", "message": "Success!"}}
            )
        if path.endswith("/payment-credential"):
            assert body["token_flag"] == "MITR_FIX"
            self.charges.append(body)
            if self.charge_code == "00":
                self.approve(body["tran_id"], str(body["amount"]), self.charge_status)
            return httpx.Response(
                200, json={"status": {"code": self.charge_code, "message": self.charge_message}}
            )
        if path.endswith("/get-token-details"):
            assert body["hash"] == sign(MERCHANT, body["request_time"], body["request_id"])
            token = self.tokens.get(body["request_id"])
            if token is None:
                return httpx.Response(200, json={"status": {"code": "04", "message": "No"}})
            return httpx.Response(200, json={"status": {"code": "00"}, "data": token})
        if path.endswith("/remove-token"):
            assert body["hash"] == sign(MERCHANT, body["ctid"], body["request_time"], body["pwt"])
            self.removed.append(body["pwt"])
            return httpx.Response(200, json={"status": {"code": "00", "message": "Success"}})
        raise AssertionError(f"unexpected PayWay call {path}")


@pytest.fixture
def fake(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "payway_merchant_id", MERCHANT)
    monkeypatch.setattr(settings, "payway_api_key", KEY)
    monkeypatch.setattr(settings, "public_app_url", "https://order.example.com")
    monkeypatch.setattr(settings, "public_api_url", "https://api.example.com")
    payway_fake = FakePayway()
    monkeypatch.setattr(
        payway,
        "_http",
        lambda: httpx.AsyncClient(transport=httpx.MockTransport(payway_fake.handle)),
    )
    return payway_fake


@pytest.fixture
def sent(monkeypatch):
    """The Telegram messages the bot sends, collected."""
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_token", "123:abc")
    monkeypatch.setattr(settings, "telegram_bot_username", "TestShopBot")
    monkeypatch.setattr(settings, "telegram_webhook_secret", "secret")
    messages: list[dict] = []

    async def fake_send(chat_id, text, button=None):
        messages.append({"chat_id": chat_id, "text": text, "button": button})

    monkeypatch.setattr(telegram, "send_message", fake_send)
    return messages


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def store_of(client, headers) -> dict:
    return (await client.get("/api/v1/seller/store", headers=headers)).json()


async def set_store(store_id, **values) -> None:
    async with unscoped_session() as db:
        await db.execute(update(Store).where(Store.id == store_id).values(**values))
        await db.commit()


async def get_store(store_id) -> Store:
    async with unscoped_session() as db:
        return await db.get(Store, store_id)


def test_the_checkout_form_is_signed_in_payways_order(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "payway_merchant_id", MERCHANT)
    monkeypatch.setattr(settings, "payway_api_key", KEY)
    monkeypatch.setattr(payway, "_now", lambda: "20261014120000")

    form = payway.checkout_form(
        tran_id="abc123",
        amount=Decimal("9.99"),
        item="Oak Order Standard, 1 month",
        callback_url="https://api.example.com/api/v1/payway/callback",
        continue_url="https://order.example.com/dashboard/settings/plan?payment=1",
        cancel_url="https://order.example.com/dashboard/settings/plan",
        subscribe=("ctid123", "abapay"),
    )

    fields = form.fields
    items = base64.b64encode(
        json.dumps([{"name": "Oak Order Standard, 1 month", "quantity": 1, "price": 9.99}]).encode()
    ).decode()
    callback = base64.b64encode(b"https://api.example.com/api/v1/payway/callback").decode()
    # req_time, merchant_id, tran_id, amount, items, shipping, firstname,
    # lastname, email, phone, type, payment_option, return_url, cancel_url,
    # continue_success_url, return_deeplink, currency, custom_fields,
    # return_params, payout, lifetime, additional_params, google_pay_token,
    # skip_success_page, token_flag, frequency (PayWay's docs).
    expected = sign(
        "20261014120000", MERCHANT, "abc123", "9.99", items, "", "", "", "", "",
        "purchase", "abapay", callback,
        "https://order.example.com/dashboard/settings/plan",
        "https://order.example.com/dashboard/settings/plan?payment=1",
        "", "USD", "", "", "", "60", "", "", "1", "CITR_FIX", "1M",
    )  # fmt: skip
    assert (
        form.action
        == "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase"
    )
    assert fields["hash"] == expected
    assert (fields["ctid"], fields["token_flag"], fields["frequency"]) == (
        "ctid123",
        "CITR_FIX",
        "1M",
    )
    assert fields["return_url"] == callback
    assert "shipping" not in fields  # empty ones aren't sent


async def test_pay_now_is_off_until_payway_is_set_up(client, auth_headers):
    headers = await auth_headers()

    plan = (await client.get(PLAN, headers=headers)).json()
    checkout = await client.post(f"{PLAN}/checkout", headers=headers, json={"period": "month"})

    assert (plan["payway"], plan["auto_charge"], plan["charge_failed"]) == (False, None, False)
    assert checkout.status_code == 503
    assert checkout.json()["error"]["code"] == "PAYWAY_NOT_CONFIGURED"


async def test_pay_now_extends_the_shop_once_payway_says_paid(client, auth_headers, fake):
    headers = await auth_headers()
    paid_until = date.fromisoformat((await client.get(PLAN, headers=headers)).json()["paid_until"])

    checkout = await client.post(f"{PLAN}/checkout", headers=headers, json={"period": "month"})
    assert checkout.status_code == 200, checkout.text
    form = checkout.json()
    tran_id = form["fields"]["tran_id"]
    assert form["fields"]["continue_success_url"].endswith(f"?payment={form['payment_id']}")
    assert "ctid" not in form["fields"]

    fake.approve(tran_id)
    callback = await client.post(
        "/api/v1/payway/callback", json={"tran_id": tran_id, "status": "0"}
    )
    again = await client.post("/api/v1/payway/callback", json={"tran_id": tran_id, "status": "0"})
    plan = (await client.get(PLAN, headers=headers)).json()

    assert callback.status_code == again.status_code == 200
    assert plan["on_trial"] is False
    # The month after the trial: from the day after it ends.
    start = paid_until + timedelta(days=1)
    assert plan["paid_until"] == (add_months(start, 1) - timedelta(days=1)).isoformat()
    assert [(p["method"], p["status"], p["amount"]) for p in plan["payments"]] == [
        ("payway", "paid", "9.99")
    ]


async def test_a_callback_only_makes_us_ask_payway(client, auth_headers, fake):
    headers = await auth_headers()
    before = (await client.get(PLAN, headers=headers)).json()
    form = (await client.post(f"{PLAN}/checkout", headers=headers, json={"period": "year"})).json()

    # Someone posts a "paid" callback; PayWay knows of no payment.
    await client.post(
        "/api/v1/payway/callback", json={"tran_id": form["fields"]["tran_id"], "status": "0"}
    )
    checked = await client.get(f"{PLAN}/payments/{form['payment_id']}", headers=headers)
    after = (await client.get(PLAN, headers=headers)).json()

    assert checked.json()["status"] == "pending"
    assert after["paid_until"] == before["paid_until"]
    assert after["payments"] == []


async def test_back_from_payway_the_page_asks_until_paid(client, auth_headers, fake):
    headers = await auth_headers()
    form = (await client.post(f"{PLAN}/checkout", headers=headers, json={"period": "year"})).json()
    path = f"{PLAN}/payments/{form['payment_id']}"

    waiting = (await client.get(path, headers=headers)).json()
    fake.approve(form["fields"]["tran_id"], "99.00")
    paid = (await client.get(path, headers=headers)).json()

    assert waiting["status"] == "pending"
    assert (paid["status"], paid["period"], paid["amount"]) == ("paid", "year", "99.00")


async def test_a_different_amount_from_payway_is_not_paid(client, auth_headers, fake):
    headers = await auth_headers()
    form = (await client.post(f"{PLAN}/checkout", headers=headers, json={"period": "year"})).json()

    fake.approve(form["fields"]["tran_id"], "9.99")  # a year for the price of a month
    checked = (await client.get(f"{PLAN}/payments/{form['payment_id']}", headers=headers)).json()

    assert checked["status"] == "failed"


async def test_declined_and_left_checkouts_fail(client, auth_headers, fake):
    headers = await auth_headers()
    declined = (
        await client.post(f"{PLAN}/checkout", headers=headers, json={"period": "month"})
    ).json()
    left = (await client.post(f"{PLAN}/checkout", headers=headers, json={"period": "month"})).json()
    fake.approve(declined["fields"]["tran_id"], status="DECLINED")
    async with unscoped_session() as db:
        await db.execute(
            update(PlanPayment)
            .where(PlanPayment.tran_id == left["fields"]["tran_id"])
            .values(created_at=datetime.now(UTC) - timedelta(hours=3))
        )
        await db.commit()

    first = (await client.get(f"{PLAN}/payments/{declined['payment_id']}", headers=headers)).json()
    second = (await client.get(f"{PLAN}/payments/{left['payment_id']}", headers=headers)).json()
    plan = (await client.get(PLAN, headers=headers)).json()

    assert (first["status"], first["failure"]) == ("failed", "Payment was declined")
    assert (second["status"], second["failure"]) == ("failed", "Not paid")
    assert plan["payments"] == []  # checkouts that failed aren't the seller's news


async def test_auto_charge_is_monthly_only(client, auth_headers, fake):
    headers = await auth_headers()

    response = await client.post(
        f"{PLAN}/checkout", headers=headers, json={"period": "year", "auto_charge": "aba"}
    )

    assert response.status_code == 422
    assert response.json()["error"]["message"] == "Auto-charge is for the monthly plan."


async def subscribe(client, headers, fake, kind="aba", last="5312") -> tuple[str, dict]:
    """Pay now with auto-charge, paid, and PayWay holding the saved token."""
    form = (
        await client.post(
            f"{PLAN}/checkout", headers=headers, json={"period": "month", "auto_charge": kind}
        )
    ).json()
    fields = form["fields"]
    fake.approve(fields["tran_id"])
    fake.tokens[fields["tran_id"]] = {
        "ctid": fields["ctid"],
        "pwt": f"pwt-{fields['tran_id']}",
        "source_of_fund": f"*****{last}",
        "type": "ABA ACCOUNT" if kind == "aba" else "Visa",
        "status": 1,
        "token_flag": "CITR_FIX",
        "frequency": "1M",
    }
    return fields["tran_id"], form


async def test_paying_with_auto_charge_saves_the_account(client, auth_headers, fake):
    headers = await auth_headers()
    tran_id, form = await subscribe(client, headers, fake)
    assert (form["fields"]["payment_option"], form["fields"]["token_flag"]) == (
        "abapay",
        "CITR_FIX",
    )

    await client.post("/api/v1/payway/callback", json={"tran_id": tran_id})
    await client.post("/api/v1/payway/token-callback", json={"request_id": tran_id})
    plan = (await client.get(PLAN, headers=headers)).json()

    assert plan["auto_charge"]["label"] == "ABA ···5312"
    assert plan["auto_charge"]["amount"] == "9.99"
    # The day after the month just paid for.
    assert (
        plan["auto_charge"]["next_charge"]
        == (date.fromisoformat(plan["paid_until"]) + timedelta(days=1)).isoformat()
    )


async def test_a_token_callback_payway_doesnt_confirm_saves_nothing(client, auth_headers, fake):
    headers = await auth_headers()
    form = (
        await client.post(
            f"{PLAN}/checkout", headers=headers, json={"period": "month", "auto_charge": "card"}
        )
    ).json()

    await client.post(
        "/api/v1/payway/token-callback",
        json={
            "request_id": form["fields"]["tran_id"],
            "payment_credential": {"ctid": form["fields"]["ctid"], "pwt": "forged", "status": 1},
        },
    )

    assert (await client.get(PLAN, headers=headers)).json()["auto_charge"] is None


async def test_a_new_card_replaces_the_old_at_payway(client, auth_headers, fake):
    headers = await auth_headers()
    first, _ = await subscribe(client, headers, fake, "aba", "5312")
    await client.post("/api/v1/payway/token-callback", json={"request_id": first})
    second, _ = await subscribe(client, headers, fake, "card", "4242")
    await client.post("/api/v1/payway/token-callback", json={"request_id": second})

    plan = (await client.get(PLAN, headers=headers)).json()

    assert plan["auto_charge"]["label"] == "Visa ···4242"
    assert fake.removed == [f"pwt-{first}"]


async def auto_charging_shop(client, register, fake, days_over=1) -> tuple[dict, dict]:
    """A shop with auto-charge on whose paid time ran out `days_over` days ago."""
    tokens = await register()
    headers = bearer(tokens)
    tran_id, _ = await subscribe(client, headers, fake)
    await client.post("/api/v1/payway/callback", json={"tran_id": tran_id})
    await client.post("/api/v1/payway/token-callback", json={"request_id": tran_id})
    store = await store_of(client, headers)
    await set_store(store["id"], paid_until=clock.today() - timedelta(days=days_over))
    return headers, store


async def next_day(store_id) -> None:
    """A day passes: the shop's paid time and its charges move a day back."""
    async with unscoped_session() as db:
        store = await db.get(Store, store_id)
        store.paid_until -= timedelta(days=1)
        await db.execute(
            update(PlanPayment)
            .where(PlanPayment.store_id == store_id)
            .values(created_at=PlanPayment.created_at - timedelta(days=1))
        )
        await db.commit()


async def test_the_daily_run_charges_on_the_start_day(client, register, fake, sent):
    headers, store = await auto_charging_shop(client, register, fake)

    await billing.run_daily()
    again = await billing.run_daily()  # once a day only
    plan = (await client.get(PLAN, headers=headers)).json()

    assert len(fake.charges) == 1
    charge = fake.charges[0]
    assert (charge["ctid"], charge["pwt"], charge["amount"]) == (
        (await get_store(store["id"])).payway_ctid,
        (await get_store(store["id"])).payway_token,
        9.99,
    )
    assert again.charged == 0
    assert plan["stage"] == "active"
    # Charged on the start day: the new month starts the day after the old one.
    assert plan["paid_until"] == (add_months(clock.today(), 1) - timedelta(days=1)).isoformat()
    assert [(p["method"], p["status"]) for p in plan["payments"]][0] == ("payway_auto", "paid")
    assert sent == []


async def test_a_failing_charge_is_tried_for_7_days_with_two_messages(client, register, fake, sent):
    headers, store = await auto_charging_shop(client, register, fake)
    fake.charge_status = "DECLINED"
    cap = await add_product(store["id"], "cap", stock=5)

    for day in range(1, 9):
        await billing.run_daily()
        if day < 8:
            await next_day(store["id"])
    plan = (await client.get(PLAN, headers=headers)).json()
    order = await place_order(client, store["slug"], [(cap, None, 1)], total="10.00")

    assert len(fake.charges) == 7  # days 1 to 7, not day 8
    assert len(sent) == 2  # the first failure and day 5
    assert "យើងនឹងព្យាយាមម្ដងទៀត" in sent[0]["text"]
    assert "នៅតែមិនបានសម្រេច" in sent[1]["text"]
    assert sent[0]["button"] == ("បង់ឥឡូវនេះ", "https://order.example.com/dashboard/settings/plan")
    assert plan["stage"] == "stopped"
    assert plan["charge_failed"] is True
    assert plan["auto_charge"] is not None  # still on: it tries again next time
    assert order.status_code == 409


async def test_an_expired_token_turns_auto_charge_off_and_says_so(client, register, fake, sent):
    headers, store = await auto_charging_shop(client, register, fake)
    fake.charge_code, fake.charge_message = "84", "Payment credential is expired"

    await billing.run_daily()
    plan = (await client.get(PLAN, headers=headers)).json()

    assert plan["auto_charge"] is None
    assert plan["payments"][0]["failure"] == "Payment credential is expired"
    assert len(sent) == 1 and "ត្រូវបានបិទ" in sent[0]["text"]


async def test_paying_now_after_a_failed_charge_stops_the_retries(client, register, fake, sent):
    headers, store = await auto_charging_shop(client, register, fake, days_over=2)
    fake.charge_status = "DECLINED"
    await billing.run_daily()
    form = (await client.post(f"{PLAN}/checkout", headers=headers, json={"period": "month"})).json()
    fake.approve(form["fields"]["tran_id"])
    await client.post("/api/v1/payway/callback", json={"tran_id": form["fields"]["tran_id"]})
    await next_day(store["id"])

    await billing.run_daily()

    assert len(fake.charges) == 1
    assert (await client.get(PLAN, headers=headers)).json()["stage"] == "active"


async def test_turning_auto_charge_off_removes_the_token_at_payway(client, auth_headers, fake):
    headers = await auth_headers()
    tran_id, _ = await subscribe(client, headers, fake)
    await client.post("/api/v1/payway/token-callback", json={"request_id": tran_id})

    response = await client.delete(f"{PLAN}/auto-charge", headers=headers)

    assert response.status_code == 200, response.text
    assert response.json()["auto_charge"] is None
    assert fake.removed == [f"pwt-{tran_id}"]


async def test_the_daily_run_needs_its_secret(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "billing_cron_secret", "cron-secret")

    missing = await client.post("/api/v1/billing/run")
    wrong = await client.post("/api/v1/billing/run", headers={"X-Cron-Secret": "nope"})
    right = await client.post("/api/v1/billing/run", headers={"X-Cron-Secret": "cron-secret"})

    assert (missing.status_code, wrong.status_code, right.status_code) == (404, 404, 202)


async def test_paying_and_checking_payments_is_the_owners(client, auth_headers, fake):
    owner = await auth_headers()
    other = await auth_headers()
    phone = random_phone()
    await client.post(
        "/api/v1/seller/staff",
        headers=owner,
        json={"full_name": "Dara", "phone": phone, "password": "first-password"},
    )
    login = await client.post(
        "/api/v1/auth/login", json={"login": phone, "password": "first-password"}
    )
    staff = bearer(session_of(login))
    form = (await client.post(f"{PLAN}/checkout", headers=owner, json={"period": "month"})).json()

    by_staff = await client.post(f"{PLAN}/checkout", headers=staff, json={"period": "month"})
    by_other_shop = await client.get(f"{PLAN}/payments/{form['payment_id']}", headers=other)

    assert by_staff.status_code == 403
    assert by_other_shop.status_code == 404


async def test_the_admin_page_is_only_for_the_founders_phone(client, register, monkeypatch):
    founder, seller = await register(), await register()
    monkeypatch.setattr(get_settings(), "admin_phones", f"+855 {founder['phone'][1:]}, 0")
    seller_store = await store_of(client, bearer(seller))

    refused = await client.get("/api/v1/admin/shops", headers=bearer(seller))
    shops = await client.get("/api/v1/admin/shops", headers=bearer(founder))
    account = (await client.get("/api/v1/seller/account", headers=bearer(founder))).json()
    marked = await client.post(
        f"/api/v1/admin/shops/{seller_store['id']}/payments",
        headers=bearer(founder),
        json={"period": "month", "amount": "0", "note": "Free month for helping"},
    )
    detail = (
        await client.get(f"/api/v1/admin/shops/{seller_store['id']}", headers=bearer(founder))
    ).json()

    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "ADMIN_ONLY"
    assert shops.status_code == 200
    assert {seller_store["id"]} <= {shop["id"] for shop in shops.json()}
    assert account["is_admin"] is True
    assert marked.status_code == 200, marked.text
    assert detail["on_trial"] is False
    assert [(p["amount"], p["reference"]) for p in detail["payments"]] == [
        ("0.00", "Free month for helping")
    ]
    assert (await client.get("/api/v1/seller/account", headers=bearer(seller))).json()[
        "is_admin"
    ] is False


async def test_the_browser_never_gets_our_api_key(client, auth_headers, fake):
    headers = await auth_headers()

    form = await client.post(f"{PLAN}/checkout", headers=headers, json={"period": "month"})

    assert form.status_code == 200
    assert KEY not in form.text
    async with unscoped_session() as db:
        rows = list(await db.scalars(select(PlanPayment)))
    pending = [p for p in rows if p.id.hex == form.json()["payment_id"].replace("-", "")]
    assert [(p.method, p.status) for p in pending] == [("payway", "pending")]
