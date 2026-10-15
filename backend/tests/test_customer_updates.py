"""Telegram updates for customers (founder's pick 2026-10-15): the order
page's link, the bot's /start and share button, the seller seeing the
proved number, and the messages a customer gets after the seller's taps."""

import random
import uuid
from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import tenant_session
from app.models import Customer, DeliveryMethod, DeliveryStatus, OrderStatus, PaymentMethod
from app.models import PaymentStatus as P
from app.services import customer_updates, telegram
from tests.helpers import BANK, add_product, place_order, registered_seller, set_payments, track

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
def dara() -> int:
    """The customer's Telegram account id (= its private chat's id), new
    for each test: checks a test leaves open stay in the database."""
    return random.randrange(10**9, 10**10)


def message(user_id: int, **fields) -> dict:
    chat = {"id": user_id, "type": "private"}
    return {"update_id": 1, "message": {"chat": chat, "from": {"id": user_id}, **fields}}


def contact(user_id: int, phone: str) -> dict:
    return message(user_id, contact={"phone_number": phone, "user_id": user_id})


async def an_order(client, auth_headers, *, payment_method="cod", phone="012 345 678"):
    """A seller's shop with one order: (headers, store_id, slug, order id)."""
    headers, store_id, slug = await registered_seller(client, auth_headers)
    if payment_method == "bank_transfer":
        await set_payments(client, headers, bank_transfer=BANK)
    cap = await add_product(store_id, "cap", stock=20)
    placed = await place_order(
        client, slug, [(cap, None, 1)], total="10.00", payment_method=payment_method, phone=phone
    )
    assert placed.status_code == 201, placed.text
    return headers, store_id, slug, placed.json()["id"]


async def get_updates(client, slug, order_id, user_id, shared="85512345678"):
    """The customer taps the button, opens the bot and shares their number."""
    response = await client.post(
        f"/api/v1/shop/{slug}/orders/{order_id}/telegram", json={"phone": "012 345 678"}
    )
    assert response.status_code == 200, response.text
    code = response.json()["telegram_url"].split("?start=")[1]
    asked = await telegram.handle_update(message(user_id, text=f"/start {code}"))
    assert asked["reply_markup"]["keyboard"][0][0]["request_contact"] is True
    return asked, await telegram.handle_update(contact(user_id, shared))


async def seller_customer(client, headers, order_id) -> dict:
    return (await client.get(f"{ORDERS}/{order_id}", headers=headers)).json()["customer"]


def test_code_round_trip_fits_telegram_and_isnt_a_stores():
    store_id, order_id = uuid.uuid4(), uuid.uuid4()
    code, _ = customer_updates.make_code(store_id, order_id, now=1_000_000)
    assert len(code) <= 64
    assert all(c.isalnum() or c in "_-" for c in code)
    assert customer_updates.read_code(code, now=1_000_060) == (store_id, order_id)
    # Not taken for a store's "Connect Telegram" code, nor that for this.
    assert telegram.read_link_code(code) is None
    store_code, _ = telegram.make_link_code(store_id)
    assert customer_updates.read_code(store_code) is None


def test_code_expires_and_cant_be_forged():
    store_id, order_id = uuid.uuid4(), uuid.uuid4()
    code, _ = customer_updates.make_code(store_id, order_id, now=1_000_000)
    later = 1_000_000 + customer_updates.LINK_TTL_SECONDS + 1
    assert customer_updates.read_code(code, now=later) is None
    assert customer_updates.read_code(code, now=later, check_expiry=False) == (store_id, order_id)
    # Another order's id with this signature.
    other, _ = customer_updates.make_code(store_id, uuid.uuid4(), now=1_000_000)
    assert customer_updates.read_code(code[:30] + other[30:], now=1_000_060) is None
    assert customer_updates.read_code("o" + "A" * 59) is None


async def test_link_needs_the_bot_and_the_orders_phone(client, auth_headers, monkeypatch):
    _, _, slug, order_id = await an_order(client, auth_headers)
    url = f"/api/v1/shop/{slug}/orders/{order_id}/telegram"
    monkeypatch.setattr(get_settings(), "telegram_bot_token", "")
    assert (await client.post(url, json={"phone": "012345678"})).status_code == 503
    assert (await track(client, slug, order_id)).json()["telegram_updates"] == "unavailable"


async def test_link_is_refused_for_a_wrong_phone_or_another_shop(client, bot, auth_headers):
    _, _, slug, order_id = await an_order(client, auth_headers)
    _, _, other_slug, _ = await an_order(client, auth_headers)
    wrong = await client.post(
        f"/api/v1/shop/{slug}/orders/{order_id}/telegram", json={"phone": "012 999 999"}
    )
    assert wrong.status_code == 404
    elsewhere = await client.post(
        f"/api/v1/shop/{other_slug}/orders/{order_id}/telegram", json={"phone": "012345678"}
    )
    assert elsewhere.status_code == 404


async def test_sharing_the_orders_number_confirms_it(client, bot, auth_headers, dara):
    headers, _, slug, order_id = await an_order(client, auth_headers)
    assert (await track(client, slug, order_id)).json()["telegram_updates"] == "off"

    asked, done = await get_updates(client, slug, order_id, dara)
    # The customer is told the shop will see the number.
    assert "នឹងឃើញលេខនេះ" in asked["text"]
    assert "✅" in done["text"] and "#1001" in done["text"]
    assert done["reply_markup"] == {"remove_keyboard": True}

    assert (await track(client, slug, order_id)).json()["telegram_updates"] == "on"
    customer = await seller_customer(client, headers, order_id)
    assert customer["telegram_phone"] == customer["phone"] == "012345678"


async def test_another_number_still_gets_updates_and_shows_to_the_seller(
    client, bot, auth_headers, dara
):
    headers, _, slug, order_id = await an_order(client, auth_headers)
    await get_updates(client, slug, order_id, dara, shared="855971234567")
    assert (await track(client, slug, order_id)).json()["telegram_updates"] == "on"
    customer = await seller_customer(client, headers, order_id)
    assert (customer["phone"], customer["telegram_phone"]) == ("012345678", "0971234567")


async def test_expired_or_forged_start_code_explains(client, bot, dara):
    code, _ = customer_updates.make_code(uuid.uuid4(), uuid.uuid4(), now=1_000_000)
    reply = await telegram.handle_update(message(dara, text=f"/start {code}"))
    assert reply["text"] == customer_updates.EXPIRED_TEXT
    # A live code for an order that doesn't exist.
    code, _ = customer_updates.make_code(uuid.uuid4(), uuid.uuid4())
    reply = await telegram.handle_update(message(dara, text=f"/start {code}"))
    assert reply["text"] == customer_updates.EXPIRED_TEXT


async def test_only_that_shops_customer_is_linked(client, bot, auth_headers, dara):
    """The same phone ordered from two shops: the link of one order
    touches only that shop's customer (tenant isolation)."""
    _, store_a, slug_a, order_a = await an_order(client, auth_headers)
    _, store_b, _, _ = await an_order(client, auth_headers)
    await get_updates(client, slug_a, order_a, dara)
    for store_id, linked in ((store_a, str(dara)), (store_b, None)):
        async with tenant_session(store_id) as db:
            customer = await db.scalar(select(Customer).where(Customer.store_id == store_id))
            assert customer.telegram_user_id == linked


async def test_the_sellers_taps_send_news(client, bot, auth_headers, dara):
    headers, _, slug, order_id = await an_order(client, auth_headers)
    await get_updates(client, slug, order_id, dara)
    bot.clear()

    accepted = await client.patch(
        f"{ORDERS}/{order_id}/status", headers=headers, json={"status": "accepted"}
    )
    assert accepted.status_code == 200
    [news] = bot
    assert news["chat_id"] == str(dara)
    assert "#1001" in news["text"] and "អ្នកលក់បានបញ្ជាក់" in news["text"]  # Confirmed
    assert news["button"] == (
        "មើលការកុម្ម៉ង់",  # View order
        f"https://app.example.com/shop/{slug}/order/{order_id}",
    )

    # Cash on delivery, handed over: the delivery is news, the cash isn't.
    bot.clear()
    handed = await client.post(f"{ORDERS}/{order_id}/cash-handover", headers=headers)
    assert handed.status_code == 200, handed.text
    assert [m["text"].splitlines()[-1] for m in bot] == ["🎉 បានដល់ដៃ"]  # Delivered

    # Completing after that says nothing new.
    bot.clear()
    done = await client.patch(
        f"{ORDERS}/{order_id}/status", headers=headers, json={"status": "completed"}
    )
    assert done.status_code == 200, done.text
    assert bot == []


async def test_a_recorded_transfer_tells_the_customer(client, bot, auth_headers, dara):
    headers, _, slug, order_id = await an_order(
        client, auth_headers, payment_method="bank_transfer"
    )
    await get_updates(client, slug, order_id, dara)
    bot.clear()
    paid = await client.patch(
        f"{ORDERS}/{order_id}/payment", headers=headers, json={"status": "paid", "reference": None}
    )
    assert paid.status_code == 200, paid.text
    assert [m["text"].splitlines()[-1] for m in bot] == [customer_updates.PAYMENT_RECEIVED]


async def test_no_news_without_updates_on(client, bot, auth_headers):
    headers, _, _, order_id = await an_order(client, auth_headers)
    bot.clear()  # the seller's new-order alert
    await client.patch(f"{ORDERS}/{order_id}/status", headers=headers, json={"status": "accepted"})
    assert bot == []


async def test_blocked_bot_stops_the_updates(client, bot, auth_headers, dara, monkeypatch):
    headers, _, slug, order_id = await an_order(client, auth_headers)
    await get_updates(client, slug, order_id, dara)

    async def blocked(chat_id, text, button=None):
        raise telegram.TelegramError(403, "Forbidden: bot was blocked by the user")

    monkeypatch.setattr(telegram, "send_message", blocked)
    accepted = await client.patch(
        f"{ORDERS}/{order_id}/status", headers=headers, json={"status": "accepted"}
    )
    # The seller's tap goes through whatever Telegram says.
    assert accepted.status_code == 200
    assert (await track(client, slug, order_id)).json()["telegram_updates"] == "off"
    # The proved number stays for the seller.
    assert (await seller_customer(client, headers, order_id))["telegram_phone"] == "012345678"


def fake_order(status, delivery, *, pickup=False, method=PaymentMethod.COD):
    return SimpleNamespace(
        status=status,
        delivery_method=DeliveryMethod.PICKUP if pickup else DeliveryMethod.SELLER_DELIVERY,
        delivery=SimpleNamespace(status=delivery),
        payment=SimpleNamespace(method=method),
    )


@pytest.mark.parametrize(
    ("order", "event", "said"),
    [
        # "On the way" once, whichever the seller records first.
        (fake_order(OrderStatus.SHIPPED, DeliveryStatus.IN_TRANSIT), OrderStatus.SHIPPED, None),
        (
            fake_order(OrderStatus.ACCEPTED, DeliveryStatus.IN_TRANSIT),
            DeliveryStatus.IN_TRANSIT,
            "🚚 កំពុងដឹកមករកអ្នក",
        ),
        (
            fake_order(OrderStatus.SHIPPED, DeliveryStatus.IN_TRANSIT),
            DeliveryStatus.IN_TRANSIT,
            None,
        ),
        (fake_order(OrderStatus.DELIVERED, DeliveryStatus.DELIVERED), OrderStatus.DELIVERED, None),
        # Pickup in the order page's pickup words.
        (
            fake_order(OrderStatus.READY, DeliveryStatus.NOT_ASSIGNED, pickup=True),
            OrderStatus.READY,
            "🏪 រួចរាល់ សូមមកយក",
        ),
        (
            fake_order(OrderStatus.ACCEPTED, DeliveryStatus.FAILED),
            DeliveryStatus.FAILED,
            customer_updates.DELIVERY_FAILED,
        ),
        # The seller's own steps that tell the customer nothing.
        (
            fake_order(OrderStatus.PROCESSING, DeliveryStatus.NOT_ASSIGNED),
            OrderStatus.PROCESSING,
            None,
        ),
        (fake_order(OrderStatus.ACCEPTED, DeliveryStatus.ASSIGNED), DeliveryStatus.ASSIGNED, None),
        (fake_order(OrderStatus.ACCEPTED, DeliveryStatus.DELIVERED), P.PAID, None),  # cash
        (
            fake_order(
                OrderStatus.ACCEPTED, DeliveryStatus.NOT_ASSIGNED, method=PaymentMethod.KHQR
            ),
            P.PAID,
            customer_updates.PAYMENT_RECEIVED,
        ),
        (
            fake_order(
                OrderStatus.ACCEPTED, DeliveryStatus.NOT_ASSIGNED, method=PaymentMethod.KHQR
            ),
            P.PENDING,
            None,
        ),
    ],
)
def test_news_says_each_thing_once(order, event, said):
    assert customer_updates.news(order, event) == said
