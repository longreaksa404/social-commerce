"""Payment reminders to customers (founder's pick 3, 2026-10-20): the
hourly run tells a customer who gets updates on Telegram that their KHQR
or bank order is waiting for payment, once, from 2 to 24 hours after
ordering, not at night, and never after "I've paid"."""

import random
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.session import tenant_session
from app.models import NotificationLog, Order, Store
from app.services import order_reminders, telegram
from tests.helpers import BANK, add_product, place_order, registered_seller, set_payments

ORDERS = "/api/v1/seller/orders"


@pytest.fixture
def bot(monkeypatch):
    """The bot set up, with every message it sends collected instead."""
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_token", "123:abc")
    monkeypatch.setattr(settings, "telegram_bot_username", "TestShopBot")
    monkeypatch.setattr(settings, "telegram_webhook_secret", "secret")
    monkeypatch.setattr(settings, "public_app_url", "https://app.example.com")
    sent: list[dict] = []

    async def fake_send(chat_id, text, button=None):
        sent.append({"chat_id": chat_id, "text": text, "button": button})

    monkeypatch.setattr(telegram, "send_message", fake_send)
    return sent


@pytest.fixture
def placed_at() -> datetime:
    """10:00 in Phnom Penh on a day of its own, far from the orders other
    tests place now, so each test's run sees only its own orders."""
    return datetime(2031, 1, 1, 3, tzinfo=UTC) + timedelta(days=random.randrange(20_000))


async def an_order(client, auth_headers, placed_at, *, method="bank_transfer", chat="777"):
    """A shop with one order placed at `placed_at` whose customer gets
    updates on Telegram (`chat`, or None): (headers, store_id, slug, order)."""
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await set_payments(client, headers, bank_transfer=BANK)
    cap = await add_product(store_id, "cap", stock=5)
    response = await place_order(
        client, slug, [(cap, None, 1)], total="10.00", payment_method=method
    )
    assert response.status_code == 201, response.text
    order_id = uuid.UUID(response.json()["id"])
    async with tenant_session(store_id) as db:
        await db.execute(update(Order).where(Order.id == order_id).values(created_at=placed_at))
        order = await db.get(Order, order_id)
        await db.refresh(order, ["customer"])
        order.customer.telegram_user_id = chat
        await db.commit()
    return headers, store_id, slug, str(order_id)


async def test_reminds_once_after_two_hours(client, bot, auth_headers, placed_at):
    _, store_id, slug, order_id = await an_order(client, auth_headers, placed_at)
    bot.clear()  # the seller's new-order alert

    early = await order_reminders.run(placed_at + timedelta(hours=1, minutes=59))
    assert (early.reminders, bot) == (0, [])

    due = await order_reminders.run(placed_at + timedelta(hours=2))
    assert due.reminders == 1
    [reminder] = bot
    assert reminder["chat_id"] == "777"
    assert "#1001" in reminder["text"] and "$10.00" in reminder["text"]
    assert "ខ្ញុំបានបង់ហើយ" in reminder["text"]  # I've paid
    assert reminder["button"] == (
        order_reminders.PAY,
        f"https://app.example.com/shop/{slug}/order/{order_id}",
    )
    async with tenant_session(store_id) as db:
        [log] = list(
            await db.scalars(
                select(NotificationLog).where(
                    NotificationLog.event_type == order_reminders.PAYMENT_REMINDER
                )
            )
        )
        assert log.payload["order_id"] == order_id

    # Not again.
    again = await order_reminders.run(placed_at + timedelta(hours=5))
    assert (again.reminders, len(bot)) == (0, 1)


async def test_no_reminder_after_24_hours_or_at_night(client, bot, auth_headers, placed_at):
    await an_order(client, auth_headers, placed_at)
    bot.clear()
    late = await order_reminders.run(placed_at + timedelta(hours=24))
    # 10:00 + 13 h = 23:00 in Phnom Penh: quiet until 7:00.
    night = await order_reminders.run(placed_at + timedelta(hours=13))
    assert (late.reminders, night.reminders, bot) == (0, 0, [])
    assert order_reminders.quiet(datetime(2031, 1, 1, 23, 59, tzinfo=UTC))  # 6:59 in Phnom Penh
    assert not order_reminders.quiet(datetime(2031, 1, 1, 0, tzinfo=UTC))  # 7:00


async def test_no_reminder_for_cash_off_telegram_or_said_paid(client, bot, auth_headers, placed_at):
    await an_order(client, auth_headers, placed_at, method="cod")
    await an_order(client, auth_headers, placed_at, chat=None)
    _, _, slug, said = await an_order(client, auth_headers, placed_at)
    claimed = await client.post(
        f"/api/v1/shop/{slug}/orders/{said}/paid", json={"phone": "012345678"}
    )
    assert claimed.status_code == 204
    bot.clear()

    summary = await order_reminders.run(placed_at + timedelta(hours=3))
    assert (summary.reminders, bot) == (0, [])


async def test_no_reminder_once_paid_or_cancelled(client, bot, auth_headers, placed_at):
    paid_headers, _, _, paid = await an_order(client, auth_headers, placed_at)
    off_headers, _, _, off = await an_order(client, auth_headers, placed_at)
    await client.patch(f"{ORDERS}/{paid}/payment", headers=paid_headers, json={"status": "paid"})
    await client.patch(f"{ORDERS}/{off}/status", headers=off_headers, json={"status": "rejected"})
    bot.clear()

    summary = await order_reminders.run(placed_at + timedelta(hours=3))
    assert (summary.reminders, bot) == (0, [])


async def test_each_shops_reminder_names_that_shop(client, bot, auth_headers, placed_at):
    """One run, two shops: each customer hears about their own order from
    their own shop (the run crosses shops; each send is scoped to one)."""
    _, store_a, _, _ = await an_order(client, auth_headers, placed_at, chat="101")
    _, store_b, _, _ = await an_order(client, auth_headers, placed_at, chat="202")
    bot.clear()
    names = {}
    for store_id in (store_a, store_b):
        async with tenant_session(store_id) as db:
            names[store_id] = (await db.get(Store, store_id)).name

    summary = await order_reminders.run(placed_at + timedelta(hours=3))

    assert summary.reminders == 2
    by_chat = {m["chat_id"]: m["text"] for m in bot}
    assert names[store_a] in by_chat["101"] and names[store_b] not in by_chat["101"]
    assert names[store_b] in by_chat["202"]


async def test_run_needs_the_cron_secret(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "billing_cron_secret", "cron-secret")
    missing = await client.post("/api/v1/reminders/run")
    wrong = await client.post("/api/v1/reminders/run", headers={"X-Cron-Secret": "nope"})
    right = await client.post("/api/v1/reminders/run", headers={"X-Cron-Secret": "cron-secret"})
    assert (missing.status_code, wrong.status_code, right.status_code) == (404, 404, 202)
