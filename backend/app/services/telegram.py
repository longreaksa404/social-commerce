"""The platform's Telegram bot (02_TECHNICAL.md section 12): Bot API calls,
the link that connects a store to a chat, and the webhook.

The bot sends sellers their order alerts (app/services/notifications.py),
with a "Received, mark paid" button on "says paid" (founder, 2026-10-20),
proves sellers' phone numbers (app/services/phone_check.py), and sends
customers who ask for it their orders' news, proving their number too
(app/services/customer_updates.py). "Ask
seller" doesn't use it: the shop links straight to the seller's own
Telegram account (decided 2026-10-03).

Plain HTTPS calls to the Bot API with httpx; no bot framework needed for
sendMessage, /start, a shared contact and a button tap. What it says is
in app/services/bot_texts.py, which the admin can change.
"""

import base64
import hashlib
import hmac
import json
import logging
import struct
import time
import uuid
from collections import deque
from datetime import UTC, datetime
from typing import Any
from urllib.parse import parse_qsl

import httpx

from app.core.config import get_settings
from app.db.session import tenant_session
from app.models import Store
from app.services import bot_texts, customer_login, customer_updates, phone_check

logger = logging.getLogger(__name__)

API_URL = "https://api.telegram.org"
WEBHOOK_PATH = "/api/v1/telegram/webhook"
# Messages, and taps on the buttons under the bot's own messages.
ALLOWED_UPDATES = ["message", "callback_query"]
# How long a "Connect Telegram" link works after Settings shows it.
LINK_TTL_SECONDS = 30 * 60


class TelegramError(Exception):
    def __init__(self, status_code: int, description: str) -> None:
        super().__init__(f"Telegram {status_code}: {description}")
        self.status_code = status_code
        self.description = description

    @property
    def chat_gone(self) -> bool:
        """The seller blocked the bot or deleted the chat: stop sending."""
        return self.status_code in (400, 403) and (
            self.status_code == 403 or "chat not found" in self.description.lower()
        )


async def call(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    token = get_settings().telegram_bot_token
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(f"{API_URL}/bot{token}/{method}", json=payload)
    body = response.json()
    if not body.get("ok"):
        raise TelegramError(
            body.get("error_code", response.status_code), body.get("description", "")
        )
    return body["result"]


# Buttons under a message: one link (label, url), or a row of buttons made
# with url_button / tap_button.
Buttons = tuple[str, str] | list[dict[str, str]] | None


def url_button(label: str, url: str) -> dict[str, str]:
    return {"text": label, "url": url}


def tap_button(label: str, data: str) -> dict[str, str]:
    """A button the bot answers (a callback_query with `data`, at most 64
    bytes). Anyone who has the message can send any `data`: check it."""
    return {"text": label, "callback_data": data}


def keyboard(buttons: Buttons) -> dict[str, Any] | None:
    if isinstance(buttons, tuple):
        buttons = [url_button(*buttons)]
    return {"inline_keyboard": [buttons]} if buttons else None


def message(chat_id: int | str, text: str, button: Buttons = None) -> dict:
    """sendMessage parameters. `text` is Telegram HTML: escape what people typed."""
    payload: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "link_preview_options": {"is_disabled": True},
    }
    if (markup := keyboard(button)) is not None:
        payload["reply_markup"] = markup
    return payload


# When Telegram refused a message in the admin's words and the code's went
# instead (the System page counts them; kept in memory like monitor.py).
_refused: deque[float] = deque(maxlen=1000)


async def send_message(chat_id: int | str, text: str, button: Buttons = None) -> None:
    """A message from bot_texts that Telegram refuses (400) in the
    admin's words goes again in the code's (02_TECHNICAL.md §12.7)."""
    try:
        await call("sendMessage", message(chat_id, text, button))
    except TelegramError as exc:
        original = getattr(text, "original", None)
        if exc.status_code != 400 or exc.chat_gone or not original:
            raise
        logger.error("Telegram refused the admin's words, sending the original: %s", exc)
        _refused.append(time.time())
        await call("sendMessage", message(chat_id, original, button))


def refused_since(since: float) -> int:
    """How many messages went in the code's words since `since`."""
    return sum(at >= since for at in _refused)


async def register_webhook() -> None:
    """Point the bot at this API. Run at startup when PUBLIC_API_URL is set;
    calling it again with the same values is harmless."""
    settings = get_settings()
    try:
        await call(
            "setWebhook",
            {
                "url": settings.public_api_url.rstrip("/") + WEBHOOK_PATH,
                "secret_token": settings.telegram_webhook_secret,
                "allowed_updates": ALLOWED_UPDATES,
            },
        )
    except (TelegramError, httpx.HTTPError):
        logger.exception("Registering the Telegram webhook failed")


# Connecting a store: Settings shows t.me/<bot>?start=<code>. The code is
# signed rather than stored: store id + expiry + HMAC, 43 characters of
# A-Z a-z 0-9 _ - (Telegram allows up to 64). Anyone holding the link could
# connect their own chat to the store, so it expires and is shown only to
# the logged-in seller.


def _link_key() -> bytes:
    return hashlib.sha256(b"telegram-link:" + get_settings().jwt_secret.encode()).digest()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def make_link_code(store_id: uuid.UUID, now: float | None = None) -> tuple[str, datetime]:
    expires = int((now if now is not None else time.time()) + LINK_TTL_SECONDS)
    body = store_id.bytes + struct.pack(">I", expires)
    signature = hmac.new(_link_key(), body, hashlib.sha256).digest()[:12]
    return _b64(body + signature), datetime.fromtimestamp(expires, UTC)


def read_link_code(code: str, now: float | None = None) -> uuid.UUID | None:
    """The store the code was made for, or None if it's forged or expired."""
    try:
        raw = base64.urlsafe_b64decode(code + "=" * (-len(code) % 4))
    except ValueError:
        return None
    if len(raw) != 32:
        return None
    body, signature = raw[:20], raw[20:]
    expected = hmac.new(_link_key(), body, hashlib.sha256).digest()[:12]
    if not hmac.compare_digest(signature, expected):
        return None
    (expires,) = struct.unpack(">I", body[16:])
    if expires < (now if now is not None else time.time()):
        return None
    return uuid.UUID(bytes=body[:16])


def connect_link(store_id: uuid.UUID) -> tuple[str, datetime]:
    code, expires_at = make_link_code(store_id)
    return f"https://t.me/{get_settings().telegram_bot_username}?start={code}", expires_at


def _share_keyboard(texts: bot_texts.Texts) -> dict[str, Any]:
    """A button under the chat that sends the account's own number."""
    return {
        "keyboard": [[{"text": texts.plain("button.share_phone"), "request_contact": True}]],
        "resize_keyboard": True,
        "one_time_keyboard": True,
    }


async def handle_update(update: dict[str, Any]) -> dict[str, Any] | None:
    """Answer one webhook update. Returns the reply as a Bot API method call
    (Telegram runs it from the webhook's response, so no extra request), or
    None to stay quiet."""
    if "callback_query" in update:
        # A tap on a seller alert's button. Imported here: notifications
        # imports this module.
        from app.services import notifications

        return await notifications.button_tapped(update["callback_query"])
    msg = update.get("message") or {}
    chat = msg.get("chat") or {}
    text = msg.get("text") or ""
    # Only private chats: in a group the bot stays silent.
    if chat.get("type") != "private" or "id" not in chat:
        return None
    texts = await bot_texts.load()
    if "contact" in msg:
        return await _phone_shared(chat["id"], msg, texts)
    reply = texts.html("help")
    command, _, argument = text.strip().partition(" ")
    argument = argument.strip()
    if command.split("@")[0] == "/start" and argument.startswith(phone_check.CODE_PREFIX):
        # In a private chat the chat's id is the user's.
        if await phone_check.opened(argument, chat["id"]):
            return _reply(chat["id"], texts.html("signup_ask"), _share_keyboard(texts))
        reply = texts.html("signup_expired")
    elif command.split("@")[0] == "/start" and argument.startswith(customer_login.CODE_PREFIX):
        # A customer's "Continue with Telegram".
        shop = await customer_login.opened(argument, chat["id"])
        if shop is not None:
            ask = texts.html("login_ask", shop=shop)
            return _reply(chat["id"], ask, _share_keyboard(texts))
        reply = texts.html("login_expired")
    elif command.split("@")[0] == "/start" and customer_updates.read_code(
        argument, check_expiry=False
    ):
        # A customer's "Get updates on Telegram".
        shop = await customer_updates.opened(argument, chat["id"])
        if shop is not None:
            ask = texts.html("updates_ask", shop=shop)
            return _reply(chat["id"], ask, _share_keyboard(texts))
        reply = texts.html("updates_expired")
    elif command.split("@")[0] == "/start" and argument:
        store_id = read_link_code(argument)
        reply = await _connect(store_id, chat["id"], texts) if store_id else None
        reply = reply or texts.html("link_expired")
    elif not text.startswith("/") and await customer_updates.is_customer_chat(chat["id"]):
        # A customer answering a shop's message here: the bot can't pass it on.
        reply = texts.html("customer_help")
    return _reply(chat["id"], reply)


def _reply(chat_id: int, text: str, keyboard: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = {"method": "sendMessage", **message(chat_id, text)}
    if keyboard is not None:
        payload["reply_markup"] = keyboard
    return payload


async def _phone_shared(
    chat_id: int, msg: dict[str, Any], texts: bot_texts.Texts
) -> dict[str, Any]:
    """A contact sent in the chat. Only the account's own number counts:
    the share button sends that, but anyone can also attach someone
    else's contact card, which carries another user_id (or none)."""
    contact = msg.get("contact") or {}
    sender = (msg.get("from") or {}).get("id", chat_id)
    if contact.get("user_id") != sender or not contact.get("phone_number"):
        return _reply(chat_id, texts.html("not_own_phone"), _share_keyboard(texts))
    # The account's own name (Telegram always has a first name).
    name = " ".join(filter(None, (contact.get("first_name"), contact.get("last_name"))))
    check = await phone_check.shared(sender, str(contact["phone_number"]), name)
    if check is None:
        text = texts.html("signup_expired")
    elif check.code.startswith(phone_check.CODE_PREFIX):
        text = texts.html("signup_done", phone=check.phone)
    elif check.code.startswith(customer_login.CODE_PREFIX):
        # "Done", then "Open checkout": all but the last sent now, in order;
        # the last goes back in the webhook's answer.
        *first, last = await customer_login.finished(check, texts)
        for answer in first:
            try:
                await call(answer.pop("method"), answer)
            except (TelegramError, httpx.HTTPError) as exc:
                logger.warning("A login answer failed: %r", exc)
        return last
    else:
        text = await customer_updates.confirmed(check, texts)
    return _reply(chat_id, text, {"remove_keyboard": True})


async def _connect(store_id: uuid.UUID, chat_id: int, texts: bot_texts.Texts) -> str | None:
    """Send this store's alerts to this chat from now on (replacing any
    earlier chat). None if the store is gone."""
    async with tenant_session(store_id) as db:
        store = await db.get(Store, store_id)
        if store is None:
            return None
        store.telegram_chat_id = str(chat_id)
        await db.commit()
        return texts.html("connected", shop=store.name)


# The button beside the message box, like a shop's own bot's "Go Shopping"
# (founder, 2026-10-20). Oak's bot serves every shop, so Telegram's
# per-chat menu button opens the shop each customer last logged in at, or
# asked updates from.
SHOP_BUTTON_LENGTH = 24


def shop_button(store: Store) -> dict[str, Any] | None:
    """setChatMenuButton's menu_button for this shop, or None without an
    https address (Telegram opens only those)."""
    app_url = get_settings().public_app_url.rstrip("/")
    if not app_url.startswith("https://"):
        return None
    name = (
        store.name
        if len(store.name) <= SHOP_BUTTON_LENGTH
        else store.name[: SHOP_BUTTON_LENGTH - 1] + "…"
    )
    return {
        "type": "web_app",
        "text": f"🛍 {name}",
        "web_app": {"url": f"{app_url}/shop/{store.slug}"},
    }


async def set_shop_button(chat_id: int | str, store: Store) -> None:
    """Point this customer's button at this shop. A failure is logged and
    changes nothing else."""
    button = shop_button(store)
    if button is None:
        return
    try:
        await call("setChatMenuButton", {"chat_id": chat_id, "menu_button": button})
    except (TelegramError, httpx.HTTPError) as exc:
        logger.warning("Setting a customer's shop button failed: %r", exc)


# Mini app (founder, 2026-10-20: customers log in with Telegram and shop
# inside it). Telegram hands the page `initData`, signed with the bot's
# token, saying who opened it: the server checks it, never the page.
MINI_APP_MAX_AGE = 24 * 60 * 60


def read_mini_app_data(
    init_data: str, now: float | None = None, max_age: int = MINI_APP_MAX_AGE
) -> dict[str, Any] | None:
    """The Telegram user who opened the mini app, from its `initData`, or
    None if it isn't Telegram's (wrong signature), or older than `max_age`
    seconds. Telegram's rule: HMAC-SHA256 of the other fields, sorted, one
    "key=value" a line, keyed by HMAC-SHA256("WebAppData", bot token)."""
    try:
        fields = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=True))
    except ValueError:
        return None
    received = fields.pop("hash", "")
    check = "\n".join(f"{key}={value}" for key, value in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", get_settings().telegram_bot_token.encode(), hashlib.sha256)
    expected = hmac.new(secret.digest(), check.encode(), hashlib.sha256).hexdigest()
    if not received or not hmac.compare_digest(received, expected):
        return None
    try:
        signed_at = int(fields.get("auth_date", "0"))
        user = json.loads(fields.get("user", ""))
    except ValueError:
        return None
    if not isinstance(user, dict) or "id" not in user:
        return None
    if signed_at + max_age < (now if now is not None else time.time()):
        return None
    return {**user, "auth_date": signed_at}


escape = bot_texts.escape
