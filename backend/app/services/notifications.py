"""Seller alerts on Telegram (02_TECHNICAL.md section 12.1).

Only for things the seller didn't do themselves (decided 2026-10-03): a new
order, and stock running low or out because of one. Cancelling, recording
a payment and moving a delivery are all the seller's own taps, so they send
nothing. Sent after the response (FastAPI BackgroundTasks); a failure is
logged and never affects the order.
"""

import logging
import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

import httpx
from sqlalchemy import select
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
    name: str  # "Red T-shirt (XL)"
    left: int


def stock_alert(name: str, before: int, after: int) -> StockAlert | None:
    """An alert when an order takes stock to LOW_STOCK or below, and again
    when it sells out; not for every sale below the line."""
    if after <= 0 < before or after <= LOW_STOCK < before:
        return StockAlert(name, max(after, 0))
    return None


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
            payload = {"items": [{"name": a.name, "left": a.left} for a in alerts]}
            messages.append(("low_stock", payload, low_stock_text(alerts), None))

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
            db.add(_log(store_id, event_type, payload, status))
            if store.telegram_chat_id is None:
                break
        await db.commit()


def _log(
    store_id: uuid.UUID, event_type: str, payload: dict[str, Any], status: NotificationStatus
) -> NotificationLog:
    return NotificationLog(
        store_id=store_id,
        channel=NotificationChannel.TELEGRAM,
        event_type=event_type,
        payload=payload,
        status=status,
    )
