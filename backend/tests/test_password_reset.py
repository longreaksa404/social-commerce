"""Forgot password? A link to the shop's Telegram (no email in the MVP).
Asked for with the login: a phone number, or an older account's email."""

import re
import uuid

import pytest

from app.core import security
from app.core.config import get_settings
from app.db.session import tenant_session
from app.models import Store
from app.services import telegram
from tests.helpers import refresh

RESET = "/api/v1/auth/password-reset"


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


async def _seller_with_telegram(client, register, chat_id=555) -> dict:
    tokens = await register()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    async with tenant_session(uuid.UUID(store["id"])) as db:
        store_row = await db.get(Store, uuid.UUID(store["id"]))
        store_row.telegram_chat_id = None if chat_id is None else str(chat_id)
        await db.commit()
    return tokens


def _token(message: dict) -> str:
    label, url = message["button"]
    assert label == "ជ្រើសពាក្យសម្ងាត់ថ្មី"  # Choose a new password (in Khmer)
    match = re.fullmatch(r"https://app\.example\.com/reset-password#(.+)", url)
    assert match, url
    return match.group(1)


async def test_link_goes_to_the_shops_telegram_and_sets_a_new_password(client, register, bot):
    seller = await _seller_with_telegram(client, register)
    other_phone = await client.post(
        "/api/v1/auth/login", json={"login": seller["phone"], "password": "correct-horse"}
    )

    # The number written another way.
    asked = await client.post(RESET, json={"login": f"+855 {seller['phone'][1:]}"})
    assert asked.status_code == 202
    assert len(bot) == 1 and bot[0]["chat_id"] == "555"
    assert seller["phone"] in bot[0]["text"]

    reset = await client.post(
        f"{RESET}/confirm", json={"token": _token(bot[0]), "new_password": "brand-new-pass"}
    )
    assert reset.status_code == 200, reset.text
    # Logged in on this phone, every other one logged out.
    me = await client.get(
        "/api/v1/seller/account",
        headers={"Authorization": f"Bearer {reset.json()['access_token']}"},
    )
    stale = await refresh(client, other_phone.cookies["refresh_token"])
    login = await client.post(
        "/api/v1/auth/login", json={"login": seller["phone"], "password": "brand-new-pass"}
    )
    assert me.status_code == 200
    assert stale.status_code == 401
    assert login.status_code == 200


async def test_a_link_works_once(client, register, bot):
    seller = await _seller_with_telegram(client, register)
    await client.post(RESET, json={"login": seller["phone"]})
    token = _token(bot[0])

    first = await client.post(
        f"{RESET}/confirm", json={"token": token, "new_password": "one-more-pass"}
    )
    again = await client.post(
        f"{RESET}/confirm", json={"token": token, "new_password": "and-another"}
    )

    assert first.status_code == 200
    assert again.status_code == 400
    assert again.json()["error"]["code"] == "RESET_LINK_INVALID"


async def test_a_changed_password_cancels_older_links(client, register, bot):
    seller = await _seller_with_telegram(client, register)
    await client.post(RESET, json={"login": seller["phone"]})
    await client.post(
        "/api/v1/seller/account/password",
        headers={"Authorization": f"Bearer {seller['access_token']}"},
        json={"current_password": "correct-horse", "new_password": "changed-meanwhile"},
    )

    late = await client.post(
        f"{RESET}/confirm", json={"token": _token(bot[0]), "new_password": "too-late-now"}
    )

    assert late.status_code == 400


async def test_unknown_login_or_no_telegram_answer_the_same_and_send_nothing(client, register, bot):
    # Signing up connects Telegram; this seller disconnected it since.
    without_telegram = await _seller_with_telegram(client, register, chat_id=None)

    unknown = await client.post(RESET, json={"login": "012 000 001"})
    unknown_email = await client.post(RESET, json={"login": "nobody@example.com"})
    not_a_login = await client.post(RESET, json={"login": "nobody"})
    no_chat = await client.post(RESET, json={"login": without_telegram["phone"]})

    assert {r.status_code for r in (unknown, unknown_email, not_a_login, no_chat)} == {202}
    assert unknown.content == no_chat.content
    assert bot == []


async def test_bad_expired_or_wrong_kind_of_token_is_refused(client, register, monkeypatch):
    seller = await register()
    login_token = seller["access_token"]  # an access token is not a reset link
    monkeypatch.setattr(security, "RESET_TOKEN_MINUTES", -1)
    expired = security.create_reset_token(uuid.uuid4(), "x")

    for token in ("not-a-token", login_token, expired):
        response = await client.post(
            f"{RESET}/confirm", json={"token": token, "new_password": "whatever-123"}
        )
        assert response.status_code == 400, token
        assert response.json()["error"]["code"] == "RESET_LINK_INVALID"


async def test_short_new_password_is_refused(client):
    response = await client.post(f"{RESET}/confirm", json={"token": "x", "new_password": "short"})
    assert response.status_code == 422
    assert response.json()["error"]["field"] == "new_password"
