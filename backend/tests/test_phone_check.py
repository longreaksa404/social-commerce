"""Proving a phone number through the Telegram bot: the page's check, the
bot's /start and share button, and the shared contact."""

import random
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import update

from app.core.config import get_settings
from app.core.errors import AppError
from app.db.session import unscoped_session
from app.models import PhoneCheck, Seller
from app.services import phone_check, telegram

CHECKS = "/api/v1/auth/phone-checks"


@pytest.fixture
def sokha() -> int:
    """A Telegram account's id (= its private chat's id), new for each
    test: checks a test leaves open stay in the database."""
    return random.randrange(10**9, 10**10)


@pytest.fixture
def bot(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_token", "123:abc")
    monkeypatch.setattr(settings, "telegram_bot_username", "TestShopBot")
    monkeypatch.setattr(settings, "telegram_webhook_secret", "secret")


def start(user_id: int, code: str) -> dict:
    return {
        "update_id": 1,
        "message": {
            "chat": {"id": user_id, "type": "private"},
            "from": {"id": user_id},
            "text": f"/start {code}",
        },
    }


def contact(user_id: int, phone: str, owner_id: int | None = None) -> dict:
    """`owner_id`: whose contact card it is (the sender's own by default)."""
    card = {
        "phone_number": phone,
        "first_name": "Sokha",
        "user_id": user_id if owner_id is None else owner_id,
    }
    return {
        "update_id": 2,
        "message": {
            "chat": {"id": user_id, "type": "private"},
            "from": {"id": user_id},
            "contact": card,
        },
    }


def code_of(check: dict) -> str:
    return check["telegram_url"].split("?start=")[1]


async def new_check(client) -> dict:
    response = await client.post(CHECKS)
    assert response.status_code == 201, response.text
    return response.json()


async def verify(client, user_id: int, phone: str = "855 12 345 678") -> dict:
    """A check completed in Telegram; returns it as the page reads it."""
    check = await new_check(client)
    await telegram.handle_update(start(user_id, code_of(check)))
    await telegram.handle_update(contact(user_id, phone))
    return (await client.get(f"{CHECKS}/{check['id']}")).json()


async def test_off_without_the_bot(client):
    response = await client.post(CHECKS)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "TELEGRAM_NOT_CONFIGURED"


async def test_whole_check(client, bot, sokha):
    check = await new_check(client)
    assert check["telegram_url"].startswith("https://t.me/TestShopBot?start=phone_")
    assert check["phone"] is None

    # Opening the link: the bot asks for the number with a share button.
    reply = await telegram.handle_update(start(sokha, code_of(check)))
    assert reply["text"] == telegram.PHONE_ASK_TEXT
    [[button]] = reply["reply_markup"]["keyboard"]
    assert button["request_contact"] is True
    assert (await client.get(f"{CHECKS}/{check['id']}")).json()["phone"] is None

    # Sharing it: done, the button goes away, the page sees the number.
    reply = await telegram.handle_update(contact(sokha, "85512345678"))
    assert reply["text"] == telegram.phone_done_text("012345678")
    assert reply["reply_markup"] == {"remove_keyboard": True}
    read = (await client.get(f"{CHECKS}/{check['id']}")).json()
    assert read["phone"] == "012345678"
    assert read["taken"] is False


async def test_foreign_numbers_kept_international(client, bot, sokha):
    assert (await verify(client, sokha, "+66 81 234 5678"))["phone"] == "+66812345678"


async def test_someone_elses_contact_card_doesnt_count(client, bot, sokha):
    check = await new_check(client)
    await telegram.handle_update(start(sokha, code_of(check)))

    reply = await telegram.handle_update(contact(sokha, "85599888777", owner_id=999))
    assert reply["text"] == telegram.PHONE_NOT_OWN_TEXT
    # A card for someone without Telegram has no user_id at all.
    card_without_id = contact(sokha, "85599888777")
    del card_without_id["message"]["contact"]["user_id"]
    assert (await telegram.handle_update(card_without_id))["text"] == telegram.PHONE_NOT_OWN_TEXT

    assert (await client.get(f"{CHECKS}/{check['id']}")).json()["phone"] is None


async def test_number_goes_only_to_the_check_that_account_opened(client, bot, sokha):
    mine, theirs = await new_check(client), await new_check(client)
    await telegram.handle_update(start(sokha, code_of(mine)))
    await telegram.handle_update(start(sokha + 1, code_of(theirs)))

    await telegram.handle_update(contact(sokha, "85512345678"))

    assert (await client.get(f"{CHECKS}/{mine['id']}")).json()["phone"] == "012345678"
    assert (await client.get(f"{CHECKS}/{theirs['id']}")).json()["phone"] is None


async def test_sharing_without_an_open_check(client, bot, sokha):
    reply = await telegram.handle_update(contact(sokha, "85512345678"))
    assert reply["text"] == telegram.PHONE_EXPIRED_TEXT


async def test_done_check_cant_be_opened_again(client, bot, sokha):
    check = await new_check(client)
    await telegram.handle_update(start(sokha, code_of(check)))
    await telegram.handle_update(contact(sokha, "85512345678"))

    reply = await telegram.handle_update(start(sokha + 1, code_of(check)))
    assert reply["text"] == telegram.PHONE_EXPIRED_TEXT


async def test_expired_check(client, bot, sokha):
    check = await new_check(client)
    async with unscoped_session() as db:
        await db.execute(
            update(PhoneCheck)
            .where(PhoneCheck.id == uuid.UUID(check["id"]))
            .values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
        )
        await db.commit()

    reply = await telegram.handle_update(start(sokha, code_of(check)))
    assert reply["text"] == telegram.PHONE_EXPIRED_TEXT
    response = await client.get(f"{CHECKS}/{check['id']}")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PHONE_CHECK_EXPIRED"


async def test_unknown_check(client, bot, sokha):
    response = await client.get(f"{CHECKS}/{uuid.uuid4()}")
    assert response.status_code == 404
    reply = await telegram.handle_update(start(sokha, "phone_nope"))
    assert reply["text"] == telegram.PHONE_EXPIRED_TEXT


async def test_says_when_the_number_has_an_account(client, bot, make_store, sokha):
    store = await make_store()
    async with unscoped_session() as db:
        await db.execute(
            update(Seller).where(Seller.id == store.seller_id).values(phone="012777888")
        )
        await db.commit()

    assert (await verify(client, sokha, "85512777888"))["taken"] is True


async def test_store_links_still_connect(client, bot, make_store, sokha):
    """A store's "Connect Telegram" code isn't mistaken for a phone check."""
    store = await make_store()
    code, _ = telegram.make_link_code(store.store_id)
    reply = await telegram.handle_update(start(sokha, code))
    assert "✅" in reply["text"]
    assert "reply_markup" not in reply


async def test_used_check_works_once(client, bot, sokha):
    check = await verify(client, sokha)
    async with unscoped_session() as db:
        used = await phone_check.use(db, uuid.UUID(check["id"]))
        await db.commit()
    assert used.phone == "012345678"
    assert (await client.get(f"{CHECKS}/{check['id']}")).status_code == 404


async def test_unfinished_check_cant_be_used(client, bot):
    check = await new_check(client)
    async with unscoped_session() as db:
        with pytest.raises(AppError) as error:
            await phone_check.use(db, uuid.UUID(check["id"]))
    assert error.value.code == "PHONE_NOT_VERIFIED"
