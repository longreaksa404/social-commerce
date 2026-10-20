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
5. "Message on Telegram" (founder's pick 2026-10-20, send_from_seller):
   the seller's own words, above all for a phone that doesn't answer,
   with a button to reply to the shop's own Telegram or Messenger. The bot
   doesn't carry replies (no chat inside Oak Order, decided 2026-10-03).

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
from urllib.parse import quote

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.errors import AppError, NotFound
from app.db.session import tenant_session, unscoped_session
from app.models import (
    Customer,
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
# "Sent" (founder, 2026-10-20): the seller's Send to driver, the step most
# sellers take between Accept and Delivered. A courier's has the tracking
# number; the own driver's note (their name and phone) stays the seller's.
SENT_DRIVER = "📦 ការកុម្ម៉ង់របស់អ្នកនៅជាមួយអ្នកដឹកហើយ"  # Your order is with the driver
SENT_COURIER = "📦 បានផ្ញើតាម {courier}"  # Sent with <courier>
TRACKING = "លេខតាមដាន៖ {number}"  # Tracking: <number>
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
        if event is DeliveryStatus.ASSIGNED:
            return sent_line(order)
        return None
    if event is PaymentStatus.PAID and order.payment.method is not PaymentMethod.COD:
        return PAYMENT_RECEIVED
    return None


def sent_line(order: Order) -> str:
    courier = order.delivery.courier
    if not courier:
        return SENT_DRIVER
    line = SENT_COURIER.format(courier=telegram.escape(courier))
    if order.delivery.assignee_note:
        line += "\n" + TRACKING.format(number=telegram.escape(order.delivery.assignee_note))
    return line


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


# The seller's own message ("Message on Telegram")

REPLY_TO = "💬 ឆ្លើយតបទៅ {shop}"  # Reply to <shop>
# A customer typing in the bot's chat: "This chat only brings news of your
# orders and can't read replies. To answer a shop, tap the button under its
# message."
HELP_TEXT = (
    "ឆាតនេះផ្ញើតែដំណឹងអំពីការកុម្ម៉ង់របស់អ្នកប៉ុណ្ណោះ ហើយមិនអាចអានសារតបបានទេ។ "
    "ដើម្បីឆ្លើយតបហាង សូមចុចប៊ូតុងនៅក្រោមសាររបស់ហាង។"
)


def reply_button(store: Store, order: Order) -> dict[str, str] | None:
    """The shop's own Telegram with "Order #1001: " typed in, else its
    Messenger; None without either (the message then gives its phone)."""
    label = REPLY_TO.format(shop=store.name)
    if store.telegram_username:
        typed = quote(f"ការកុម្ម៉ង់ #{order.number}៖ ")
        return telegram.url_button(label, f"https://t.me/{store.telegram_username}?text={typed}")
    if store.messenger_username:
        return telegram.url_button(label, f"https://m.me/{store.messenger_username}")
    return None


def seller_message_text(store: Store, order: Order, text: str) -> str:
    line = f"💬 {telegram.escape(text)}"
    if not (store.telegram_username or store.messenger_username) and store.contact_phone:
        line += f"\n📞 {store.contact_phone}"
    return message_text(store, order, line)


async def send_from_seller(
    db: AsyncSession, store_id: uuid.UUID, order_id: uuid.UUID, text: str
) -> None:
    """Oak's bot sends the seller's `text` to the order's customer, with
    buttons to reply to the shop and to view the order. Waits for Telegram,
    so the seller knows whether it went."""
    if not get_settings().telegram_configured:
        raise AppError(503, "TELEGRAM_NOT_CONFIGURED", "Updates on Telegram are off.")
    found = await _load(db, store_id, order_id)
    if found is None:
        raise NotFound("ORDER_NOT_FOUND", "Order not found.")
    store, order = found
    chat_id = order.customer.telegram_user_id
    if chat_id is None:
        raise AppError(409, "NOT_ON_TELEGRAM", "This customer doesn't get updates on Telegram.")
    view = order_button(store, order)
    buttons = [b for b in (reply_button(store, order), view and telegram.url_button(*view)) if b]
    try:
        await telegram.send_message(chat_id, seller_message_text(store, order, text), buttons)
    except telegram.TelegramError as exc:
        if exc.chat_gone:
            # Blocked or deleted: the order stops offering this.
            order.customer.telegram_user_id = None
            await db.commit()
            raise AppError(
                409,
                "NOT_ON_TELEGRAM",
                "This customer has stopped updates on Telegram. Call them instead.",
            ) from exc
        logger.error("Telegram message to a customer failed: %s", exc)
        raise _send_failed() from exc
    except httpx.HTTPError as exc:
        logger.error("Telegram message to a customer failed: %r", exc)
        raise _send_failed() from exc


def _send_failed() -> AppError:
    return AppError(502, "TELEGRAM_FAILED", "Telegram didn't take the message. Try again.")


async def is_customer_chat(chat_id: int) -> bool:
    """A customer's chat with the bot (their updates), not a shop's alerts
    chat: someone who sells and buys gets the seller's help."""
    async with unscoped_session() as db:
        if await db.scalar(select(Store.id).where(Store.telegram_chat_id == str(chat_id))):
            return False
        customer = await db.scalar(
            select(Customer.id).where(Customer.telegram_user_id == str(chat_id)).limit(1)
        )
        return customer is not None


# The receipt (founder, 2026-10-20): the moment a customer who gets updates
# places an order (logged in with Telegram, or after "Get updates" on an
# earlier one), what they ordered and how to pay, in their chat.
RECEIVED = "✅ បានទទួលការកុម្ម៉ង់របស់អ្នក។"  # We've got your order.
TOTAL = "សរុប៖ {total} · {method}"  # Total: $24.50 · KHQR
# "Pay now so the shop can get your order ready." / "Pay in cash when you
# get your order."
PAY_NOW = "💳 សូមបង់ប្រាក់ ដើម្បីឱ្យហាងរៀបចំការកុម្ម៉ង់របស់អ្នក។"
PAY_CASH = "💵 បង់ជាសាច់ប្រាក់ពេលទទួលទំនិញ។"
PAY = "💳 បង់ប្រាក់"  # Pay
MAX_LINES_SHOWN = 5


def receipt_text(store: Store, order: Order) -> str:
    # Imported here: notifications imports this module.
    from app.services import notifications

    money = lambda amount: notifications.format_money(amount, order.currency)  # noqa: E731
    lines = [RECEIVED]
    for item in order.items[:MAX_LINES_SHOWN]:
        name = item.product_name_snapshot
        if item.variant_name_snapshot:
            name += f" ({item.variant_name_snapshot})"
        lines.append(f"{item.quantity} × {telegram.escape(name)}")
    if len(order.items) > MAX_LINES_SHOWN:
        lines.append(f"+{len(order.items) - MAX_LINES_SHOWN} …")
    method = notifications.PAYMENT_LABELS[order.payment.method]
    lines.append(f"<b>{TOTAL.format(total=money(order.total), method=method)}</b>")
    lines.append("")
    lines.append(PAY_CASH if order.payment.method is PaymentMethod.COD else PAY_NOW)
    lines.append(headline(order))
    return message_text(store, order, "\n".join(lines))


async def notify_placed(store_id: uuid.UUID, order_id: uuid.UUID) -> None:
    """After a customer's order (a BackgroundTask): the receipt, if they
    get updates on Telegram. A failure is logged and never affects it."""
    if not get_settings().telegram_configured:
        return
    async with tenant_session(store_id) as db:
        store = await db.get(Store, store_id)
        order = await db.scalar(
            select(Order)
            .where(Order.id == order_id, Order.store_id == store_id)
            .options(
                selectinload(Order.customer),
                selectinload(Order.items),
                selectinload(Order.payment),
                selectinload(Order.delivery),
            )
        )
        if store is None or order is None or order.customer.telegram_user_id is None:
            return
        view = order_button(store, order)
        if view and order.payment.method is not PaymentMethod.COD:
            view = (PAY, view[1])
        try:
            await telegram.send_message(
                order.customer.telegram_user_id, receipt_text(store, order), view
            )
        except telegram.TelegramError as exc:
            if exc.chat_gone:
                order.customer.telegram_user_id = None
                await db.commit()
            else:
                logger.error("Telegram receipt to a customer failed: %s", exc)
        except httpx.HTTPError as exc:
            logger.error("Telegram receipt to a customer failed: %r", exc)
