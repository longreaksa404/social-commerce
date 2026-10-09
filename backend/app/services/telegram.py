"""The platform's Telegram bot (02_TECHNICAL.md section 12): Bot API calls,
the link that connects a store to a chat, and the webhook.

The bot sends sellers their order alerts (app/services/notifications.py)
and proves sellers' phone numbers (app/services/phone_check.py). "Ask
seller" doesn't use it: the shop links straight to the seller's own
Telegram account (decided 2026-10-03).

Plain HTTPS calls to the Bot API with httpx; no bot framework needed for
sendMessage, /start and a shared contact.
"""

import base64
import hashlib
import hmac
import logging
import struct
import time
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.config import get_settings
from app.db.session import tenant_session
from app.models import Store
from app.services import phone_check

logger = logging.getLogger(__name__)

API_URL = "https://api.telegram.org"
WEBHOOK_PATH = "/api/v1/telegram/webhook"
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


def message(chat_id: int | str, text: str, button: tuple[str, str] | None = None) -> dict:
    """sendMessage parameters. `text` is Telegram HTML: escape what people typed."""
    payload: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "link_preview_options": {"is_disabled": True},
    }
    if button is not None:
        label, url = button
        payload["reply_markup"] = {"inline_keyboard": [[{"text": label, "url": url}]]}
    return payload


async def send_message(
    chat_id: int | str, text: str, button: tuple[str, str] | None = None
) -> None:
    await call("sendMessage", message(chat_id, text, button))


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
                "allowed_updates": ["message"],
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


# The bot speaks Khmer, the app's default language (decided 2026-10-09),
# with the same words as the app's Khmer (Settings → Alerts is
# ការកំណត់ → ការជូនដំណឹង, its button ភ្ជាប់ Telegram).
HELP_TEXT = (
    "បូតនេះផ្ញើដំណឹងទៅម្ចាស់ហាង រាល់ពេលមានការកុម្ម៉ង់ថ្មី។\n\n"
    "ដើម្បីភ្ជាប់ហាងរបស់អ្នក សូមបើក Oak Order ចូលទៅ ការកំណត់ → ការជូនដំណឹង "
    "ហើយចុច “ភ្ជាប់ Telegram”។"
)
EXPIRED_TEXT = (
    "តំណនេះផុតកំណត់ ឬមិនត្រឹមត្រូវ។ នៅក្នុង Oak Order សូមបើក ការកំណត់ → ការជូនដំណឹង ហើយចុច “ភ្ជាប់ Telegram” ម្ដងទៀត។"
)


# Proving a phone number (app/services/phone_check.py). The page's button
# is ផ្ទៀងផ្ទាត់ជាមួយ Telegram.
PHONE_ASK_TEXT = (
    "📱 ដើម្បីផ្ទៀងផ្ទាត់លេខទូរស័ព្ទរបស់អ្នកសម្រាប់ Oak Order "
    "សូមចុចប៊ូតុង “ចែករំលែកលេខទូរស័ព្ទ” ខាងក្រោម។\n\n"
    "សូមចុចតែពេលដែលអ្នកទើបតែចុច “ផ្ទៀងផ្ទាត់ជាមួយ Telegram” នៅក្នុង Oak Order ដោយខ្លួនឯងប៉ុណ្ណោះ។"
)
PHONE_BUTTON = "📱 ចែករំលែកលេខទូរស័ព្ទ"
PHONE_EXPIRED_TEXT = "តំណនេះផុតកំណត់ហើយ។ សូមត្រឡប់ទៅ Oak Order ហើយចុច “ផ្ទៀងផ្ទាត់ជាមួយ Telegram” ម្ដងទៀត។"
PHONE_NOT_OWN_TEXT = "សូមចុចប៊ូតុង “ចែករំលែកលេខទូរស័ព្ទ” ខាងក្រោម ដើម្បីផ្ញើលេខរបស់អ្នកផ្ទាល់។"


def phone_done_text(phone: str) -> str:
    return f"✅ បានផ្ទៀងផ្ទាត់លេខ <b>{escape(phone)}</b>។ សូមត្រឡប់ទៅ Oak Order វិញ ដើម្បីបន្ត។"


def _share_keyboard() -> dict[str, Any]:
    """A button under the chat that sends the account's own number."""
    return {
        "keyboard": [[{"text": PHONE_BUTTON, "request_contact": True}]],
        "resize_keyboard": True,
        "one_time_keyboard": True,
    }


async def handle_update(update: dict[str, Any]) -> dict[str, Any] | None:
    """Answer one webhook update. Returns the reply as a Bot API method call
    (Telegram runs it from the webhook's response, so no extra request), or
    None to stay quiet."""
    msg = update.get("message") or {}
    chat = msg.get("chat") or {}
    text = msg.get("text") or ""
    # Only private chats: in a group the bot stays silent.
    if chat.get("type") != "private" or "id" not in chat:
        return None
    if "contact" in msg:
        return await _phone_shared(chat["id"], msg)
    reply = HELP_TEXT
    command, _, argument = text.strip().partition(" ")
    argument = argument.strip()
    if command.split("@")[0] == "/start" and argument.startswith(phone_check.CODE_PREFIX):
        # In a private chat the chat's id is the user's.
        if await phone_check.opened(argument, chat["id"]):
            return _reply(chat["id"], PHONE_ASK_TEXT, _share_keyboard())
        reply = PHONE_EXPIRED_TEXT
    elif command.split("@")[0] == "/start" and argument:
        store_id = read_link_code(argument)
        reply = await _connect(store_id, chat["id"]) if store_id else EXPIRED_TEXT
    return _reply(chat["id"], reply)


def _reply(chat_id: int, text: str, keyboard: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = {"method": "sendMessage", **message(chat_id, text)}
    if keyboard is not None:
        payload["reply_markup"] = keyboard
    return payload


async def _phone_shared(chat_id: int, msg: dict[str, Any]) -> dict[str, Any]:
    """A contact sent in the chat. Only the account's own number counts:
    the share button sends that, but anyone can also attach someone
    else's contact card, which carries another user_id (or none)."""
    contact = msg.get("contact") or {}
    sender = (msg.get("from") or {}).get("id", chat_id)
    if contact.get("user_id") != sender or not contact.get("phone_number"):
        return _reply(chat_id, PHONE_NOT_OWN_TEXT, _share_keyboard())
    phone = await phone_check.shared(sender, str(contact["phone_number"]))
    text = phone_done_text(phone) if phone else PHONE_EXPIRED_TEXT
    return _reply(chat_id, text, {"remove_keyboard": True})


async def _connect(store_id: uuid.UUID, chat_id: int) -> str:
    """Send this store's alerts to this chat from now on (replacing any
    earlier chat)."""
    async with tenant_session(store_id) as db:
        store = await db.get(Store, store_id)
        if store is None:
            return EXPIRED_TEXT
        store.telegram_chat_id = str(chat_id)
        await db.commit()
        name = escape(store.name)
    return (
        f"✅ បានភ្ជាប់ជាមួយ <b>{name}</b>។\n\n"
        "អ្នកនឹងទទួលបានសារនៅទីនេះ រាល់ពេលមានការកុម្ម៉ង់ថ្មី និងពេលទំនិញជិតអស់ស្តុក។ "
        "ដើម្បីបញ្ឈប់ សូមចុច “ផ្ដាច់” នៅក្នុង ការកំណត់ → ការជូនដំណឹង។"
    )


def escape(text: str) -> str:
    """For Telegram HTML: only &, < and > need escaping."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
