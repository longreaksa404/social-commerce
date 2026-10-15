"""Telegram updates for customers (founder's pick 2026-10-15): "Get updates
on Telegram" on the order page. It also proves the customer's phone: the
seller sees "Phone confirmed in Telegram" on the order, or the Telegram
number when it's another one (people often have two SIMs).

1. The order page, which has the order's link and phone, asks for a link
   (link): t.me/<bot>?start=o<code>. The code is signed rather than stored:
   store id + order id + expiry + HMAC.
2. /start o<code> (opened): the bot remembers who opened it in a
   phone_check row whose code is the start code, and shows the same
   "Share my phone number" button as a seller's phone check.
3. The shared number (phone_check.shared, then confirmed): the chat and the
   number go on the customer's row in that shop, so their later orders
   there get news too.
4. The seller's taps that a customer would want to hear about send a
   message after the response (notify). A blocked bot clears the chat.

Customers hear in Khmer, the bot's language, in the order page's words
(frontend/src/i18n/messages/order.ts).
"""

import base64
import hashlib
import hmac
import logging
import struct
import time
import uuid
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.db.session import tenant_session, unscoped_session
from app.models import (
    DeliveryMethod,
    DeliveryStatus,
    Order,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    PhoneCheck,
    Store,
)
from app.services import telegram

logger = logging.getLogger(__name__)

# Start codes: "o" + 59 characters (Telegram allows 64). A store's
# "Connect Telegram" code is 43 and a seller's phone check starts "phone_".
CODE_PREFIX = "o"
# Time to open Telegram after tapping the button, then to share the number.
LINK_TTL_SECONDS = 30 * 60
_SIGNATURE_BYTES = 8
_BODY_BYTES = 16 + 16 + 4


def _key() -> bytes:
    return hashlib.sha256(b"telegram-order:" + get_settings().jwt_secret.encode()).digest()


def make_code(
    store_id: uuid.UUID, order_id: uuid.UUID, now: float | None = None
) -> tuple[str, datetime]:
    expires = int((now if now is not None else time.time()) + LINK_TTL_SECONDS)
    body = store_id.bytes + order_id.bytes + struct.pack(">I", expires)
    signature = hmac.new(_key(), body, hashlib.sha256).digest()[:_SIGNATURE_BYTES]
    code = base64.urlsafe_b64encode(body + signature).rstrip(b"=").decode()
    return CODE_PREFIX + code, datetime.fromtimestamp(expires, UTC)


def read_code(
    code: str, now: float | None = None, *, check_expiry: bool = True
) -> tuple[uuid.UUID, uuid.UUID] | None:
    """The store and order the code was made for, or None if it isn't one
    (forged, someone else's kind, or expired when `check_expiry`)."""
    if not code.startswith(CODE_PREFIX):
        return None
    raw_code = code[len(CODE_PREFIX) :]
    try:
        raw = base64.urlsafe_b64decode(raw_code + "=" * (-len(raw_code) % 4))
    except ValueError:
        return None
    if len(raw) != _BODY_BYTES + _SIGNATURE_BYTES:
        return None
    body, signature = raw[:_BODY_BYTES], raw[_BODY_BYTES:]
    expected = hmac.new(_key(), body, hashlib.sha256).digest()[:_SIGNATURE_BYTES]
    if not hmac.compare_digest(signature, expected):
        return None
    (expires,) = struct.unpack(">I", body[32:])
    if check_expiry and expires < (now if now is not None else time.time()):
        return None
    return uuid.UUID(bytes=body[:16]), uuid.UUID(bytes=body[16:32])


def link(store_id: uuid.UUID, order_id: uuid.UUID) -> tuple[str, datetime]:
    code, expires_at = make_code(store_id, order_id)
    return f"https://t.me/{get_settings().telegram_bot_username}?start={code}", expires_at


# What the customer reads. The order page's headline for each status
# (order.ts `headline`, `pickupStep`).
HEADLINES = {
    OrderStatus.PENDING: "⏳ កំពុងរង់ចាំអ្នកលក់បញ្ជាក់",
    OrderStatus.ACCEPTED: "✅ អ្នកលក់បានបញ្ជាក់",
    OrderStatus.PROCESSING: "🧺 កំពុងរៀបចំ",
    OrderStatus.READY: "📦 វេចខ្ចប់រួចរាល់",
    OrderStatus.SHIPPED: "🚚 កំពុងដឹកមករកអ្នក",
    OrderStatus.DELIVERED: "🎉 បានដល់ដៃ",
    OrderStatus.COMPLETED: "🎉 បានបញ្ចប់",
    OrderStatus.REJECTED: "❌ អ្នកលក់មិនអាចទទួលការកុម្ម៉ង់នេះបានទេ",
    OrderStatus.CANCELLED: "❌ ការកុម្ម៉ង់នេះត្រូវបានលុបចោល",
}
PICKUP_HEADLINES = {
    OrderStatus.READY: "🏪 រួចរាល់ សូមមកយក",
    OrderStatus.SHIPPED: "🤝 បានប្រគល់ជូន",
    OrderStatus.DELIVERED: "🎉 បានមកយកហើយ",
}
# "Couldn't deliver. The seller will contact you to try again."
DELIVERY_FAILED = "⚠️ ដឹកមិនបានសម្រេច។ អ្នកលក់នឹងទាក់ទងអ្នក ដើម្បីដឹកម្ដងទៀត។"
# "The seller has received your payment."
PAYMENT_RECEIVED = "💰 អ្នកលក់បានទទួលការបង់ប្រាក់របស់អ្នកហើយ"
VIEW_ORDER = "មើលការកុម្ម៉ង់"  # View order

ASK_TEXT = (
    # "To get news of this order here, tap Share my phone number below.
    # <shop> will see the number, to reach you."
    "📱 ដើម្បីទទួលដំណឹងអំពីការកុម្ម៉ង់នេះនៅទីនេះ សូមចុចប៊ូតុង “ចែករំលែកលេខទូរស័ព្ទ” ខាងក្រោម។\n\n"
    "<b>{shop}</b> នឹងឃើញលេខនេះ ដើម្បីទាក់ទងអ្នក។"
)
# "This link has expired. Go back to your order page and tap Get updates
# on Telegram again." The page's button is ទទួលដំណឹងតាម Telegram.
EXPIRED_TEXT = "តំណនេះផុតកំណត់ហើយ។ សូមត្រឡប់ទៅទំព័រការកុម្ម៉ង់របស់អ្នក ហើយចុច “ទទួលដំណឹងតាម Telegram” ម្ដងទៀត។"


def headline(order: Order, status: OrderStatus | None = None) -> str:
    status = status or order.status
    if order.delivery_method is DeliveryMethod.PICKUP and status in PICKUP_HEADLINES:
        return PICKUP_HEADLINES[status]
    return HEADLINES[status]


Event = OrderStatus | DeliveryStatus | PaymentStatus


def news(order: Order, event: Event) -> str | None:
    """What to tell the customer now that the seller has moved `event`'s
    state machine there, or None if it's nothing new to them. The three
    stay separate (CLAUDE.md hard rule 2); this only avoids saying "on the
    way" or "delivered" twice when the seller records it in both."""
    delivery = order.delivery.status
    if isinstance(event, OrderStatus):
        if event in (OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.COMPLETED):
            # Completing needs the delivery delivered, which they've heard.
            return None
        if event is OrderStatus.SHIPPED and delivery in (
            DeliveryStatus.IN_TRANSIT,
            DeliveryStatus.DELIVERED,
        ):
            return None
        if event is OrderStatus.DELIVERED and delivery is DeliveryStatus.DELIVERED:
            return None
        return headline(order, event)
    if isinstance(event, DeliveryStatus):
        if event is DeliveryStatus.IN_TRANSIT:
            if order.status in (OrderStatus.SHIPPED, OrderStatus.DELIVERED):
                return None
            return headline(order, OrderStatus.SHIPPED)
        if event is DeliveryStatus.DELIVERED:
            if order.status in (OrderStatus.DELIVERED, OrderStatus.COMPLETED):
                return None
            return headline(order, OrderStatus.DELIVERED)
        if event is DeliveryStatus.FAILED:
            return DELIVERY_FAILED
        return None
    if event is PaymentStatus.PAID and order.payment.method is not PaymentMethod.COD:
        return PAYMENT_RECEIVED
    return None


def message_text(store: Store, order: Order, line: str) -> str:
    # "<shop> · Order #1005"
    return f"<b>{telegram.escape(store.name)}</b> · ការកុម្ម៉ង់ #{order.number}\n{line}"


def order_button(store: Store, order: Order) -> tuple[str, str] | None:
    """The customer's order page. Telegram refuses buttons to non-https
    addresses such as localhost, so none then."""
    app_url = get_settings().public_app_url.rstrip("/")
    if not app_url.startswith("https://"):
        return None
    return VIEW_ORDER, f"{app_url}/shop/{store.slug}/order/{order.id}"


async def _load(db, store_id: uuid.UUID, order_id: uuid.UUID) -> tuple[Store, Order] | None:
    order = await db.scalar(
        select(Order)
        .where(Order.id == order_id, Order.store_id == store_id)
        .options(
            selectinload(Order.customer),
            selectinload(Order.delivery),
            selectinload(Order.payment),
        )
    )
    store = await db.get(Store, store_id)
    if order is None or store is None:
        return None
    return store, order


# The bot's side. Each runs in its own session: the webhook has none.


async def opened(code: str, telegram_user_id: int) -> str | None:
    """/start o<code>: remember who opened it, and the text asking them to
    share their number. None if the link has expired or the order is gone."""
    ref = read_code(code)
    if ref is None:
        return None
    store_id, order_id = ref
    async with tenant_session(store_id) as db:
        found = await _load(db, store_id, order_id)
        if found is None:
            return None
        shop = found[0].name
    now = datetime.now(UTC)
    async with unscoped_session() as db:
        await db.execute(delete(PhoneCheck).where(PhoneCheck.expires_at < now))
        check = await db.scalar(select(PhoneCheck).where(PhoneCheck.code == code))
        if check is None:
            check = PhoneCheck(code=code)
            db.add(check)
        # Opened again (or by another account): the latest one shares.
        check.telegram_user_id = telegram_user_id
        check.expires_at = now + timedelta(seconds=LINK_TTL_SECONDS)
        await db.commit()
    return ASK_TEXT.format(shop=telegram.escape(shop))


async def confirmed(check: PhoneCheck) -> str:
    """The customer shared their number: their chat and number go on their
    customer row in that shop. The check is used up. Returns the reply."""
    ref = read_code(check.code, check_expiry=False)
    async with unscoped_session() as db:
        await db.execute(delete(PhoneCheck).where(PhoneCheck.id == check.id))
        await db.commit()
    if ref is None or check.telegram_user_id is None:
        return EXPIRED_TEXT
    store_id, order_id = ref
    async with tenant_session(store_id) as db:
        found = await _load(db, store_id, order_id)
        if found is None:
            return EXPIRED_TEXT
        store, order = found
        order.customer.telegram_user_id = str(check.telegram_user_id)
        order.customer.telegram_phone = check.phone
        await db.commit()
        shop = telegram.escape(store.name)
        return "\n".join(
            [
                # "Done. You'll get news of your orders from <shop> here."
                f"✅ រួចរាល់។ អ្នកនឹងទទួលដំណឹងអំពីការកុម្ម៉ង់របស់អ្នកពី <b>{shop}</b> នៅទីនេះ។",
                "",
                # "Order #1005 now: ..."
                f"ការកុម្ម៉ង់ #{order.number} ឥឡូវ: {headline(order)}",
            ]
        )


# The seller's side


async def notify(store_id: uuid.UUID, order_id: uuid.UUID, event: Event) -> None:
    """After the seller's tap (a BackgroundTask): tell the customer, if
    they get updates and it's news to them. A failure is logged and never
    affects the order."""
    if not get_settings().telegram_configured:
        return
    async with tenant_session(store_id) as db:
        found = await _load(db, store_id, order_id)
        if found is None:
            return
        store, order = found
        chat_id = order.customer.telegram_user_id
        line = news(order, event)
        if chat_id is None or line is None:
            return
        try:
            await telegram.send_message(
                chat_id, message_text(store, order, line), order_button(store, order)
            )
        except telegram.TelegramError as exc:
            if exc.chat_gone:
                # Blocked or deleted: the order page offers the button again.
                order.customer.telegram_user_id = None
                await db.commit()
            else:
                logger.error("Telegram update to a customer failed: %s", exc)
        except httpx.HTTPError as exc:
            logger.error("Telegram update to a customer failed: %r", exc)
