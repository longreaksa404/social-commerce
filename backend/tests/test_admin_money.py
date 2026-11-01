"""Money in the admin panel (01_PRODUCT.md §22.11, parts 15 to 18): a
paid-until date moved with a reason, a payment undone, every payment by
month and year, and the plan reminder sent now."""

from datetime import timedelta

import pytest
from sqlalchemy import update

from app.core import clock
from app.core.config import get_settings
from app.db.session import unscoped_session
from app.models import Store
from app.services import billing, telegram
from app.services.admin_money import _period

SHOPS = "/api/v1/admin/shops"
PAYMENTS = "/api/v1/admin/payments"


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
        messages.append({"chat_id": str(chat_id), "text": text})

    monkeypatch.setattr(telegram, "send_message", fake_send)
    return messages


async def open_shop(client, register) -> dict:
    """A shop on its free trial: the seller's tokens and its store."""
    seller = await register()
    store = (await client.get("/api/v1/seller/store", headers=bearer(seller))).json()
    return {"seller": seller, "store": store, "url": f"{SHOPS}/{store['id']}"}


async def set_paid_until(store_id, day) -> None:
    async with unscoped_session() as db:
        await db.execute(update(Store).where(Store.id == store_id).values(paid_until=day))
        await db.commit()


async def test_a_paid_until_date_moves_with_a_reason_in_the_log(client, register, admin):
    shop = await open_shop(client, register)
    later = clock.today() + timedelta(days=40)

    moved = await client.put(
        f"{shop['url']}/paid-until",
        headers=bearer(admin),
        json={"paid_until": later.isoformat(), "reason": "Fixing their KHQR"},
    )
    same = await client.put(
        f"{shop['url']}/paid-until",
        headers=bearer(admin),
        json={"paid_until": later.isoformat(), "reason": "again"},
    )

    assert moved.status_code == 200, moved.text
    assert moved.json()["paid_until"] == later.isoformat()
    line = moved.json()["log"][0]
    assert line["action"] == "paid_until" and line["reason"] == "Fixing their KHQR"
    assert line["details"]["after"] == later.isoformat()
    assert same.status_code == 422


async def test_a_shop_in_setup_has_no_date_to_move(client, register, admin):
    seller = await register(opened=False)
    store = (await client.get("/api/v1/seller/store", headers=bearer(seller))).json()

    refused = await client.put(
        f"{SHOPS}/{store['id']}/paid-until",
        headers=bearer(admin),
        json={"paid_until": clock.today().isoformat(), "reason": "longer trial"},
    )

    assert refused.status_code == 409
    assert refused.json()["error"]["code"] == "SHOP_IN_SETUP"


async def test_undo_takes_the_time_back_off_and_keeps_the_row(client, register, admin):
    shop = await open_shop(client, register)
    first = await client.post(
        f"{shop['url']}/payments", headers=bearer(admin), json={"period": "month"}
    )
    second = await client.post(
        f"{shop['url']}/payments", headers=bearer(admin), json={"period": "month"}
    )
    older, newest = second.json()["payments"][1], second.json()["payments"][0]

    refused = await client.post(
        f"{shop['url']}/payments/{older['id']}/undo",
        headers=bearer(admin),
        json={"reason": "wrong shop"},
    )
    undone = await client.post(
        f"{shop['url']}/payments/{newest['id']}/undo",
        headers=bearer(admin),
        json={"reason": "wrong shop"},
    )

    assert refused.status_code == 409
    assert refused.json()["error"]["code"] == "NOT_LATEST_PAYMENT"
    assert undone.status_code == 200, undone.text
    body = undone.json()
    assert body["paid_until"] == first.json()["paid_until"]
    assert body["payments"][0]["status"] == "void"
    assert body["payments"][0]["covers_until"] == newest["covers_until"]
    assert body["log"][0]["action"] == "undo_payment"
    assert body["log"][0]["details"]["after"] == first.json()["paid_until"]
    # The seller never paid it: not in their list.
    plan = (await client.get("/api/v1/seller/plan", headers=bearer(shop["seller"]))).json()
    assert [p["id"] for p in plan["payments"]] == [older["id"]]
    assert plan["paid_until"] == first.json()["paid_until"]


async def test_undoing_a_stopped_shops_payment_stops_it_again(client, register, admin):
    shop = await open_shop(client, register)
    stopped_on = clock.today() - timedelta(days=10)
    await set_paid_until(shop["store"]["id"], stopped_on)
    paid = await client.post(
        f"{shop['url']}/payments", headers=bearer(admin), json={"period": "month"}
    )
    payment = paid.json()["payments"][0]

    undone = await client.post(
        f"{shop['url']}/payments/{payment['id']}/undo",
        headers=bearer(admin),
        json={"reason": "marked the wrong shop"},
    )

    # Back to the day it had, not the day before this payment started.
    assert payment["covers_from"] == clock.today().isoformat()
    assert undone.json()["paid_until"] == stopped_on.isoformat()
    assert undone.json()["stage"] == "stopped"


async def test_payments_by_month_with_the_waiting_first_and_undone_left_out(
    client, register, admin
):
    paying = await open_shop(client, register)
    waiting = await open_shop(client, register)
    await client.post(
        f"{paying['url']}/payments",
        headers=bearer(admin),
        json={"period": "year", "amount": "99.00"},
    )
    undone = await client.post(
        f"{paying['url']}/payments", headers=bearer(admin), json={"period": "month"}
    )
    await client.post(
        f"{paying['url']}/payments/{undone.json()['payments'][0]['id']}/undo",
        headers=bearer(admin),
        json={"reason": "twice by mistake"},
    )
    await client.post(
        "/api/v1/seller/plan/paid", headers=bearer(waiting["seller"]), json={"period": "month"}
    )
    today = clock.today()

    month = await client.get(PAYMENTS, headers=bearer(admin))
    year = await client.get(f"{PAYMENTS}?year={today.year}", headers=bearer(admin))
    excel = await client.get(f"{PAYMENTS}/export", headers=bearer(admin))
    seller = await client.get(PAYMENTS, headers=bearer(paying["seller"]))

    assert month.status_code == 200, month.text
    body = month.json()
    assert (body["year"], body["month"]) == (today.year, today.month)
    ours = [p for p in body["payments"] if p["store_id"] == paying["store"]["id"]]
    assert sorted(p["status"] for p in ours) == ["paid", "void"]
    assert any(p["store_id"] == waiting["store"]["id"] for p in body["waiting"])
    # The undone month isn't money collected.
    assert float(body["collected"]) >= 99 and body["paid"] >= 1
    assert year.json()["month"] is None
    assert year.json()["collected"] == body["collected_year"]
    assert excel.status_code == 200
    assert excel.headers["content-type"].startswith("application/vnd.openxmlformats")
    assert excel.content[:2] == b"PK"
    assert seller.status_code == 401


async def test_a_reminder_now_reaches_the_owner_and_the_daily_ones_still_go(
    client, register, admin, sent, monkeypatch
):
    shop = await open_shop(client, register)
    base = clock.today()
    await set_paid_until(shop["store"]["id"], base - timedelta(days=2))  # unpaid, day 2

    now = await client.post(f"{shop['url']}/remind", headers=bearer(admin))
    await billing.run_daily()  # day 2: the start day's is still owed (it was missed)

    assert now.status_code == 200, now.text
    line = now.json()["log"][0]
    assert line["action"] == "remind" and line["details"]["sent"] is True
    chat = sent[0]["chat_id"]
    assert len([m for m in sent if m["chat_id"] == chat]) == 2
    assert "ដល់ពេលបង់ប្រាក់" in sent[0]["text"]


async def test_a_stopped_shop_is_told_its_orders_stopped(client, register, admin, sent):
    shop = await open_shop(client, register)
    await set_paid_until(shop["store"]["id"], clock.today() - timedelta(days=9))

    now = await client.post(f"{shop['url']}/remind", headers=bearer(admin))

    assert now.status_code == 200, now.text
    assert "មិនទទួលការកុម្ម៉ង់ថ្មីទេ" in sent[0]["text"]


async def test_no_reminder_without_telegram_or_anything_to_pay(client, register, admin, sent):
    paid_ahead = await open_shop(client, register)
    no_telegram = await open_shop(client, register)
    await client.delete("/api/v1/seller/store/telegram", headers=bearer(no_telegram["seller"]))
    await set_paid_until(no_telegram["store"]["id"], clock.today() - timedelta(days=1))

    ahead = await client.post(f"{paid_ahead['url']}/remind", headers=bearer(admin))
    off = await client.post(f"{no_telegram['url']}/remind", headers=bearer(admin))

    assert ahead.json()["error"]["code"] == "NOTHING_DUE"
    assert off.json()["error"]["code"] == "NO_TELEGRAM"
    assert sent == []


def test_a_month_or_a_year_has_its_own_days():
    assert [d.isoformat() for d in _period(2026, 2)] == ["2026-02-01", "2026-02-28"]
    assert [d.isoformat() for d in _period(2026, 12)] == ["2026-12-01", "2026-12-31"]
    assert [d.isoformat() for d in _period(2026, None)] == ["2026-01-01", "2026-12-31"]
