"""Customers log in with Telegram (founder, 2026-10-20): checkout's check
with the cart, the bot's /start and share button, the token, and an order
placed with it getting the order's news on Telegram."""

import hashlib
import hmac
import json
import random
import time
import uuid
from urllib.parse import urlencode

import pytest

from app.core.config import get_settings
from app.db.session import unscoped_session
from app.models import PhoneCheck
from app.services import customer_login, telegram
from tests.helpers import add_product, place_order, registered_seller, track

LINE = {
    "product_slug": "cap",
    "name": "Cap",
    "variant_name": None,
    "price": "10.00",
    "image_url": None,
    "quantity": 1,
}


@pytest.fixture
def bot(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_token", "123:abc")
    monkeypatch.setattr(settings, "telegram_bot_username", "TestShopBot")
    monkeypatch.setattr(settings, "telegram_webhook_secret", "secret")
    monkeypatch.setattr(settings, "public_app_url", "https://app.example.com")
    sent: list[dict] = []

    async def fake_send(chat_id, text, button=None):
        sent.append({"chat_id": chat_id, "text": text, "button": button})

    async def fake_call(method, payload):
        sent.append({"method": method, **payload})
        return {}

    monkeypatch.setattr(telegram, "send_message", fake_send)
    monkeypatch.setattr(telegram, "call", fake_call)
    return sent


@pytest.fixture
def sokha() -> int:
    """The customer's Telegram account (= their private chat), new each test."""
    return random.randrange(10**9, 10**10)


def message(user_id: int, **fields) -> dict:
    chat = {"id": user_id, "type": "private"}
    return {"update_id": 1, "message": {"chat": chat, "from": {"id": user_id}, **fields}}


async def a_shop(client, auth_headers):
    """(headers, store_id, slug, cap product id)"""
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    return headers, store_id, slug, cap


async def log_in(client, bot, slug, cap, user_id, phone="85512345678") -> dict:
    """Checkout's check, the bot, the shared phone: the page's last read."""
    started = await client.post(
        f"/api/v1/shop/{slug}/telegram-login",
        json={"lines": [{**LINE, "product_id": str(cap)}]},
    )
    assert started.status_code == 201, started.text
    check = started.json()
    assert check["customer"] is None
    code = check["telegram_url"].split("?start=")[1]
    assert code.startswith("login_")
    asked = await telegram.handle_update(message(user_id, text=f"/start {code}"))
    assert asked["reply_markup"]["keyboard"][0][0]["request_contact"] is True
    contact = {
        "phone_number": phone,
        "user_id": user_id,
        "first_name": "Sokha",
        "last_name": "Chan",
    }
    before = len(bot)
    opener = await telegram.handle_update(message(user_id, contact=contact))
    # The shop button, "Done" (taking the share button away), then "Open checkout".
    [done] = [m for m in bot[before:] if m.get("method") != "setChatMenuButton"]
    assert "✅" in done["text"] and done["reply_markup"] == {"remove_keyboard": True}
    read = await client.get(f"/api/v1/shop/{slug}/telegram-login/{check['id']}")
    assert read.status_code == 200, read.text
    return {"check": check, "asked": asked, "done": done, "opener": opener, "read": read.json()}


async def test_login_gives_the_device_a_token(client, bot, auth_headers, sokha):
    _, _, slug, cap = await a_shop(client, auth_headers)
    result = await log_in(client, bot, slug, cap, sokha)

    assert "នឹងឃើញលេខនេះ" in result["asked"]["text"]  # the shop will see the number
    assert "012345678" in result["done"]["text"]
    customer = result["read"]["customer"]
    assert (customer["name"], customer["phone"], customer["address"]) == (
        "Sokha Chan",
        "012345678",
        None,
    )
    who = customer_login.read_token(customer["token"])
    assert (who.telegram_user_id, who.phone) == (sokha, "012345678")

    me = await client.get(
        f"/api/v1/shop/{slug}/me", headers={"X-Customer-Token": customer["token"]}
    )
    assert me.json()["phone"] == "012345678"
    assert (await client.get(f"/api/v1/shop/{slug}/me")).status_code == 401


async def test_a_returning_customer_gets_the_shops_name_and_address(
    client, bot, auth_headers, sokha
):
    _, _, slug, cap = await a_shop(client, auth_headers)
    placed = await place_order(client, slug, [(cap, None, 1)], total="10.00", phone="012 345 678")
    assert placed.status_code == 201
    customer = (await log_in(client, bot, slug, cap, sokha))["read"]["customer"]
    # The helper orders as "Dara" to St 271.
    assert (customer["name"], customer["address"]) == ("Dara", "St 271, Phnom Penh")


async def test_an_order_with_the_token_gets_telegram_news(client, bot, auth_headers, sokha):
    headers, _, slug, cap = await a_shop(client, auth_headers)
    token = (await log_in(client, bot, slug, cap, sokha))["read"]["customer"]["token"]

    placed = await place_order(
        client, slug, [(cap, None, 1)], total="10.00", headers={"X-Customer-Token": token}
    )
    assert placed.status_code == 201, placed.text
    order_id = placed.json()["id"]
    assert (await track(client, slug, order_id)).json()["telegram_updates"] == "on"
    seller_view = await client.get(f"/api/v1/seller/orders/{order_id}", headers=headers)
    assert seller_view.json()["customer"]["telegram_phone"] == "012345678"

    # Another phone typed in with the token: that customer isn't linked.
    other = await place_order(
        client,
        slug,
        [(cap, None, 1)],
        total="10.00",
        phone="097 123 4567",
        headers={"X-Customer-Token": token},
    )
    assert (await track(client, slug, other.json()["id"], "0971234567")).json()[
        "telegram_updates"
    ] == "off"


async def test_another_shop_cant_read_the_check(client, bot, auth_headers, sokha):
    """The check belongs to the shop it was made in (tenant isolation)."""
    _, _, slug, cap = await a_shop(client, auth_headers)
    _, _, other_slug, _ = await a_shop(client, auth_headers)
    check_id = (await log_in(client, bot, slug, cap, sokha))["check"]["id"]
    elsewhere = await client.get(f"/api/v1/shop/{other_slug}/telegram-login/{check_id}")
    assert elsewhere.status_code == 404
    unknown = await client.get(f"/api/v1/shop/{slug}/telegram-login/{uuid.uuid4()}")
    assert unknown.status_code == 404


async def test_the_cart_can_be_updated_as_the_page_leaves(client, bot, auth_headers):
    _, _, slug, cap = await a_shop(client, auth_headers)
    started = await client.post(f"/api/v1/shop/{slug}/telegram-login", json={"lines": []})
    check_id = started.json()["id"]
    line = {**LINE, "product_id": str(cap), "quantity": 2}
    sent = await client.post(
        f"/api/v1/shop/{slug}/telegram-login/{check_id}/cart",
        content=json.dumps({"lines": [line]}),
        headers={"Content-Type": "text/plain"},
    )
    assert sent.status_code == 204, sent.text
    async with unscoped_session() as db:
        check = await db.get(PhoneCheck, uuid.UUID(check_id))
        assert [(x["product_id"], x["quantity"]) for x in check.cart["lines"]] == [(str(cap), 2)]
    bad = await client.post(f"/api/v1/shop/{slug}/telegram-login/{check_id}/cart", content="x")
    assert bad.status_code == 422


async def test_an_expired_or_unknown_login_link_explains(client, bot, sokha):
    reply = await telegram.handle_update(message(sokha, text="/start login_nothing"))
    assert reply["text"] == customer_login.EXPIRED_TEXT


async def test_a_customer_token_is_no_seller_login(client, bot, auth_headers, sokha):
    _, _, slug, cap = await a_shop(client, auth_headers)
    token = (await log_in(client, bot, slug, cap, sokha))["read"]["customer"]["token"]
    response = await client.get(
        "/api/v1/seller/store", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401


# Inside Telegram (the mini app)


def init_data(user_id: int, token: str = "123:abc") -> str:
    """initData as Telegram signs it for the bot, fresh."""
    fields = {
        "auth_date": str(int(time.time())),
        "user": json.dumps({"id": user_id, "first_name": "Sokha"}),
    }
    check = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(fields)


async def test_the_bot_opens_the_same_checkout_inside_telegram(client, bot, auth_headers, sokha):
    _, _, slug, cap = await a_shop(client, auth_headers)
    result = await log_in(client, bot, slug, cap, sokha)
    check_id = result["check"]["id"]
    [menu] = [m for m in bot if m.get("method") == "setChatMenuButton"]
    assert menu["menu_button"]["web_app"]["url"] == f"https://app.example.com/shop/{slug}"
    button = result["opener"]["reply_markup"]["inline_keyboard"][0][0]
    assert button["web_app"]["url"] == f"https://app.example.com/shop/{slug}/cart?tg={check_id}"

    url = f"/api/v1/shop/{slug}/telegram-login/{check_id}/mini-app"
    inside = await client.post(url, json={"init_data": init_data(sokha)})
    assert inside.status_code == 200, inside.text
    body = inside.json()
    assert body["customer"]["phone"] == "012345678"
    assert [(line["product_id"], line["quantity"]) for line in body["lines"]] == [(str(cap), 1)]

    # Someone else's Telegram (a forwarded button), or data Telegram didn't sign.
    other = await client.post(url, json={"init_data": init_data(sokha + 1)})
    assert other.status_code == 404
    forged = await client.post(url, json={"init_data": init_data(sokha, "999:zzz")})
    assert forged.status_code == 401


async def test_without_https_the_bot_just_says_go_back(
    client, bot, auth_headers, sokha, monkeypatch
):
    monkeypatch.setattr(get_settings(), "public_app_url", "http://localhost:5173")
    _, _, slug, cap = await a_shop(client, auth_headers)
    started = await client.post(f"/api/v1/shop/{slug}/telegram-login", json={"lines": []})
    code = started.json()["telegram_url"].split("?start=")[1]
    await telegram.handle_update(message(sokha, text=f"/start {code}"))
    contact = {"phone_number": "85512345678", "user_id": sokha, "first_name": "Sokha"}
    only = await telegram.handle_update(message(sokha, contact=contact))
    assert only["text"].startswith("✅") and only["reply_markup"] == {"remove_keyboard": True}


async def test_the_mini_app_logs_a_known_customer_in_again(client, bot, auth_headers, sokha):
    _, _, slug, cap = await a_shop(client, auth_headers)
    url = f"/api/v1/shop/{slug}/mini-app-login"
    unknown = await client.post(url, json={"init_data": init_data(sokha)})
    assert unknown.status_code == 404

    token = (await log_in(client, bot, slug, cap, sokha))["read"]["customer"]["token"]
    await place_order(
        client, slug, [(cap, None, 1)], total="10.00", headers={"X-Customer-Token": token}
    )
    again = await client.post(url, json={"init_data": init_data(sokha)})
    assert again.status_code == 200, again.text
    assert (again.json()["phone"], again.json()["name"]) == ("012345678", "Dara")

    # Another Oak shop: the same Telegram account's proved phone, its name.
    _, _, other_slug, _ = await a_shop(client, auth_headers)
    elsewhere = await client.post(
        f"/api/v1/shop/{other_slug}/mini-app-login", json={"init_data": init_data(sokha)}
    )
    assert (elsewhere.json()["phone"], elsewhere.json()["name"]) == ("012345678", "Sokha")


# "Your shops": what OPEN in Telegram's chat list opens


async def test_your_shops_lists_the_shops_this_customer_ordered_from(
    client, bot, auth_headers, sokha
):
    _, _, slug_a, cap_a = await a_shop(client, auth_headers)
    _, _, slug_b, cap_b = await a_shop(client, auth_headers)
    _, _, slug_c, _ = await a_shop(client, auth_headers)  # never ordered from
    token = (await log_in(client, bot, slug_a, cap_a, sokha))["read"]["customer"]["token"]
    for slug, cap in ((slug_a, cap_a), (slug_b, cap_b)):
        placed = await place_order(
            client, slug, [(cap, None, 1)], total="10.00", headers={"X-Customer-Token": token}
        )
        assert placed.status_code == 201

    inside = await client.post("/api/v1/telegram/my-shops", json={"init_data": init_data(sokha)})
    assert inside.status_code == 200, inside.text
    assert [shop["slug"] for shop in inside.json()] == [slug_b, slug_a]  # latest first
    in_browser = await client.post(
        "/api/v1/telegram/my-shops", json={}, headers={"X-Customer-Token": token}
    )
    assert [shop["slug"] for shop in in_browser.json()] == [slug_b, slug_a]
    assert slug_c not in {shop["slug"] for shop in in_browser.json()}

    # Someone else sees none of them; nobody at all is refused.
    other = await client.post("/api/v1/telegram/my-shops", json={"init_data": init_data(sokha + 1)})
    assert other.json() == []
    assert (await client.post("/api/v1/telegram/my-shops", json={})).status_code == 401
