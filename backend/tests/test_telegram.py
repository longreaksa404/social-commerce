"""Telegram (Phase 6): connecting a store's chat with a signed link, the
webhook, order alerts, and the seller's username for "Ask seller"."""

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import tenant_session, unscoped_session
from app.models import (
    Currency,
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
    Order,
    Store,
)
from app.services import notifications, telegram
from tests.helpers import (
    BANK,
    add_product,
    place_order,
    registered_seller,
    set_payments,
    track,
    variant_ids,
)

SECRET = "test-webhook-secret"
WEBHOOK = "/api/v1/telegram/webhook"


@pytest.fixture
def bot(monkeypatch):
    """The bot set up, with every message it sends collected instead."""
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_token", "123:abc")
    monkeypatch.setattr(settings, "telegram_bot_username", "TestShopBot")
    monkeypatch.setattr(settings, "telegram_webhook_secret", SECRET)
    monkeypatch.setattr(settings, "public_app_url", "https://app.example.com")
    sent: list[dict] = []

    async def fake_send(chat_id, text, button=None):
        sent.append({"chat_id": chat_id, "text": text, "button": button})

    monkeypatch.setattr(telegram, "send_message", fake_send)
    return sent


def start(chat_id: int, text: str, chat_type: str = "private") -> dict:
    return {
        "update_id": 1,
        "message": {"message_id": 1, "chat": {"id": chat_id, "type": chat_type}, "text": text},
    }


async def chat_id_of(store_id) -> str | None:
    async with unscoped_session() as db:
        return (await db.get(Store, store_id)).telegram_chat_id


async def connect(store_id, chat_id: int = 555) -> None:
    async with tenant_session(store_id) as db:
        (await db.get(Store, store_id)).telegram_chat_id = str(chat_id)
        await db.commit()


async def logs(store_id) -> list[NotificationLog]:
    """The store's Telegram alerts (not its dashboard notifications)."""
    async with tenant_session(store_id) as db:
        return list(
            await db.scalars(
                select(NotificationLog)
                .where(
                    NotificationLog.store_id == store_id,
                    NotificationLog.channel == NotificationChannel.TELEGRAM,
                )
                .order_by(NotificationLog.sent_at)
            )
        )


# Link codes


def test_link_code_round_trip_and_fits_telegram():
    store_id = uuid.uuid4()
    code, _ = telegram.make_link_code(store_id, now=1_000_000)
    assert len(code) <= 64
    assert all(c.isalnum() or c in "_-" for c in code)
    assert telegram.read_link_code(code, now=1_000_000 + 60) == store_id


def test_link_code_expires():
    code, _ = telegram.make_link_code(uuid.uuid4(), now=1_000_000)
    expired_at = 1_000_000 + telegram.LINK_TTL_SECONDS + 1
    assert telegram.read_link_code(code, now=expired_at) is None


@pytest.mark.parametrize("code", ["", "abc", "not a code!", "A" * 43])
def test_link_code_rejects_garbage(code):
    assert telegram.read_link_code(code) is None


def test_link_code_rejects_another_store_swapped_in():
    code, _ = telegram.make_link_code(uuid.uuid4())
    other, _ = telegram.make_link_code(uuid.uuid4())
    # Store id and expiry from one code, signature from another.
    assert telegram.read_link_code(other[:26] + code[26:]) is None


# Webhook


async def test_webhook_is_hidden_without_the_secret(client, bot):
    assert (await client.post(WEBHOOK, json=start(1, "/start"))).status_code == 404
    wrong = {"X-Telegram-Bot-Api-Secret-Token": "nope"}
    assert (await client.post(WEBHOOK, json=start(1, "/start"), headers=wrong)).status_code == 404


async def test_webhook_is_off_until_the_bot_is_set_up(client):
    headers = {"X-Telegram-Bot-Api-Secret-Token": ""}
    assert (await client.post(WEBHOOK, json=start(1, "/start"), headers=headers)).status_code == 404


async def test_start_with_code_connects_only_that_store(client, bot, two_stores):
    mine, other = two_stores
    code, _ = telegram.make_link_code(mine.store_id)
    response = await client.post(
        WEBHOOK,
        json=start(777, f"/start {code}"),
        headers={"X-Telegram-Bot-Api-Secret-Token": SECRET},
    )
    assert response.status_code == 200
    reply = response.json()
    assert reply["method"] == "sendMessage"
    assert reply["chat_id"] == 777
    assert "✅ បានភ្ជាប់ជាមួយ" in reply["text"]  # Connected to (the bot speaks Khmer)
    assert await chat_id_of(mine.store_id) == "777"
    assert await chat_id_of(other.store_id) is None


async def test_start_with_bad_code_or_none_explains(client, bot, make_store):
    store = await make_store()
    headers = {"X-Telegram-Bot-Api-Secret-Token": SECRET}
    bad = (await client.post(WEBHOOK, json=start(1, "/start xyz"), headers=headers)).json()
    assert bad["text"] == telegram.EXPIRED_TEXT
    plain = (await client.post(WEBHOOK, json=start(1, "hello"), headers=headers)).json()
    assert plain["text"] == telegram.HELP_TEXT
    # Both say where to connect: Settings → Alerts, in the app's Khmer.
    assert all("ការកំណត់ → ការជូនដំណឹង" in t for t in (bad["text"], plain["text"]))
    assert await chat_id_of(store.store_id) is None


async def test_bot_stays_quiet_in_groups(client, bot, make_store):
    store = await make_store()
    code, _ = telegram.make_link_code(store.store_id)
    response = await client.post(
        WEBHOOK,
        json=start(-100, f"/start {code}", chat_type="group"),
        headers={"X-Telegram-Bot-Api-Secret-Token": SECRET},
    )
    assert response.json() == {}
    assert await chat_id_of(store.store_id) is None


# Settings


async def test_connect_link_needs_the_bot(client, auth_headers):
    headers = await auth_headers()
    response = await client.post("/api/v1/seller/store/telegram/link", headers=headers)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "TELEGRAM_NOT_CONFIGURED"
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    assert store["telegram_bot_available"] is False
    assert store["telegram_connected"] is False


async def test_connect_link_is_for_the_sellers_own_store(client, bot, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    body = (await client.post("/api/v1/seller/store/telegram/link", headers=headers)).json()
    prefix = "https://t.me/TestShopBot?start="
    assert body["url"].startswith(prefix)
    assert telegram.read_link_code(body["url"].removeprefix(prefix)) == store_id


async def test_disconnect_clears_only_own_chat(client, bot, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    _, other_id, _ = await registered_seller(client, auth_headers)
    await connect(store_id)
    await connect(other_id)
    assert (await client.get("/api/v1/seller/store", headers=headers)).json()[
        "telegram_connected"
    ] is True
    response = await client.delete("/api/v1/seller/store/telegram", headers=headers)
    assert response.status_code == 200
    assert response.json()["telegram_connected"] is False
    assert await chat_id_of(store_id) is None
    assert await chat_id_of(other_id) == "555"


@pytest.mark.parametrize(
    ("typed", "saved"),
    [
        ("@reaksa_shop", "reaksa_shop"),
        ("reaksa_shop", "reaksa_shop"),
        (" https://t.me/reaksa_shop/ ", "reaksa_shop"),
        ("t.me/Reaksa_Shop", "Reaksa_Shop"),
        ("", None),
        (None, None),
    ],
)
async def test_telegram_username_is_saved_plain_and_public(client, auth_headers, typed, saved):
    headers, _, slug = await registered_seller(client, auth_headers)
    response = await client.patch(
        "/api/v1/seller/store", headers=headers, json={"telegram_username": typed}
    )
    assert response.status_code == 200, response.text
    assert response.json()["telegram_username"] == saved
    shop = (await client.get(f"/api/v1/shop/{slug}")).json()
    assert shop["telegram_username"] == saved


@pytest.mark.parametrize("typed", ["abc", "1shop", "shop name", "shop-name", "a" * 33])
async def test_bad_telegram_username_is_refused(client, auth_headers, typed):
    headers = await auth_headers()
    response = await client.patch(
        "/api/v1/seller/store", headers=headers, json={"telegram_username": typed}
    )
    assert response.status_code == 422
    assert response.json()["error"]["field"] == "telegram_username"


# Alerts


@pytest.mark.parametrize(
    ("before", "after", "left"),
    [
        (10, 6, None),  # still plenty
        (6, 5, 5),  # reaches the line
        (9, 2, 2),  # jumps past it
        (5, 4, None),  # already low: no second alert
        (3, 0, 0),  # sells out
        (8, 0, 0),  # straight to sold out: one alert
    ],
)
def test_stock_alert_on_crossing_only(before, after, left):
    alert = notifications.stock_alert(uuid.uuid4(), "Cap", before, after)
    assert (alert.left if alert else None) == left


def test_money_in_alerts():
    assert notifications.format_money(Decimal("1234.5"), Currency.USD) == "$1,234.50"
    assert notifications.format_money(Decimal("50000"), Currency.KHR) == "50,000៛"


async def test_new_order_alert(client, bot, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await connect(store_id, chat_id=42)
    cap = await add_product(store_id, "cap", stock=20)
    placed = await place_order(
        client, slug, [(cap, None, 2)], total="20.00", name="Dara <VIP>", payment_method="cod"
    )
    assert placed.status_code == 201, placed.text
    order_id = placed.json()["id"]

    assert len(bot) == 1
    message = bot[0]
    assert message["chat_id"] == "42"
    # In Khmer, the app's default language.
    assert "ការកុម្ម៉ង់ថ្មី #1001" in message["text"]  # New order
    assert "2 × Cap: $20.00" in message["text"]
    assert "សរុប: $20.00" in message["text"]  # Total
    assert "ថ្លៃដឹក: ឥតគិតថ្លៃ" in message["text"]  # Delivery: free
    assert "បង់ប្រាក់ពេលទទួលទំនិញ" in message["text"]  # Cash on delivery
    assert "ដឹកដោយខ្លួនឯង" in message["text"]  # Your own delivery
    assert "Dara &lt;VIP&gt;, 012345678" in message["text"]  # escaped
    assert message["button"] == (
        "បើកការកុម្ម៉ង់",  # Open order
        f"https://app.example.com/dashboard/orders/{order_id}",
    )
    [log] = await logs(store_id)
    assert (log.event_type, log.status) == ("new_order", NotificationStatus.SENT)
    assert log.payload["order_number"] == 1001


async def test_no_alert_without_a_connected_chat(client, bot, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    assert (await place_order(client, slug, [(cap, None, 1)], total="10.00")).status_code == 201
    assert bot == []
    assert await logs(store_id) == []


async def test_low_stock_alert_names_the_variant(client, bot, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await connect(store_id)
    shirt = await add_product(store_id, "shirt", variants=[("XL", None, 6), ("S", None, 1)])
    ids = await variant_ids(shirt)
    placed = await place_order(
        client, slug, [(shirt, ids["XL"], 1), (shirt, ids["S"], 1)], total="20.00"
    )
    assert placed.status_code == 201, placed.text
    assert len(bot) == 2
    assert "ជិតអស់ស្តុក" in bot[1]["text"]  # Running low
    assert "Shirt (S): អស់ស្តុក" in bot[1]["text"]  # sold out
    assert "Shirt (XL): នៅសល់តែ 5 ទៀត" in bot[1]["text"]  # only 5 left
    assert [log.event_type for log in await logs(store_id)] == ["new_order", "low_stock"]


async def test_blocked_bot_disconnects_and_logs_failure(client, bot, auth_headers, monkeypatch):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await connect(store_id)
    cap = await add_product(store_id, "cap", stock=3)

    async def blocked(chat_id, text, button=None):
        raise telegram.TelegramError(403, "Forbidden: bot was blocked by the user")

    monkeypatch.setattr(telegram, "send_message", blocked)
    placed = await place_order(client, slug, [(cap, None, 1)], total="10.00")
    # The order is placed whatever Telegram says.
    assert placed.status_code == 201
    assert await chat_id_of(store_id) is None
    [log] = await logs(store_id)  # stopped: no low-stock message tried
    assert log.status is NotificationStatus.FAILED
    async with unscoped_session() as db:
        assert await db.get(Order, uuid.UUID(placed.json()["id"])) is not None


async def test_alert_logs_are_tenant_isolated(client, bot, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    _, other_id, _ = await registered_seller(client, auth_headers)
    await connect(store_id)
    cap = await add_product(store_id, "cap", stock=20)
    await place_order(client, slug, [(cap, None, 1)], total="10.00")
    assert len(await logs(store_id)) == 1
    # RLS: another store's session sees none of them, even unfiltered.
    async with tenant_session(other_id) as db:
        assert list(await db.scalars(select(NotificationLog))) == []


async def test_khr_and_auto_accepted_order_text(client, bot, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await client.patch(
        "/api/v1/seller/store",
        headers=headers,
        json={"currency": "KHR", "order_confirmation_mode": "automatic"},
    )
    await connect(store_id)
    cap = await add_product(store_id, "cap", stock=20)
    placed = await place_order(client, slug, [(cap, None, 1)], total="10.00")
    assert placed.status_code == 201, placed.text
    assert "(បានទទួលដោយស្វ័យប្រវត្តិ)" in bot[0]["text"]  # accepted automatically
    assert "10៛" in bot[0]["text"]


async def test_a_chat_order_sends_only_low_stock(client, bot, auth_headers):
    """The seller added it (founder's pick 3A): no new-order alert, but a
    product it took down still warns them."""
    headers, store_id, _ = await registered_seller(client, auth_headers)
    await connect(store_id)
    cap = await add_product(store_id, "cap", stock=1)

    response = await client.post(
        "/api/v1/seller/orders",
        headers=headers,
        json={
            "name": "Sokha",
            "phone": "098765432",
            "items": [{"product_id": str(cap), "quantity": 1}],
            "payment_method": "cod",
            "delivery_method": "seller_delivery",
            "delivery_address": "Toul Kork",
            "expected_total": "10.00",
        },
    )

    assert response.status_code == 201, response.text
    assert len(bot) == 1
    assert "ជិតអស់ស្តុក" in bot[0]["text"]  # Running low
    assert [log.event_type for log in await logs(store_id)] == ["low_stock"]


async def _say_paid(client, slug, order_id, phone="012345678"):
    return await client.post(f"/api/v1/shop/{slug}/orders/{order_id}/paid", json={"phone": phone})


async def test_ive_paid_alerts_the_seller_once_and_shows_on_the_order(client, bot, auth_headers):
    """The customer taps "I've paid" (founder's pick 6B): a bell row and a
    Telegram alert, "Customer says paid" on the order; the payment stays
    pending until the seller checks."""
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await set_payments(client, headers, bank_transfer=BANK)
    await connect(store_id)
    cap = await add_product(store_id, "cap", stock=5)
    order = (
        await place_order(
            client, slug, [(cap, None, 1)], total="10.00", payment_method="bank_transfer"
        )
    ).json()
    bot.clear()

    first = await _say_paid(client, slug, order["id"], phone="+855 12 345 678")
    again = await _say_paid(client, slug, order["id"])

    assert (first.status_code, again.status_code) == (204, 204)
    assert len(bot) == 1  # not again within 30 minutes
    assert "#1001" in bot[0]["text"] and "$10.00" in bot[0]["text"]
    assert bot[0]["button"][1].endswith(f"/dashboard/orders/{order['id']}")
    seller = (await client.get(f"/api/v1/seller/orders/{order['id']}", headers=headers)).json()
    assert seller["payment"]["status"] == "pending"
    assert seller["payment"]["claimed_at"] is not None
    tracked = (await track(client, slug, order["id"])).json()["payment"]
    assert tracked["claimed_at"] is not None
    bell = (await client.get("/api/v1/seller/notifications", headers=headers)).json()
    claimed = [n for n in bell["notifications"] if n["event_type"] == "payment_claimed"]
    assert len(claimed) == 1
    assert claimed[0]["order"]["number"] == 1001


async def test_ive_paid_needs_something_to_pay_and_the_right_phone(client, bot, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await set_payments(client, headers, bank_transfer=BANK)
    cap = await add_product(store_id, "cap", stock=5)
    cod = (await place_order(client, slug, [(cap, None, 1)], total="10.00")).json()
    bank = (
        await place_order(
            client, slug, [(cap, None, 1)], total="10.00", payment_method="bank_transfer"
        )
    ).json()

    cash = await _say_paid(client, slug, cod["id"])
    wrong_phone = await _say_paid(client, slug, bank["id"], phone="099 999 999")
    await client.patch(
        f"/api/v1/seller/orders/{bank['id']}/payment", headers=headers, json={"status": "paid"}
    )
    already_paid = await _say_paid(client, slug, bank["id"])

    assert cash.status_code == 409
    assert cash.json()["error"]["code"] == "NOTHING_TO_PAY"
    assert wrong_phone.status_code == 404
    assert already_paid.status_code == 409


async def test_ive_paid_on_another_shops_order_is_not_found(client, bot, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    _, _, other_slug = await registered_seller(client, auth_headers)
    await set_payments(client, headers, bank_transfer=BANK)
    cap = await add_product(store_id, "cap", stock=5)
    order = (
        await place_order(
            client, slug, [(cap, None, 1)], total="10.00", payment_method="bank_transfer"
        )
    ).json()

    response = await _say_paid(client, other_slug, order["id"])

    assert response.status_code == 404
