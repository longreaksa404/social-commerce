"""The admin's Bot page (01_PRODUCT.md §22.11, 02_TECHNICAL.md §12.7):
previews of every message, Save to the admin's own Telegram first, then
Go live with the password again; the bot's profile; Connect again."""

import pytest
from sqlalchemy import delete

from app.core.config import get_settings
from app.db.session import unscoped_session
from app.models import PlatformSetting
from app.services import bot_texts, telegram
from app.services.bot_texts import MESSAGES
from tests.conftest import ADMIN_PASSWORD

BOT = "/api/v1/admin/bot"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.fixture(autouse=True)
async def code_words():
    yield
    async with unscoped_session() as db:
        await db.execute(delete(PlatformSetting).where(PlatformSetting.key == bot_texts.KEY))
        await db.commit()


@pytest.fixture
def telegram_calls(monkeypatch):
    """The bot set up; each Bot API call collected, answering `answers`."""
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_token", "123:abc")
    monkeypatch.setattr(settings, "telegram_bot_username", "OakOrder_bot")
    monkeypatch.setattr(settings, "telegram_webhook_secret", "secret")
    calls: list[tuple[str, dict]] = []
    answers = {
        "getMyName": {"name": "Oak Order"},
        "getMyDescription": {"description": "Before Start"},
        "getMyShortDescription": {"short_description": "About"},
        "getWebhookInfo": {"url": "https://api.example.com/api/v1/telegram/webhook"},
    }

    async def fake_call(method, payload):
        calls.append((method, payload))
        return answers.get(method, True)

    monkeypatch.setattr(telegram, "call", fake_call)
    return calls


async def password_again(client, admin) -> None:
    await client.post(
        "/api/v1/admin/auth/password", headers=bearer(admin), json={"password": ADMIN_PASSWORD}
    )


def draft(key: str, **fields) -> dict:
    return {"key": key, "text": MESSAGES[key].text, **fields}


@pytest.mark.parametrize("key", MESSAGES)
async def test_every_message_previews_in_the_codes_words(client, admin, key):
    shown = await client.post(f"{BOT}/preview", headers=bearer(admin), json=draft(key))
    assert shown.status_code == 200, shown.text
    body = shown.json()
    assert (body["errors"], body["warnings"]) == ([], [])
    assert body["examples"] and all(e["html"] for e in body["examples"])


async def test_preview_shows_mistakes_and_the_draft(client, admin):
    shown = await client.post(
        f"{BOT}/preview",
        headers=bearer(admin),
        json=draft(
            "payment_reminder",
            text="**{shop}** #{number}\nPay {amont}",
            words={"button.pay": "**Pay**"},
        ),
    )
    body = shown.json()
    assert body["errors"] == [
        "{amont} isn't a tag here. Tags: {shop} {number} {amount}.",
        "Button: pay: This can't be bold.",
    ]
    assert body["warnings"] == ["{amount} is gone, so “Amount” won't show."]
    [example] = body["examples"]
    assert example["html"] == "<b>Oak Fashion</b> #1001\nPay {amont}"
    assert example["buttons"] == ["**Pay**"]


async def test_go_live_needs_the_password_again_and_is_logged(client, admin):
    new = draft("help", text="**Hi** from Oak")
    refused = await client.put(f"{BOT}/messages/help", headers=bearer(admin), json=new)
    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "PASSWORD_AGAIN"

    await password_again(client, admin)
    live = await client.put(f"{BOT}/messages/help", headers=bearer(admin), json=new)
    assert live.status_code == 200, live.text
    [help_] = [m for m in live.json()["messages"] if m["key"] == "help"]
    assert help_["text"] == "**Hi** from Oak"
    assert (await bot_texts.load()).html("help") == "<b>Hi</b> from Oak"
    line = (await client.get("/api/v1/admin/log", headers=bearer(admin))).json()[0]
    assert line["action"] == "bot_text"
    assert line["details"]["message"] == "Help"
    assert line["details"]["text"] == [MESSAGES["help"].text, "**Hi** from Oak"]

    # Back to original leaves nothing saved.
    back = await client.put(f"{BOT}/messages/help", headers=bearer(admin), json=draft("help"))
    assert back.status_code == 200
    assert await bot_texts.load() == bot_texts.DEFAULT


async def test_go_live_refuses_mistakes_and_turning_off_what_stays_on(client, admin):
    await password_again(client, admin)
    broken = draft("receipt", text="**{shop}")
    stays = draft("login_ask", on=False)
    stranger = draft("receipt", words={"tap.gone": "x"})
    for body, code in ((broken, 422), (stays, 422), (stranger, 422)):
        key = body["key"]
        answer = await client.put(f"{BOT}/messages/{key}", headers=bearer(admin), json=body)
        assert answer.status_code == code, answer.text
    assert (
        await client.put(f"{BOT}/messages/nope", headers=bearer(admin), json=draft("help"))
    ).status_code == 404
    assert await bot_texts.load() == bot_texts.DEFAULT


async def test_a_message_off_and_a_shared_word(client, admin):
    await password_again(client, admin)
    body = draft("receipt", on=False, words={"payment.cod": "សាច់ប្រាក់"})
    live = await client.put(f"{BOT}/messages/receipt", headers=bearer(admin), json=body)
    assert live.status_code == 200, live.text
    [receipt] = [m for m in live.json()["messages"] if m["key"] == "receipt"]
    assert receipt["on"] is False
    [cod] = [w for w in live.json()["words"] if w["key"] == "payment.cod"]
    # One change for every message that uses it.
    assert cod["text"] == "សាច់ប្រាក់"
    assert cod["used_in"] == ["New order", "Customer says paid", "Receipt"]
    texts = await bot_texts.load()
    assert texts.off == {"receipt"}


async def test_save_sends_the_draft_to_the_admins_telegram(client, admin, telegram_calls):
    sent = await client.post(
        f"{BOT}/test",
        headers=bearer(admin),
        json=draft("plan_claim", text="💰 {shop} {amount}", example=1),
    )
    assert sent.status_code == 200, sent.text
    assert sent.json() == {"sent": 1, "failed": 0, "error": None}
    [(method, payload)] = telegram_calls
    assert method == "sendMessage"
    assert payload["chat_id"] == admin["telegram_user_id"]
    assert payload["text"] == "💰 Oak Fashion $99"  # the year example

    broken = await client.post(f"{BOT}/test", headers=bearer(admin), json=draft("help", text=" "))
    assert broken.status_code == 422


async def test_the_bots_profile_changes_only_what_changed(client, admin, telegram_calls):
    now = await client.get(f"{BOT}/profile", headers=bearer(admin))
    assert now.json() == {
        "name": "Oak Order",
        "description": "Before Start",
        "short_description": "About",
        "username": "OakOrder_bot",
    }
    telegram_calls.clear()
    new = {"name": "Oak Order", "description": "ផ្ញើដំណឹង · Order news", "short_description": "About"}
    assert (await client.put(f"{BOT}/profile", headers=bearer(admin), json=new)).status_code == 403
    await password_again(client, admin)
    saved = await client.put(f"{BOT}/profile", headers=bearer(admin), json=new)
    assert saved.status_code == 200, saved.text
    assert [c for c in telegram_calls if c[0].startswith("set")] == [
        ("setMyDescription", {"description": "ផ្ញើដំណឹង · Order news"})
    ]
    line = (await client.get("/api/v1/admin/log", headers=bearer(admin))).json()[0]
    assert line["action"] == "bot_profile"
    assert line["details"] == {"description": ["Before Start", "ផ្ញើដំណឹង · Order news"]}


async def test_connect_the_bot_again(client, admin, telegram_calls, monkeypatch):
    no_url = await client.post("/api/v1/admin/system/webhook", headers=bearer(admin))
    assert no_url.status_code == 409
    monkeypatch.setattr(get_settings(), "public_api_url", "https://api.example.com")
    again = await client.post("/api/v1/admin/system/webhook", headers=bearer(admin))
    assert again.status_code == 200, again.text
    [webhook] = [payload for method, payload in telegram_calls if method == "setWebhook"]
    assert webhook["url"] == "https://api.example.com/api/v1/telegram/webhook"
