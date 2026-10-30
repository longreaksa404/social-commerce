"""Open as seller (01_PRODUCT.md §22.11, founder's pick D1A): the admin
uses a shop's app as its owner for 30 minutes, after the password again;
logged, the shop's Telegram told; not the owner's password, phone, logins,
Close shop or "I've paid"; each save logged."""

import pytest

from app.core.config import get_settings
from app.services import telegram
from tests.conftest import ADMIN_PASSWORD
from tests.helpers import add_product

SHOPS = "/api/v1/admin/shops"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.fixture
def sent(monkeypatch):
    """The Telegram messages the bot sends, collected."""
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_token", "123:abc")
    monkeypatch.setattr(settings, "telegram_bot_username", "TestShopBot")
    monkeypatch.setattr(settings, "telegram_webhook_secret", "secret")
    messages: list[dict] = []

    async def fake_send(chat_id, text, button=None):
        messages.append({"chat_id": str(chat_id), "text": text})

    monkeypatch.setattr(telegram, "send_message", fake_send)
    return messages


async def store_of(client, tokens) -> dict:
    return (await client.get("/api/v1/seller/store", headers=bearer(tokens))).json()


async def open_as(client, admin, store_id, reason="Setup help"):
    await client.post(
        "/api/v1/admin/auth/password", headers=bearer(admin), json={"password": ADMIN_PASSWORD}
    )
    return await client.post(
        f"{SHOPS}/{store_id}/open-as-seller", headers=bearer(admin), json={"reason": reason}
    )


async def test_opening_needs_the_password_again_and_tells_the_shop(client, register, admin, sent):
    seller = await register()
    store = await store_of(client, seller)

    refused = await client.post(
        f"{SHOPS}/{store['id']}/open-as-seller", headers=bearer(admin), json={"reason": "help"}
    )
    opened = await open_as(client, admin, store["id"], "Setup help")

    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "PASSWORD_AGAIN"
    assert opened.status_code == 200, opened.text
    acting = opened.json()
    assert acting["shop"] == store["name"]
    # The owner's app, the owner's shop.
    assert (await store_of(client, acting))["id"] == store["id"]
    texts = [m["text"] for m in sent]
    assert any("Oak Order បានបើកហាងរបស់អ្នក" in t for t in texts)
    assert any("opened" in t and "as seller" in t for t in texts)
    detail = (await client.get(f"{SHOPS}/{store['id']}", headers=bearer(admin))).json()
    assert detail["log"][0]["action"] == "open_as_seller"
    assert detail["log"][0]["reason"] == "Setup help"
    assert detail["activity"][0]["event_type"] == "opened_by_oak"


async def test_the_owners_own_things_stay_the_owners(client, register, admin):
    seller = await register()
    store = await store_of(client, seller)
    acting = (await open_as(client, admin, store["id"])).json()
    headers = bearer(acting)

    answers = [
        await client.post(
            "/api/v1/seller/account/password",
            headers=headers,
            json={"current_password": "correct-horse", "new_password": "taken-over-1"},
        ),
        await client.post(
            "/api/v1/seller/account/phone", headers=headers, json={"phone_check": "x" * 20}
        ),
        await client.post(
            "/api/v1/seller/account/close-shop", headers=headers, json={"password": "x"}
        ),
        await client.post("/api/v1/seller/plan/paid", headers=headers, json={"period": "month"}),
    ]

    assert [a.status_code for a in answers] == [403] * 4
    assert {a.json()["error"]["code"] for a in answers} == {"NOT_AS_ADMIN"}
    # The seller's own login still can.
    paid = await client.post(
        "/api/v1/seller/plan/paid", headers=bearer(seller), json={"period": "month"}
    )
    assert paid.status_code == 200


async def test_each_save_is_logged_and_stays_in_that_shop(client, register, admin):
    seller = await register()
    other = await register()
    store = await store_of(client, seller)
    other_store = await store_of(client, other)
    theirs = await add_product(other_store["id"], "their-cap")
    acting = (await open_as(client, admin, store["id"])).json()
    headers = bearer(acting)

    made = await client.post(
        "/api/v1/seller/categories", headers=headers, json={"name": "Phone cases"}
    )
    looked = await client.get("/api/v1/seller/categories", headers=headers)
    elsewhere = await client.get(f"/api/v1/seller/products/{theirs}", headers=headers)

    assert made.status_code == 201, made.text
    assert elsewhere.status_code == 404
    log = await client.get(f"/api/v1/admin/log?store_id={store['id']}", headers=bearer(admin))
    saves = [line for line in log.json() if line["action"] == "seller_save"]
    # The write is logged; the read isn't.
    assert len(saves) == 1
    assert saves[0]["details"]["method"] == "POST"
    assert saves[0]["details"]["path"] == "/seller/categories"
    assert looked.status_code == 200


async def test_a_closed_shop_cant_be_opened(client, register, admin):
    seller = await register()
    store = await store_of(client, seller)
    await client.post(
        f"{SHOPS}/{store['id']}/close", headers=bearer(admin), json={"reason": "asked"}
    )

    refused = await open_as(client, admin, store["id"])

    assert refused.status_code == 409
    assert refused.json()["error"]["code"] == "SHOP_CLOSED"
