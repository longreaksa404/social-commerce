"""Payment reminders to customers (founder's pick 3, 2026-10-20).

A KHQR or bank order still unpaid 2 hours after it was placed, whose
customer gets updates on Telegram (app/services/customer_updates.py) and
hasn't tapped "I've paid", gets one reminder from the bot: the amount and
a Pay button to the order page, where the QR or the bank account is.

cron-job.org calls the run every hour (POST /api/v1/reminders/run).
Nothing goes out between 22:00 and 7:00 in Phnom Penh: an order placed
late hears in the morning. From 24 hours (a KHQR code's life, 02 section
10.3) there are no more reminders; the seller sees "Not paid after 24 h"
instead and decides (frontend lib/payments.ts). Nothing here changes an
order or a payment.

Each reminder writes a notification_log row (telegram, "payment_reminder",
the order's id), sent or failed, so it goes once. The run finds them
across shops on an unscoped session, filtering explicitly, then sends each
on its own shop's tenant session.
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import Text, cast, select
from sqlalchemy.orm import selectinload

from app.core import clock
from app.core.config import get_settings
from app.db.session import tenant_session, unscoped_session
from app.models import (
    Customer,
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
    Order,
    OrderStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
    Seller,
    Store,
)
from app.services import customer_updates, notifications, telegram

logger = logging.getLogger(__name__)

REMIND_AFTER = timedelta(hours=2)
REMIND_UNTIL = timedelta(hours=24)
# Hours in Phnom Penh with no reminders: from 22:00 to 7:00.
QUIET_FROM, QUIET_UNTIL = 22, 7
PAYMENT_REMINDER = "payment_reminder"
OFF = (OrderStatus.REJECTED, OrderStatus.CANCELLED, OrderStatus.COMPLETED)
PAY = "💳 បង់ប្រាក់"  # Pay


def quiet(now: datetime) -> bool:
    hour = now.astimezone(clock.PHNOM_PENH).hour
    return hour >= QUIET_FROM or hour < QUIET_UNTIL


def reminder_text(store: Store, order: Order) -> str:
    money = notifications.format_money(order.payment.amount, order.currency)
    # "Waiting for your payment of $12.00. Paid already? Tap "I've paid" on
    # your order page." The page's button is ខ្ញុំបានបង់ហើយ.
    line = (
        f"⏳ កំពុងរង់ចាំការបង់ប្រាក់ {money} របស់អ្នក។ បើបានបង់រួចហើយ សូមចុច “ខ្ញុំបានបង់ហើយ” នៅក្នុងទំព័រការកុម្ម៉ង់របស់អ្នក។"
    )
    return customer_updates.message_text(store, order, line)


def pay_button(store: Store, order: Order) -> tuple[str, str] | None:
    """The order page, labelled Pay (none for a non-https address)."""
    view = customer_updates.order_button(store, order)
    return (PAY, view[1]) if view else None


@dataclass
class RunSummary:
    reminders: int = 0  # sent to customers


async def run(now: datetime | None = None) -> RunSummary:
    """Every hour (cron-job.org): one reminder for each order that's due."""
    summary = RunSummary()
    now = now or datetime.now(UTC)
    if not get_settings().telegram_configured or quiet(now):
        return summary
    for store_id, order_id in await due(now):
        if await remind(store_id, order_id):
            summary.reminders += 1
    logger.info("Reminders run: %s", summary)
    return summary


async def due(now: datetime) -> list[tuple[uuid.UUID, uuid.UUID]]:
    """(store, order) of the KHQR and bank orders 2 to 24 hours old, still
    pending, whose customer gets updates and hasn't said they paid, not
    reminded yet, in shops that are on."""
    order_id = cast(Order.id, Text)
    claimed = (
        select(NotificationLog.id)
        .where(
            NotificationLog.store_id == Order.store_id,
            NotificationLog.channel == NotificationChannel.WEB,
            NotificationLog.event_type == notifications.PAYMENT_CLAIMED,
            NotificationLog.payload["order"]["id"].astext == order_id,
        )
        .exists()
    )
    reminded = (
        select(NotificationLog.id)
        .where(
            NotificationLog.store_id == Order.store_id,
            NotificationLog.event_type == PAYMENT_REMINDER,
            NotificationLog.payload["order_id"].astext == order_id,
        )
        .exists()
    )
    async with unscoped_session() as db:
        rows = await db.execute(
            select(Order.store_id, Order.id)
            .join(Payment, Payment.order_id == Order.id)
            .join(Customer, Customer.id == Order.customer_id)
            .join(Store, Store.id == Order.store_id)
            .join(Seller, Seller.id == Store.seller_id)
            .where(
                Seller.is_active.is_(True),
                Payment.method.in_((PaymentMethod.KHQR, PaymentMethod.BANK_TRANSFER)),
                Payment.status == PaymentStatus.PENDING,
                Order.status.not_in(OFF),
                Customer.telegram_user_id.is_not(None),
                Order.created_at <= now - REMIND_AFTER,
                Order.created_at > now - REMIND_UNTIL,
                ~claimed,
                ~reminded,
            )
            .order_by(Order.created_at)
        )
        return [(store_id, oid) for store_id, oid in rows.all()]


async def remind(store_id: uuid.UUID, order_id: uuid.UUID) -> bool:
    """Sends this order's reminder, logged either way. False if it went
    since it was found (paid, closed, the chat gone) or failed."""
    async with tenant_session(store_id) as db:
        store = await db.get(Store, store_id)
        order = await db.scalar(
            select(Order)
            .where(Order.id == order_id, Order.store_id == store_id)
            .options(selectinload(Order.customer), selectinload(Order.payment))
        )
        if store is None or order is None:
            return False
        chat_id = order.customer.telegram_user_id
        if chat_id is None or order.payment.status is not PaymentStatus.PENDING:
            return False
        if order.status in OFF:
            return False
        payload = {"order_id": str(order.id), "order_number": order.number}
        status = NotificationStatus.SENT
        try:
            await telegram.send_message(
                chat_id, reminder_text(store, order), pay_button(store, order)
            )
        except telegram.TelegramError as exc:
            status = NotificationStatus.FAILED
            payload["error"] = exc.description
            if exc.chat_gone:
                order.customer.telegram_user_id = None
            else:
                logger.error("Payment reminder to a customer failed: %s", exc)
        except httpx.HTTPError as exc:
            status = NotificationStatus.FAILED
            payload["error"] = type(exc).__name__
            logger.error("Payment reminder to a customer failed: %r", exc)
        db.add(
            NotificationLog(
                store_id=store_id,
                channel=NotificationChannel.TELEGRAM,
                event_type=PAYMENT_REMINDER,
                payload=payload,
                status=status,
            )
        )
        await db.commit()
        return status is NotificationStatus.SENT
