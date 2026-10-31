"""Seller notifications (02_TECHNICAL.md section 12.1): the dashboard's
notification list (web) and alerts on Telegram.

Only for things the seller didn't do themselves (decided 2026-10-03): a new
order, and stock running low or out because of one. Cancelling, recording
a payment and moving a delivery are all the seller's own taps, so they send
nothing.

The web ones are saved with the order, in its transaction, so the list
never misses an order or shows one that wasn't placed. The Telegram ones
are sent after the response (FastAPI BackgroundTasks); a failure is logged
and never affects the order.
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any

import httpx
from sqlalchemy import ColumnElement, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.db.session import tenant_session, unscoped_session
from app.models import (
    Currency,
    DeliveryMethod,
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
    Order,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    Store,
)
from app.schemas.notification import NotificationListOut, NotificationOut
from app.services import bot_texts, customer_updates, telegram
from app.services import payment as payment_service
from app.services.bot_texts import word

logger = logging.getLogger(__name__)

# A new shop's low-stock alert level (store.low_stock_alert, Settings →
# Alerts); also where the shop starts saying "Only N left" to customers.
DEFAULT_LOW_STOCK = 5

# Telegram alerts are in the bot's words (app/services/bot_texts.py,
# Khmer). The web notifications are saved as data and worded by the app
# in the seller's chosen language.
PAYMENT_WORDS = {
    PaymentMethod.COD: "payment.cod",
    PaymentMethod.BANK_TRANSFER: "payment.bank_transfer",
    PaymentMethod.KHQR: "payment.khqr",
}


def payment_word(method: PaymentMethod) -> bot_texts.WordRef:
    return word(PAYMENT_WORDS[method])


@dataclass(frozen=True)
class StockAlert:
    product_id: uuid.UUID
    name: str  # "Red T-shirt (XL)"
    left: int


def stock_alert(
    product_id: uuid.UUID, name: str, before: int, after: int, level: int = DEFAULT_LOW_STOCK
) -> StockAlert | None:
    """An alert when an order takes stock to the shop's `level` or below,
    and again when it sells out; not for every sale below the line."""
    if after <= 0 < before or after <= level < before:
        return StockAlert(product_id, name, max(after, 0))
    return None


def _stock_payload(alerts: list[StockAlert]) -> dict[str, Any]:
    return {
        "items": [{"product_id": str(a.product_id), "name": a.name, "left": a.left} for a in alerts]
    }


# Web: the dashboard's notification list


def _order_payload(order: Order) -> dict[str, Any]:
    """The order as NotificationOut has it, as it is now."""
    return {
        "order": {
            "id": str(order.id),
            "number": order.number,
            "customer_name": order.customer.name,
            "item_count": sum(item.quantity for item in order.items),
            "total": str(order.total),
            "currency": order.currency.value,
            "accepted_automatically": order.status is OrderStatus.ACCEPTED,
        }
    }


def web_notifications(
    order: Order, alerts: list[StockAlert], *, new_order: bool = True
) -> list[NotificationLog]:
    """The dashboard's notifications for a new order, to save with it
    (whether or not Telegram is connected). The order as placed, as
    NotificationOut has it; opening it shows where it is now. Without
    `new_order` (an order the seller added), only the low-stock one."""
    rows = [_log(order.store_id, NotificationChannel.WEB, "new_order", _order_payload(order))][
        : 1 if new_order else 0
    ]
    if alerts:
        rows.append(
            _log(order.store_id, NotificationChannel.WEB, "low_stock", _stock_payload(alerts))
        )
    return rows


# "I've paid" from the customer's order page (founder's pick 6B,
# 2026-10-09): a bell row, a Telegram alert, and "Customer says paid" on
# the order until the seller checks. The payment's status doesn't change.
PAYMENT_CLAIMED = "payment_claimed"
NEW_ORDER = "new_order"


def payment_claimed_notification(order: Order) -> NotificationLog:
    return _log(order.store_id, NotificationChannel.WEB, PAYMENT_CLAIMED, _order_payload(order))


async def last_payment_claim(
    db: AsyncSession, store_id: uuid.UUID, order_id: uuid.UUID
) -> datetime | None:
    """When the customer last said they'd paid this order, if ever."""
    return await db.scalar(
        select(func.max(NotificationLog.sent_at)).where(
            *_web(store_id),
            NotificationLog.event_type == PAYMENT_CLAIMED,
            NotificationLog.payload["order"]["id"].astext == str(order_id),
        )
    )


async def last_payment_claims(
    db: AsyncSession, store_id: uuid.UUID, order_ids: list[uuid.UUID]
) -> dict[uuid.UUID, datetime]:
    """last_payment_claim for many orders in one query (the order list)."""
    if not order_ids:
        return {}
    order_id = NotificationLog.payload["order"]["id"].astext
    rows = await db.execute(
        select(order_id, func.max(NotificationLog.sent_at))
        .where(
            *_web(store_id),
            NotificationLog.event_type == PAYMENT_CLAIMED,
            order_id.in_([str(i) for i in order_ids]),
        )
        .group_by(order_id)
    )
    return {uuid.UUID(oid): at for oid, at in rows.all()}


def _web(store_id: uuid.UUID) -> tuple[ColumnElement[bool], ...]:
    """The store's dashboard notifications (not its Telegram log)."""
    return NotificationLog.store_id == store_id, NotificationLog.channel == NotificationChannel.WEB


async def list_web(
    db: AsyncSession, store_id: uuid.UUID, *, limit: int = 20, offset: int = 0
) -> NotificationListOut:
    """Newest first. Listing doesn't mark them read; mark_read does."""
    rows = list(
        await db.scalars(
            select(NotificationLog)
            .where(*_web(store_id))
            .order_by(
                NotificationLog.sent_at.desc(),
                # An order and its low-stock alert are saved in one
                # transaction, so they share sent_at: the order first.
                NotificationLog.event_type.desc(),
                NotificationLog.id,
            )
            .limit(limit + 1)  # one extra row tells whether there are more
            .offset(offset)
        )
    )
    return NotificationListOut(
        notifications=[
            NotificationOut(
                id=row.id,
                event_type=row.event_type,
                created_at=row.sent_at,
                read=row.read_at is not None,
                **row.payload,
            )
            for row in rows[:limit]
        ],
        has_more=len(rows) > limit,
        unread=await unread_count(db, store_id),
    )


async def unread_count(db: AsyncSession, store_id: uuid.UUID) -> int:
    """The number on the bell: what the Orders tab can't show ("says
    paid", running low, sold out). New orders stay in the bell's list but
    aren't counted: the New tab counts them, so handling orders there no
    longer leaves the bell high (UX check #20, 2026-10-17)."""
    count = await db.scalar(
        select(func.count())
        .select_from(NotificationLog)
        .where(
            *_web(store_id),
            NotificationLog.read_at.is_(None),
            NotificationLog.event_type != NEW_ORDER,
        )
    )
    return count or 0


async def mark_read(db: AsyncSession, store_id: uuid.UUID, up_to: datetime) -> int:
    """Marks read the notifications up to the newest one the seller was
    shown (not one that arrived since); returns how many are still unread."""
    await db.execute(
        update(NotificationLog)
        .where(
            *_web(store_id),
            NotificationLog.read_at.is_(None),
            NotificationLog.sent_at <= up_to,
        )
        .values(read_at=func.now())
        .execution_options(synchronize_session=False)
    )
    unread = await unread_count(db, store_id)
    await db.commit()
    return unread


# Telegram


def format_money(amount: Decimal, currency: Currency) -> str:
    """Like the web app: "$12.50", "50,000៛"."""
    if currency is Currency.KHR:
        return f"{amount:,.0f}៛"
    return f"${amount:,.2f}"


def new_order_text(order: Order, texts: bot_texts.Texts) -> bot_texts.Rendered:
    money = lambda amount: format_money(amount, order.currency)  # noqa: E731
    items = []
    for item in order.items:
        name = item.product_name_snapshot
        if item.variant_name_snapshot:
            name += f" ({item.variant_name_snapshot})"
        items.append(f"{item.quantity} × {name}: {money(item.line_total)}")
    pickup = order.delivery_method is DeliveryMethod.PICKUP
    if pickup:
        delivery = word("delivery.pickup")
    elif order.delivery.courier:
        delivery = word("delivery.courier", courier=order.delivery.courier)
    else:
        delivery = word("delivery.own")
    if order.delivery_address:
        address: bot_texts.Value = order.delivery_address
    elif order.delivery_lat is not None:
        address = word("location_pinned")  # open the order for the map
    else:
        address = ""
    if pickup:
        fee: bot_texts.Value = ""
    else:
        fee = money(order.delivery_fee) if order.delivery_fee else word("free")
    return texts.html(
        "new_order",
        number=order.number,
        auto=word("auto_accepted") if order.status is OrderStatus.ACCEPTED else "",
        items="\n".join(items),
        discount=money(order.discount) if order.discount else "",
        delivery_fee=fee,
        total=money(order.total),
        payment=payment_word(order.payment.method),
        delivery=delivery,
        customer=order.customer.name,
        phone=order.customer.phone,
        address=address,
        notes=order.notes or "",
    )


def low_stock_text(alerts: list[StockAlert], texts: bot_texts.Texts) -> bot_texts.Rendered:
    rows = [
        [
            alert.name,
            ": ",
            word("stock.sold_out") if alert.left == 0 else word("stock.only_left", left=alert.left),
        ]
        for alert in alerts
    ]
    return texts.html("low_stock", items=bot_texts.lines(rows))


def payment_claimed_text(order: Order, texts: bot_texts.Texts) -> bot_texts.Rendered:
    """Once the payment is marked paid (from its button or the app), the
    last line says so instead of what to do."""
    paid = order.payment.status is PaymentStatus.PAID
    return texts.html(
        "payment_claimed",
        customer=order.customer.name,
        number=order.number,
        amount=format_money(order.payment.amount, order.currency),
        payment=payment_word(order.payment.method),
        next=word("claim.marked") if paid else word("claim.check"),
    )


# "Received, mark paid" under "says paid" (founder, 2026-10-20): the seller
# checks the bank app and records the payment without opening Oak Order.
# The tap's data is "paid:<order id>"; button_tapped checks it came from
# the order's own shop chat.
MARK_PAID_DATA = "paid:"


def payment_claimed_buttons(order: Order, texts: bot_texts.Texts) -> list[dict[str, str]]:
    """Received, mark paid (while it's pending), then Open order."""
    row = []
    if order.payment.status is PaymentStatus.PENDING:
        label = texts.plain("button.mark_paid")
        row.append(telegram.tap_button(label, f"{MARK_PAID_DATA}{order.id}"))
    if (link := order_button(order, texts)) is not None:
        row.append(telegram.url_button(*link))
    return row


def order_button(order: Order, texts: bot_texts.Texts) -> tuple[str, str] | None:
    """ "Open order" in the dashboard. Telegram refuses buttons to non-https
    addresses such as localhost, so none then."""
    app_url = get_settings().public_app_url.rstrip("/")
    if not app_url.startswith("https://"):
        return None
    return texts.plain("button.open_order"), f"{app_url}/dashboard/orders/{order.id}"


async def notify_new_order(
    store_id: uuid.UUID, order_id: uuid.UUID, alerts: list[StockAlert], *, new_order: bool = True
) -> None:
    """Telegram: the new order, then low stock if it took any down.
    Without `new_order` (an order the seller added), only low stock."""
    if not new_order and not alerts:
        return
    if not get_settings().telegram_configured:
        return
    async with tenant_session(store_id) as db:
        store = await db.get(Store, store_id)
        if store is None or store.telegram_chat_id is None:
            return
        texts = await bot_texts.load(db)
        new_order = new_order and texts.on("new_order")
        if not texts.on("low_stock"):
            alerts = []
        if not new_order and not alerts:
            return
        order = await db.scalar(
            select(Order)
            .where(Order.id == order_id, Order.store_id == store_id)
            .options(
                selectinload(Order.items),
                selectinload(Order.customer),
                selectinload(Order.payment),
                selectinload(Order.delivery),
            )
        )
        if order is None:
            return
        messages = [
            (
                "new_order",
                {"order_id": str(order.id), "order_number": order.number},
                new_order_text(order, texts),
                order_button(order, texts),
            )
        ][: 1 if new_order else 0]
        if alerts:
            messages.append(
                ("low_stock", _stock_payload(alerts), low_stock_text(alerts, texts), None)
            )
        await _send_all(db, store, messages)


async def notify_payment_claimed(store_id: uuid.UUID, order_id: uuid.UUID) -> None:
    """Telegram: the customer says they've paid (the bell row is saved
    with the claim)."""
    if not get_settings().telegram_configured:
        return
    async with tenant_session(store_id) as db:
        store = await db.get(Store, store_id)
        if store is None or store.telegram_chat_id is None:
            return
        texts = await bot_texts.load(db)
        if not texts.on(PAYMENT_CLAIMED):
            return
        order = await db.scalar(
            select(Order)
            .where(Order.id == order_id, Order.store_id == store_id)
            .options(selectinload(Order.customer), selectinload(Order.payment))
        )
        if order is None:
            return
        await _send_all(
            db,
            store,
            [
                (
                    PAYMENT_CLAIMED,
                    {"order_id": str(order.id), "order_number": order.number},
                    payment_claimed_text(order, texts),
                    payment_claimed_buttons(order, texts),
                )
            ],
        )


# What a tap answers (a small note at the top of the seller's chat): the
# words tap.done, tap.already, tap.failed, these two and tap.gone.
TAP_CLOSED = {OrderStatus.REJECTED: "tap.rejected", OrderStatus.CANCELLED: "tap.cancelled"}


async def button_tapped(query: dict[str, Any]) -> dict[str, Any] | None:
    """A tap on "Received, mark paid". Only the order's own shop chat can
    record it: the data could come from anyone holding any of the bot's
    messages. Marks the payment paid like the app's Mark paid (02 section
    7.2; the order's status is left alone), tells the customer if they get
    updates, and turns the alert's last line into "Marked paid". Returns
    the answer to the tap, as a Bot API method call."""
    data = str(query.get("data") or "")
    chat_id = ((query.get("message") or {}).get("chat") or {}).get("id")
    if not data.startswith(MARK_PAID_DATA) or chat_id is None:
        return None
    texts = await bot_texts.load()
    note, recorded, edit = await _mark_paid(data[len(MARK_PAID_DATA) :], str(chat_id), texts)
    if edit is not None:
        text, buttons = edit
        try:
            await telegram.call(
                "editMessageText",
                {
                    **telegram.message(chat_id, text, buttons),
                    "message_id": query["message"]["message_id"],
                },
            )
        except (telegram.TelegramError, httpx.HTTPError) as exc:
            logger.error("Editing a paid alert failed: %r", exc)
    if recorded is not None:
        await customer_updates.notify(*recorded, PaymentStatus.PAID)
    return {
        "method": "answerCallbackQuery",
        "callback_query_id": query.get("id"),
        "text": note,
        # A refusal stays until closed; "Marked paid" is a passing note.
        "show_alert": recorded is None,
    }


async def _mark_paid(
    raw_id: str, chat_id: str, texts: bot_texts.Texts
) -> tuple[str, tuple[uuid.UUID, uuid.UUID] | None, tuple[str, list[dict[str, str]]] | None]:
    """(the note to show, (store, order) when recorded, the alert's new
    text and buttons if it should change)."""
    gone = texts.plain("tap.gone")
    try:
        order_id = uuid.UUID(raw_id)
    except ValueError:
        return gone, None, None
    # Which shop: the tap has no tenant. Read nothing else unscoped.
    async with unscoped_session() as db:
        store_id = await db.scalar(select(Order.store_id).where(Order.id == order_id))
    if store_id is None:
        return gone, None, None
    async with tenant_session(store_id) as db:
        store = await db.get(Store, store_id)
        if store is None or store.telegram_chat_id != chat_id:
            return gone, None, None
        # Locked like the app's Mark paid, so two taps can't both record it.
        order = await db.scalar(
            select(Order)
            .where(Order.id == order_id, Order.store_id == store_id)
            .options(selectinload(Order.customer), selectinload(Order.payment))
            .with_for_update()
        )
        if order is None:
            return gone, None, None
        number = order.number
        payment = order.payment
        if payment.status is PaymentStatus.PAID:
            return texts.plain("tap.already", number=number), None, _paid_alert(order, texts)
        if order.status in TAP_CLOSED:
            return texts.plain(TAP_CLOSED[order.status], number=number), None, None
        if payment.status is not PaymentStatus.PENDING:
            return texts.plain("tap.failed", number=number), None, None
        payment_service.record(payment, PaymentStatus.PAID, None)
        await db.commit()
        done = texts.plain("tap.done", number=number)
        return done, (store_id, order_id), _paid_alert(order, texts)


def _paid_alert(order: Order, texts: bot_texts.Texts) -> tuple[str, list[dict[str, str]]]:
    return payment_claimed_text(order, texts), payment_claimed_buttons(order, texts)


async def send_to_seller(
    db: AsyncSession,
    store: Store,
    event_type: str,
    payload: dict[str, Any],
    text: str,
    button: telegram.Buttons = None,
) -> None:
    """One Telegram message to the store's chat, logged like the alerts
    (billing's messages, app/services/billing.py). Commits."""
    if get_settings().telegram_configured and store.telegram_chat_id is not None:
        await _send_all(db, store, [(event_type, payload, text, button)])


async def _send_all(
    db: AsyncSession,
    store: Store,
    messages: list[tuple[str, dict[str, Any], str, telegram.Buttons]],
) -> None:
    """Sends each message to the store's chat in turn, logging each. A
    blocked bot disconnects the store and stops the rest. Commits."""
    store_id = store.id
    for event_type, payload, text, button in messages:
        status = NotificationStatus.SENT
        try:
            await telegram.send_message(store.telegram_chat_id, text, button)
        except telegram.TelegramError as exc:
            status = NotificationStatus.FAILED
            payload = {**payload, "error": exc.description}
            if exc.chat_gone:
                # Blocked or deleted: Settings will show "Not connected".
                store.telegram_chat_id = None
            else:
                logger.error("Telegram alert failed: %s", exc)
        except httpx.HTTPError as exc:
            status = NotificationStatus.FAILED
            payload = {**payload, "error": type(exc).__name__}
            logger.error("Telegram alert failed: %r", exc)
        db.add(_log(store_id, NotificationChannel.TELEGRAM, event_type, payload, status))
        if store.telegram_chat_id is None:
            break
    await db.commit()


def _log(
    store_id: uuid.UUID,
    channel: NotificationChannel,
    event_type: str,
    payload: dict[str, Any],
    status: NotificationStatus = NotificationStatus.SENT,
) -> NotificationLog:
    return NotificationLog(
        store_id=store_id,
        channel=channel,
        event_type=event_type,
        payload=payload,
        status=status,
    )
