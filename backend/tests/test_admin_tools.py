"""The admin's tools (01_PRODUCT.md §22.11): a test shop in one tap (part
29); erasing a closed shop after its link name and the admin's password
(D4B); a Telegram message to every shop, to the admin first (part 30);
the sign-ups that didn't finish (part 31)."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import delete, update

from app.core.config import get_settings
from app.db.session import unscoped_session
from app.models import PhoneCheck, Store
from app.services import phone_check, telegram
from tests.conftest import ADMIN_PASSWORD
from tests.helpers import add_product, verified_phone_check

ADMIN = "/api/v1/admin"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def test_a_test_shop_is_open_with_a_login_to_copy(client, admin):
    made = await client.post(f"{ADMIN}/test-shop", headers=bearer(admin), json={})

    assert made.status_code == 201, made.text
    shop = made.json()
    assert shop["login"].startswith("test-") and shop["login"].endswith("@example.com")
    logged_in = await client.post(
        "/api/v1/auth/login", json={"login": shop["login"], "password": shop["password"]}
    )
    detail = (await client.get(f"{ADMIN}/shops/{shop['store_id']}", headers=bearer(admin))).json()
    assert logged_in.status_code == 200
    assert detail["stage"] == "active" and detail["on_trial"]
    assert detail["log"][0]["action"] == "test_shop"
    assert shop["password"] not in str(detail["log"][0])


async def test_erasing_takes_a_closed_shop_its_name_and_the_password(client, register, admin):
    seller = await register()
    other = await register()
    store = (await client.get("/api/v1/seller/store", headers=bearer(seller))).json()
    other_store = (await client.get("/api/v1/seller/store", headers=bearer(other))).json()
    await add_product(store["id"], "cap")
    kept = await add_product(other_store["id"], "hat")
    url = f"{ADMIN}/shops/{store['id']}"
    body = {"slug": store["slug"], "password": ADMIN_PASSWORD}

    still_open = await client.request("DELETE", url, headers=bearer(admin), json=body)
    await client.post(f"{url}/close", headers=bearer(admin), json={"reason": "asked to erase"})
    wrong_name = await client.request(
        "DELETE", url, headers=bearer(admin), json={**body, "slug": "not-it"}
    )
    wrong_password = await client.request(
        "DELETE", url, headers=bearer(admin), json={**body, "password": "nope"}
    )
    erased = await client.request("DELETE", url, headers=bearer(admin), json=body)

    assert still_open.status_code == 409
    assert still_open.json()["error"]["code"] == "SHOP_NOT_CLOSED"
    assert wrong_name.status_code == 422 and wrong_name.json()["error"]["code"] == "SLUG_MISMATCH"
    assert wrong_password.json()["error"]["code"] == "WRONG_PASSWORD"
    assert erased.status_code == 200, erased.text
    assert erased.json() == {"shop": store["name"]}
    assert (await client.get(url, headers=bearer(admin))).status_code == 404
    login = await client.post(
        "/api/v1/auth/login", json={"login": seller["phone"], "password": "correct-horse"}
    )
    assert login.status_code == 401
    # The log keeps what was erased, by name.
    line = (await client.get(f"{ADMIN}/log", headers=bearer(admin))).json()[0]
    assert line["action"] == "erase_shop" and line["store_id"] is None
    assert line["shop"] == store["name"] and line["details"]["products"] == 1
    # Another shop untouched.
    their = await client.get(f"/api/v1/seller/products/{kept}", headers=bearer(other))
    assert their.status_code == 200


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


async def chat_of(store_id) -> str:
    async with unscoped_session() as db:
        return (await db.get(Store, store_id)).telegram_chat_id


async def test_a_message_goes_to_the_admin_first_then_the_open_shops(client, register, admin, sent):
    open_one = await register()
    closed = await register()
    no_telegram = await register()
    stores = [
        (await client.get("/api/v1/seller/store", headers=bearer(t))).json()
        for t in (open_one, closed, no_telegram)
    ]
    await client.post(
        f"{ADMIN}/shops/{stores[1]['id']}/close", headers=bearer(admin), json={"reason": "x"}
    )
    await client.delete("/api/v1/seller/store/telegram", headers=bearer(no_telegram))
    text = "Oak Order is down for 10 minutes tonight at 22:00 <b>"

    to_me = await client.post(
        f"{ADMIN}/broadcast", headers=bearer(admin), json={"text": text, "to": "me"}
    )
    refused = await client.post(
        f"{ADMIN}/broadcast", headers=bearer(admin), json={"text": text, "to": "all"}
    )
    await client.post(
        "/api/v1/admin/auth/password", headers=bearer(admin), json={"password": ADMIN_PASSWORD}
    )
    to_all = await client.post(
        f"{ADMIN}/broadcast", headers=bearer(admin), json={"text": text, "to": "all"}
    )

    assert to_me.json() == {"sent": 1, "failed": 0}
    assert sent[0]["chat_id"] == str(admin["telegram_user_id"])
    assert "&lt;b&gt;" in sent[0]["text"]  # as typed, never markup
    assert refused.status_code == 403
    assert to_all.status_code == 200, to_all.text
    chats = {m["chat_id"] for m in sent[1:]}
    assert str(await chat_of(stores[0]["id"])) in chats
    assert str(await chat_of(stores[1]["id"])) not in chats  # closed
    line = (await client.get(f"{ADMIN}/log", headers=bearer(admin))).json()[0]
    assert line["action"] == "broadcast" and line["details"]["to"] == "all"
    assert line["details"]["sent"] == to_all.json()["sent"] >= 1
    shop = (await client.get(f"{ADMIN}/shops/{stores[0]['id']}", headers=bearer(admin))).json()
    assert shop["activity"][0]["event_type"] == "broadcast"


async def test_paying_shops_only(client, register, admin, sent):
    paying = await register()
    trial = await register()
    paying_store = (await client.get("/api/v1/seller/store", headers=bearer(paying))).json()
    trial_store = (await client.get("/api/v1/seller/store", headers=bearer(trial))).json()
    await client.post(
        f"{ADMIN}/shops/{paying_store['id']}/payments",
        headers=bearer(admin),
        json={"period": "month"},
    )
    await client.post(
        "/api/v1/admin/auth/password", headers=bearer(admin), json={"password": ADMIN_PASSWORD}
    )

    await client.post(
        f"{ADMIN}/broadcast", headers=bearer(admin), json={"text": "Thank you", "to": "paying"}
    )

    chats = {m["chat_id"] for m in sent}
    assert str(await chat_of(paying_store["id"])) in chats
    assert str(await chat_of(trial_store["id"])) not in chats


async def test_sign_ups_that_didnt_finish(client, register, admin):
    _, unfinished = await verified_phone_check()
    seller = await register()  # its check is used up: not listed
    _, old = await verified_phone_check()
    async with unscoped_session() as db:
        await db.execute(
            update(PhoneCheck)
            .where(PhoneCheck.phone == old)
            .values(
                created_at=datetime.now(UTC) - timedelta(days=31),
                expires_at=datetime.now(UTC) - timedelta(days=31),
            )
        )
        # An unfinished one expired an hour ago survives the tidy-up.
        await db.execute(
            update(PhoneCheck)
            .where(PhoneCheck.phone == unfinished)
            .values(expires_at=datetime.now(UTC) - timedelta(hours=1))
        )
        await db.execute(delete(PhoneCheck).where(phone_check.stale(datetime.now(UTC))))
        await db.commit()

    found = await client.get(f"{ADMIN}/signups", headers=bearer(admin))

    phones = [s["phone"] for s in found.json()]
    assert unfinished in phones
    assert old not in phones
    assert seller["phone"] not in phones
    assert admin["phone"] not in phones  # the admin's own check
