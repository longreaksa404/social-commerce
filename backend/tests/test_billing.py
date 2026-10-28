"""Sellers paying Oak Order by hand (01_PRODUCT.md §33.1, 2026-10-14): the
shop's code and Oak's KHQR, "I've paid", the founder confirming it or not
on the admin page, and the daily payment reminders."""

import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy import update

from app.core import clock
from app.core.config import get_settings
from app.db.session import unscoped_session
from app.models import Store
from app.services import billing, telegram
from app.services.plan import CODE_ALPHABET, add_months, shop_code
from tests.helpers import add_product, place_order, random_phone, session_of

PLAN = "/api/v1/seller/plan"
ADMIN = "/api/v1/admin/shops"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.fixture
def sent(monkeypatch):
    """The Telegram messages the bot sends, collected."""
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_token", "123:abc")
    monkeypatch.setattr(settings, "telegram_bot_username", "TestShopBot")
    monkeypatch.setattr(settings, "telegram_webhook_secret", "secret")
    monkeypatch.setattr(settings, "public_app_url", "https://order.example.com")
    messages: list[dict] = []

    async def fake_send(chat_id, text, button=None):
        messages.append({"chat_id": str(chat_id), "text": text, "button": button})

    monkeypatch.setattr(telegram, "send_message", fake_send)
    return messages


@pytest.fixture
async def founder(admin):
    """The founder's admin account (ADMIN_PHONES), whose own Telegram chat
    with the bot gets Oak Order's alerts."""
    return admin


async def store_of(client, headers) -> dict:
    return (await client.get("/api/v1/seller/store", headers=headers)).json()


async def chat_of(store_id) -> str:
    async with unscoped_session() as db:
        return (await db.get(Store, store_id)).telegram_chat_id


async def set_paid_until(store_id, day: date) -> None:
    async with unscoped_session() as db:
        await db.execute(update(Store).where(Store.id == store_id).values(paid_until=day))
        await db.commit()


def test_a_shops_code_is_short_stable_and_easy_to_read():
    store_id = uuid.uuid4()

    code = shop_code(store_id)

    assert code == shop_code(store_id)
    assert code.startswith("OAK-") and len(code) == 10
    assert set(code[4:]) <= set(CODE_ALPHABET)
    assert not set(code[4:]) & set("01IO")


async def test_the_plan_shows_oaks_khqr_with_the_shops_code(client, auth_headers, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "oak_khqr_account", "oaksolutions@aclb")
    monkeypatch.setattr(settings, "oak_bank_name", "ABA")
    monkeypatch.setattr(settings, "oak_bank_account_name", "OAK SOLUTIONS")
    monkeypatch.setattr(settings, "oak_bank_account_number", "000 111 222")
    headers = await auth_headers()

    plan = (await client.get(PLAN, headers=headers)).json()

    code = plan["code"]
    assert code == shop_code(uuid.UUID((await store_of(client, headers))["id"]))
    pay_to = plan["pay_to"]
    # Tag 54, the amount, written as NBC's SDK writes it.
    for khqr, amount in ((pay_to["khqr_month"], "54049.99"), (pay_to["khqr_year"], "540299")):
        assert "oaksolutions@aclb" in khqr
        assert amount in khqr
        assert f"0110{code}" in khqr  # the bill number
        # ABA shows the receiver the name ("Outlet"), not the bill number.
        assert f"5920OAK ORDER {code}" in khqr
    assert pay_to["khqr_name"] == f"OAK ORDER {code}"
    assert plan["pay_to"]["bank"]["account_number"] == "000 111 222"


async def test_ive_paid_alerts_the_founder_once(client, register, founder, sent):
    seller = await register()
    headers = bearer(seller)
    store = await store_of(client, headers)

    first = await client.post(f"{PLAN}/paid", headers=headers, json={"period": "month"})
    again = await client.post(f"{PLAN}/paid", headers=headers, json={"period": "year"})

    assert first.status_code == again.status_code == 200, first.text
    claim = again.json()["claim"]
    assert (claim["status"], claim["period"], claim["amount"]) == ("pending", "month", "9.99")
    assert again.json()["payments"] == []
    # Nothing changes until the founder finds the money.
    assert again.json()["paid_until"] == first.json()["paid_until"]
    assert len(sent) == 1
    assert sent[0]["chat_id"] == str(founder["telegram_user_id"])
    assert first.json()["code"] in sent[0]["text"]
    assert sent[0]["button"] == ("ពិនិត្យ", f"https://order.example.com/admin/shops/{store['id']}")


async def test_the_founder_confirms_and_the_month_is_added(client, register, founder, sent):
    seller = await register()
    headers = bearer(seller)
    store = await store_of(client, headers)
    paid_until = date.fromisoformat((await client.get(PLAN, headers=headers)).json()["paid_until"])
    claim = (await client.post(f"{PLAN}/paid", headers=headers, json={"period": "month"})).json()[
        "claim"
    ]

    confirmed = await client.post(
        f"{ADMIN}/{store['id']}/payments/{claim['id']}/confirm",
        headers=bearer(founder),
        json={"note": "ABA 14 Oct"},
    )
    twice = await client.post(
        f"{ADMIN}/{store['id']}/payments/{claim['id']}/confirm", headers=bearer(founder), json={}
    )
    plan = (await client.get(PLAN, headers=headers)).json()

    assert confirmed.status_code == 200, confirmed.text
    assert twice.status_code == 409
    start = paid_until + timedelta(days=1)
    assert plan["paid_until"] == (add_months(start, 1) - timedelta(days=1)).isoformat()
    assert plan["claim"] is None and plan["on_trial"] is False
    assert [(p["status"], p["amount"]) for p in plan["payments"]] == [("paid", "9.99")]


async def test_not_found_tells_the_seller_who_can_say_it_again(client, register, founder, sent):
    seller = await register()
    headers = bearer(seller)
    store = await store_of(client, headers)
    claim = (await client.post(f"{PLAN}/paid", headers=headers, json={"period": "year"})).json()[
        "claim"
    ]

    rejected = await client.post(
        f"{ADMIN}/{store['id']}/payments/{claim['id']}/reject",
        headers=bearer(founder),
        json={"note": "No transfer with your code yet"},
    )
    plan = (await client.get(PLAN, headers=headers)).json()
    again = (await client.post(f"{PLAN}/paid", headers=headers, json={"period": "year"})).json()

    assert rejected.status_code == 200, rejected.text
    assert plan["claim"] is None
    assert [(p["status"], p["failure"]) for p in plan["payments"]] == [
        ("failed", "No transfer with your code yet")
    ]
    assert again["claim"]["status"] == "pending"
    assert len(sent) == 2  # the founder heard twice


async def test_unpaid_for_7_days_stops_orders_and_marking_paid_reopens(client, register, founder):
    seller = await register()
    headers = bearer(seller)
    store = await store_of(client, headers)
    cap = await add_product(store["id"], "cap", stock=5)
    await set_paid_until(store["id"], clock.today() - timedelta(days=8))

    refused = await place_order(client, store["slug"], [(cap, None, 1)], total="10.00")
    marked = await client.post(
        f"{ADMIN}/{store['id']}/payments", headers=bearer(founder), json={"period": "month"}
    )
    taken = await place_order(client, store["slug"], [(cap, None, 1)], total="10.00")

    assert refused.status_code == 409
    assert marked.status_code == 200, marked.text
    # From the day it's paid, once orders had stopped.
    assert (
        marked.json()["paid_until"]
        == (add_months(clock.today(), 1) - timedelta(days=1)).isoformat()
    )
    assert taken.status_code == 201, taken.text


async def test_reminders_on_the_start_day_and_day_5_only(client, register, sent, monkeypatch):
    seller = await register()
    store = await store_of(client, bearer(seller))
    base = clock.today()
    await set_paid_until(store["id"], base - timedelta(days=1))
    chat = await chat_of(store["id"])

    for day in range(0, 9):  # days 1 to 9 after the paid time ended
        monkeypatch.setattr(clock, "today", lambda day=day: base + timedelta(days=day))
        await billing.run_daily()
        await billing.run_daily()  # twice the same day: still once

    to_seller = [m for m in sent if m["chat_id"] == chat]
    assert len(to_seller) == 2
    assert "ដល់ពេលបង់ប្រាក់" in to_seller[0]["text"]
    assert "យើងមិនទាន់ទទួលបាន" in to_seller[1]["text"]
    assert shop_code(uuid.UUID(store["id"])) in to_seller[0]["text"]
    assert to_seller[0]["button"] == ("បង់ប្រាក់", "https://order.example.com/dashboard/settings/plan")


async def test_no_reminder_while_the_founder_checks_a_payment(client, register, sent):
    seller = await register()
    headers = bearer(seller)
    store = await store_of(client, headers)
    await client.post(f"{PLAN}/paid", headers=headers, json={"period": "month"})
    await set_paid_until(store["id"], clock.today() - timedelta(days=1))

    summary = await billing.run_daily()

    assert summary.reminders == 0


async def test_shops_without_telegram_get_the_dashboard_notice(client, register, sent):
    seller = await register()
    headers = bearer(seller)
    store = await store_of(client, headers)
    await client.delete("/api/v1/seller/store/telegram", headers=headers)
    await set_paid_until(store["id"], clock.today() - timedelta(days=1))

    summary = await billing.run_daily()
    plan = (await client.get(PLAN, headers=headers)).json()

    assert summary.reminders == 0
    assert plan["stage"] == "overdue"  # the Orders tab shows "Pay by …"


async def test_the_daily_run_needs_its_secret(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "billing_cron_secret", "cron-secret")

    missing = await client.post("/api/v1/billing/run")
    wrong = await client.post("/api/v1/billing/run", headers={"X-Cron-Secret": "nope"})
    right = await client.post("/api/v1/billing/run", headers={"X-Cron-Secret": "cron-secret"})

    assert (missing.status_code, wrong.status_code, right.status_code) == (404, 404, 202)


async def test_saying_paid_is_the_owners(client, auth_headers):
    owner = await auth_headers()
    phone = random_phone()
    await client.post(
        "/api/v1/seller/staff",
        headers=owner,
        json={"full_name": "Dara", "phone": phone, "password": "first-password"},
    )
    login = await client.post(
        "/api/v1/auth/login", json={"login": phone, "password": "first-password"}
    )

    response = await client.post(
        f"{PLAN}/paid", headers=bearer(session_of(login)), json={"period": "month"}
    )

    assert response.status_code == 403


async def test_one_shops_payments_stay_its_own(client, register, founder):
    a, b = await register(), await register()
    store_b = await store_of(client, bearer(b))
    claim_a = (
        await client.post(f"{PLAN}/paid", headers=bearer(a), json={"period": "month"})
    ).json()["claim"]

    plan_b = (await client.get(PLAN, headers=bearer(b))).json()
    # A's payment through B's shop address on the admin page: not found.
    crossed = await client.post(
        f"{ADMIN}/{store_b['id']}/payments/{claim_a['id']}/confirm",
        headers=bearer(founder),
        json={},
    )
    by_seller = await client.get(ADMIN, headers=bearer(a))

    assert plan_b["claim"] is None and plan_b["payments"] == []
    assert crossed.status_code == 404
    # A seller's login never opens the admin, the founder's own shop's neither.
    assert by_seller.status_code == 401


async def test_the_admin_page_lists_codes_and_waiting_payments(client, register, founder):
    seller = await register()
    store = await store_of(client, bearer(seller))
    await client.post(f"{PLAN}/paid", headers=bearer(seller), json={"period": "month"})

    shops = (await client.get(ADMIN, headers=bearer(founder))).json()

    row = next(shop for shop in shops if shop["id"] == store["id"])
    assert row["code"] == shop_code(uuid.UUID(store["id"]))
    assert row["claim"]["status"] == "pending"
    assert row["telegram"] is True
