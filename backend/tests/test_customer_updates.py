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


class Sent(list):
    """The messages the bot sent; `calls`: its other Bot API calls."""

    def __init__(self):
        super().__init__()
        self.calls: list[tuple[str, dict]] = []


@pytest.fixture
def bot(monkeypatch):
    """The bot set up, with every message it sends collected instead."""
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_token", "123:abc")
    monkeypatch.setattr(settings, "telegram_bot_username", "TestShopBot")
    monkeypatch.setattr(settings, "telegram_webhook_secret", "secret")
    monkeypatch.setattr(settings, "public_app_url", "https://app.example.com")
    sent = Sent()

    async def fake_send(chat_id, text, button=None):
        sent.append({"chat_id": chat_id, "text": text, "button": button})

    async def fake_call(method, payload):
        sent.calls.append((method, payload))
        return {}

    monkeypatch.setattr(telegram, "send_message", fake_send)
    monkeypatch.setattr(telegram, "call", fake_call)
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


def fake_order(
    status, delivery, *, pickup=False, method=PaymentMethod.COD, courier=None, note=None
):
    return SimpleNamespace(
        status=status,
        delivery_method=DeliveryMethod.PICKUP if pickup else DeliveryMethod.SELLER_DELIVERY,
        delivery=SimpleNamespace(status=delivery, courier=courier, assignee_note=note),
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
        # Sent (2026-10-20): the driver's note (their name, phone) stays the
        # seller's; a courier's tracking number goes to the customer.
        (
            fake_order(OrderStatus.ACCEPTED, DeliveryStatus.ASSIGNED, note="Dara 012 999 888"),
            DeliveryStatus.ASSIGNED,
            customer_updates.SENT_DRIVER,
        ),
        (
            fake_order(
                OrderStatus.ACCEPTED, DeliveryStatus.ASSIGNED, courier="J&T Express", note="JT123"
            ),
            DeliveryStatus.ASSIGNED,
            "📦 បានផ្ញើតាម J&amp;T Express\nលេខតាមដាន៖ JT123",
        ),
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


# "Message on Telegram" (founder's pick 2026-10-20)


async def test_seller_messages_a_customer_on_telegram(client, bot, auth_headers, dara):
    headers, _, slug, order_id = await an_order(client, auth_headers)
    url = f"{ORDERS}/{order_id}/telegram-message"
    # Not before they get updates there.
    assert (await seller_customer(client, headers, order_id))["on_telegram"] is False
    refused = await client.post(url, headers=headers, json={"text": "Hello"})
    assert refused.status_code == 409
    assert refused.json()["error"]["code"] == "NOT_ON_TELEGRAM"

    await get_updates(client, slug, order_id, dara)
    assert (await seller_customer(client, headers, order_id))["on_telegram"] is True
    await client.patch(
        "/api/v1/seller/store", headers=headers, json={"telegram_username": "srey_mom"}
    )
    bot.clear()
    sent = await client.post(url, headers=headers, json={"text": "  Driver is <near>  "})

    assert sent.status_code == 204, sent.text
    [message] = bot
    assert message["chat_id"] == str(dara)
    assert "#1001" in message["text"]
    assert message["text"].endswith("💬 Driver is &lt;near&gt;")
    reply, view = message["button"]
    assert reply["url"].startswith("https://t.me/srey_mom?text=")
    assert view["url"] == f"https://app.example.com/shop/{slug}/order/{order_id}"


async def test_message_without_the_shops_telegram_gives_its_phone(client, bot, auth_headers, dara):
    headers, _, slug, order_id = await an_order(client, auth_headers)
    await get_updates(client, slug, order_id, dara)
    await client.patch(
        "/api/v1/seller/store", headers=headers, json={"contact_phone": "012 999 888"}
    )
    bot.clear()
    sent = await client.post(
        f"{ORDERS}/{order_id}/telegram-message", headers=headers, json={"text": "Hi"}
    )
    assert sent.status_code == 204, sent.text
    [message] = bot
    assert message["text"].endswith("\n📞 012999888")
    assert [b["text"] for b in message["button"]] == ["មើលការកុម្ម៉ង់"]  # View order only


async def test_message_is_refused_for_another_shops_order_or_no_text(
    client, bot, auth_headers, dara
):
    """A seller can't message another shop's customer (tenant isolation)."""
    _, _, slug, order_id = await an_order(client, auth_headers)
    await get_updates(client, slug, order_id, dara)
    other_headers, _, _, _ = await an_order(client, auth_headers)
    bot.clear()
    url = f"{ORDERS}/{order_id}/telegram-message"
    elsewhere = await client.post(url, headers=other_headers, json={"text": "Hi"})
    assert elsewhere.status_code == 404
    blank = await client.post(url, headers=other_headers, json={"text": "   "})
    assert blank.status_code == 422
    assert bot == []


async def test_message_to_a_blocked_bot_says_so_and_stops(
    client, bot, auth_headers, dara, monkeypatch
):
    headers, _, slug, order_id = await an_order(client, auth_headers)
    await get_updates(client, slug, order_id, dara)

    async def blocked(chat_id, text, button=None):
        raise telegram.TelegramError(403, "Forbidden: bot was blocked by the user")

    monkeypatch.setattr(telegram, "send_message", blocked)
    sent = await client.post(
        f"{ORDERS}/{order_id}/telegram-message", headers=headers, json={"text": "Hi"}
    )
    assert sent.status_code == 409
    assert (await seller_customer(client, headers, order_id))["on_telegram"] is False


async def test_a_customer_typing_to_the_bot_is_told_to_use_the_button(
    client, bot, auth_headers, dara
):
    _, _, slug, order_id = await an_order(client, auth_headers)
    stranger = await telegram.handle_update(message(dara, text="Hello?"))
    assert stranger["text"] == telegram.HELP_TEXT  # the seller's help
    await get_updates(client, slug, order_id, dara)
    reply = await telegram.handle_update(message(dara, text="Thanks, it's 097 123 456"))
    assert reply["text"] == customer_updates.HELP_TEXT


# The receipt and "Sent" (founder, 2026-10-20)


async def test_a_customer_who_gets_updates_gets_a_receipt(client, bot, auth_headers, dara):
    headers, store_id, slug, first = await an_order(client, auth_headers)
    await set_payments(client, headers, bank_transfer=BANK)
    await get_updates(client, slug, first, dara)
    cap = await add_product(store_id, "hat", stock=5)
    bot.clear()

    placed = await place_order(
        client, slug, [(cap, None, 2)], total="20.00", payment_method="bank_transfer"
    )
    assert placed.status_code == 201, placed.text
    [receipt] = [m for m in bot if m["chat_id"] == str(dara)]
    assert "#1002" in receipt["text"] and "2 × Hat" in receipt["text"]
    assert "$20.00" in receipt["text"] and customer_updates.PAY_NOW in receipt["text"]
    assert receipt["button"] == (
        customer_updates.PAY,
        f"https://app.example.com/shop/{slug}/order/{placed.json()['id']}",
    )

    # Cash on delivery: how it's paid, and View order.
    bot.clear()
    await place_order(client, slug, [(cap, None, 1)], total="10.00")
    [cash] = [m for m in bot if m["chat_id"] == str(dara)]
    assert customer_updates.PAY_CASH in cash["text"]
    assert cash["button"][0] == customer_updates.VIEW_ORDER


async def test_no_receipt_without_updates(client, bot, auth_headers):
    _, store_id, slug, _ = await an_order(client, auth_headers)
    bot.clear()
    cap = await add_product(store_id, "hat", stock=5)
    await place_order(client, slug, [(cap, None, 1)], total="10.00", phone="097 123 4567")
    # Only the seller's new-order alert, to the shop's chat.
    assert all("ការកុម្ម៉ង់ថ្មី" in m["text"] for m in bot)


async def test_sending_it_tells_the_customer_without_the_drivers_note(
    client, bot, auth_headers, dara
):
    headers, _, slug, order_id = await an_order(client, auth_headers)
    await get_updates(client, slug, order_id, dara)
    await client.patch(f"{ORDERS}/{order_id}/status", headers=headers, json={"status": "accepted"})
    bot.clear()

    sent = await client.patch(
        f"{ORDERS}/{order_id}/delivery",
        headers=headers,
        json={"status": "assigned", "assignee_note": "Dara 012 999 888"},
    )
    assert sent.status_code == 200, sent.text
    [news] = bot
    assert news["text"].endswith(customer_updates.SENT_DRIVER)
    assert "012 999 888" not in news["text"]


async def test_get_updates_points_the_shop_button_at_that_shop(client, bot, auth_headers, dara):
    """The button beside the message box (like a shop bot's "Go Shopping")
    opens the shop the customer asked updates from (founder, 2026-10-20)."""
    _, _, slug, order_id = await an_order(client, auth_headers)
    await get_updates(client, slug, order_id, dara)
    [(method, payload)] = [c for c in bot.calls if c[0] == "setChatMenuButton"]
    assert payload["chat_id"] == dara
    assert payload["menu_button"]["web_app"]["url"] == f"https://app.example.com/shop/{slug}"
    assert payload["menu_button"]["text"].startswith("🛍 ")
