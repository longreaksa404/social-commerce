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
from app.db.session import tenant_session
from app.models import (
    Currency,
    DeliveryMethod,
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
    Order,
    OrderStatus,
    PaymentMethod,
    Store,
)
from app.schemas.notification import NotificationListOut, NotificationOut
from app.services import telegram
from app.services.telegram import escape

logger = logging.getLogger(__name__)

# The shop says "Only N left" from this many down (ShopProduct.tsx).
LOW_STOCK = 5

PAYMENT_LABELS = {
    PaymentMethod.COD: "Cash on delivery",
    PaymentMethod.BANK_TRANSFER: "Bank transfer",
    PaymentMethod.KHQR: "KHQR",
}


@dataclass(frozen=True)
class StockAlert:
    product_id: uuid.UUID
    name: str  # "Red T-shirt (XL)"
    left: int


def stock_alert(product_id: uuid.UUID, name: str, before: int, after: int) -> StockAlert | None:
    """An alert when an order takes stock to LOW_STOCK or below, and again
    when it sells out; not for every sale below the line."""
    if after <= 0 < before or after <= LOW_STOCK < before:
        return StockAlert(product_id, name, max(after, 0))
    return None


def _stock_payload(alerts: list[StockAlert]) -> dict[str, Any]:
    return {
        "items": [{"product_id": str(a.product_id), "name": a.name, "left": a.left} for a in alerts]
    }


# Web: the dashboard's notification list


def web_notifications(order: Order, alerts: list[StockAlert]) -> list[NotificationLog]:
    """The dashboard's notifications for a new order, to save with it
    (whether or not Telegram is connected). The order as placed, as
    NotificationOut has it; opening it shows where it is now."""
    rows = [
        _log(
            order.store_id,
            NotificationChannel.WEB,
            "new_order",
            {
                "order": {
                    "id": str(order.id),
                    "number": order.number,
                    "customer_name": order.customer.name,
                    "item_count": sum(item.quantity for item in order.items),
                    "total": str(order.total),
                    "currency": order.currency.value,
                    "accepted_automatically": order.status is OrderStatus.ACCEPTED,
                }
            },
        )
    ]
    if alerts:
        rows.append(
            _log(order.store_id, NotificationChannel.WEB, "low_stock", _stock_payload(alerts))
        )
    return rows


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
    """What the bell shows."""
    count = await db.scalar(
        select(func.count())
        .select_from(NotificationLog)
        .where(*_web(store_id), NotificationLog.read_at.is_(None))
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


def new_order_text(order: Order) -> str:
    money = lambda amount: format_money(amount, order.currency)  # noqa: E731
    heading = f"🛒 <b>New order #{order.number}</b>"
    if order.status is OrderStatus.ACCEPTED:
        heading += " (accepted automatically)"
    lines = [heading, ""]
    for item in order.items:
        name = item.product_name_snapshot
        if item.variant_name_snapshot:
            name += f" ({item.variant_name_snapshot})"
        lines.append(f"{item.quantity} × {escape(name)}: {money(item.line_total)}")
    if order.discount:
        lines.append(f"Discount: −{money(order.discount)}")
    if order.delivery_method is not DeliveryMethod.PICKUP:
        lines.append(f"Delivery: {money(order.delivery_fee) if order.delivery_fee else 'free'}")
    lines.append(f"<b>Total: {money(order.total)}</b>")
    lines.append("")
    lines.append(f"💳 {PAYMENT_LABELS[order.payment.method]}")
    if order.delivery_method is DeliveryMethod.PICKUP:
        lines.append("🏪 Pickup")
    else:
        lines.append(f"🚚 {escape(order.delivery.courier or 'Your own delivery')}")
    lines.append(f"👤 {escape(order.customer.name)}, {order.customer.phone}")
    if order.delivery_address:
        lines.append(f"📍 {escape(order.delivery_address)}")
    elif order.delivery_lat is not None:
        lines.append("📍 Location shared (open the order for the map)")
    if order.notes:
        lines.append(f"📝 {escape(order.notes)}")
    return "\n".join(lines)


def low_stock_text(alerts: list[StockAlert]) -> str:
    lines = ["⚠️ <b>Stock running low</b>", ""]
    for alert in alerts:
        left = "sold out" if alert.left == 0 else f"only {alert.left} left"
        lines.append(f"{escape(alert.name)}: {left}")
    return "\n".join(lines)


def order_button(order: Order) -> tuple[str, str] | None:
    """ "Open order" in the dashboard. Telegram refuses buttons to non-https
    addresses such as localhost, so none then."""
    app_url = get_settings().public_app_url.rstrip("/")
    if not app_url.startswith("https://"):
        return None
    return "Open order", f"{app_url}/dashboard/orders/{order.id}"


async def notify_new_order(
    store_id: uuid.UUID, order_id: uuid.UUID, alerts: list[StockAlert]
) -> None:
    if not get_settings().telegram_configured:
        return
    async with tenant_session(store_id) as db:
        store = await db.get(Store, store_id)
        if store is None or store.telegram_chat_id is None:
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
                new_order_text(order),
                order_button(order),
            )
        ]
        if alerts:
            messages.append(("low_stock", _stock_payload(alerts), low_stock_text(alerts), None))

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
