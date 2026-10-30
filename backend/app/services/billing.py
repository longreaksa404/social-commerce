"""Sellers paying Oak Order by hand (01_PRODUCT.md §33.1, 2026-10-14),
until Oak Solutions qualifies for ABA PayWay (its checkout and auto-charge
are parked on the payway branch).

- The seller pays by KHQR or bank transfer to Oak's account, with the
  shop's code (plan.shop_code), and taps "I've paid" (`claim`): a pending
  payment, and a Telegram alert to the founder. Like a customer's "I've
  paid" on an order (founder's pick 6B), it changes nothing by itself;
  the founder finds the money and marks it paid on the admin page.
- Once a day cron-job.org calls the run (`run_daily`): on a shop's start
  day (the day after its paid time ends) and on day 5, the seller gets a
  Telegram reminder; new orders stop on day 8. Shops without Telegram
  (it's optional, 01 §32 Rule 7) see the reminder on the Orders tab.

Writes go through their own unscoped session filtered by store_id:
app_user may only read plan_payment, and the run has no tenant.
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import date, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.config import get_settings
from app.core.errors import NotFound
from app.db.session import unscoped_session
from app.models import (
    NotificationLog,
    PlanPayment,
    PlanPaymentMethod,
    PlanPaymentStatus,
    PlanPeriod,
    Seller,
    Store,
)
from app.schemas.plan import PlanStage
from app.services import admin as admin_service
from app.services import notifications, telegram
from app.services import plan as plan_service
from app.services.telegram import TelegramError, escape

logger = logging.getLogger(__name__)

PLAN_REMINDER = "plan_reminder"  # to the seller: time to pay
# Reminders on day 1 (the start day) and day 5 of the 7 days to pay
# (founder, 2026-10-14). A run missed is made up the next day.
REMINDERS = {"start": range(1, 5), "day5": range(5, 8)}
# The admin's "Send a reminder now" (part 18) is logged as its own kind,
# so the day 1 and day 5 ones still go by themselves.
NOW = "now"


async def claim(store_id: uuid.UUID, period: PlanPeriod) -> uuid.UUID | None:
    """ "I've paid": a pending payment for `period`, unless one is already
    waiting. Returns the new one's id (None: nothing new, no alert)."""
    async with unscoped_session() as db:
        store = await db.scalar(select(Store).where(Store.id == store_id).with_for_update())
        if store is None:
            raise NotFound("STORE_NOT_FOUND", "Shop not found.")
        waiting = await db.scalar(
            select(PlanPayment.id).where(
                PlanPayment.store_id == store_id,
                PlanPayment.status == PlanPaymentStatus.PENDING,
            )
        )
        if waiting is not None:
            return None
        payment = PlanPayment(
            store_id=store_id,
            period=period,
            amount=plan_service.PRICES[period],
            method=PlanPaymentMethod.MANUAL,
            status=PlanPaymentStatus.PENDING,
        )
        db.add(payment)
        await db.commit()
        return payment.id


async def notify_claim(store_id: uuid.UUID, payment_id: uuid.UUID) -> None:
    """Telegram to each admin account's own chat with the bot (01_PRODUCT.md
    §22.11, 2026-10-28), after the seller's response."""
    if not get_settings().telegram_configured:
        return
    async with unscoped_session() as db:
        store = await db.get(Store, store_id)
        payment = await db.get(PlanPayment, payment_id)
        if store is None or payment is None:
            return
        text = claim_text(store, payment)
        button = _button(f"/admin/shops/{store_id}", "ពិនិត្យ")
        for chat_id in await admin_service.admin_chats(db):
            try:
                await telegram.send_message(chat_id, text, button)
            except (TelegramError, httpx.HTTPError) as exc:
                logger.warning("The admin's \"I've paid\" alert failed: %r", exc)


@dataclass
class RunSummary:
    reminders: int = 0  # Telegram reminders sent


async def run_daily() -> RunSummary:
    """Once a day (cron-job.org): payment reminders for every open shop
    whose paid time ran out 1 to 7 days ago and that hasn't said it paid."""
    summary = RunSummary()
    settings = get_settings()
    if not settings.telegram_configured:
        return summary
    today = clock.today()
    async with unscoped_session() as db:
        due = list(
            await db.scalars(
                select(Store)
                .join(Seller, Seller.id == Store.seller_id)
                .where(
                    Seller.is_active.is_(True),
                    Store.telegram_chat_id.is_not(None),
                    Store.paid_until < today,
                    Store.paid_until >= today - timedelta(days=plan_service.GRACE_DAYS),
                )
            )
        )
    for store in due:
        if await remind(store.id, today):
            summary.reminders += 1
    logger.info("Billing run: %s", summary)
    return summary


async def remind(store_id: uuid.UUID, today: date) -> bool:
    """This shop's reminder for today, if one is due and not sent yet."""
    async with unscoped_session() as db:
        store = await db.get(Store, store_id)
        if store is None or store.telegram_chat_id is None:
            return False
        day = (today - store.paid_until).days
        kind = next((k for k, days in REMINDERS.items() if day in days), None)
        if kind is None:
            return False
        claimed = await db.scalar(
            select(PlanPayment.id).where(
                PlanPayment.store_id == store_id,
                PlanPayment.status == PlanPaymentStatus.PENDING,
            )
        )
        if claimed is not None:
            return False  # waiting for the founder, not for the seller
        sent = await db.scalar(
            select(NotificationLog.id).where(
                NotificationLog.store_id == store_id,
                NotificationLog.event_type == PLAN_REMINDER,
                NotificationLog.payload["paid_until"].astext == store.paid_until.isoformat(),
                NotificationLog.payload["kind"].astext == kind,
            )
        )
        if sent is not None:
            return False
        text = reminder_text(store, kind)
        await notifications.send_to_seller(
            db,
            store,
            PLAN_REMINDER,
            {"paid_until": store.paid_until.isoformat(), "kind": kind},
            text,
            _button("/dashboard/settings/plan", "បង់ប្រាក់"),
        )
        return True


KHMER_MONTHS = (
    "មករា",
    "កុម្ភៈ",
    "មីនា",
    "មេសា",
    "ឧសភា",
    "មិថុនា",
    "កក្កដា",
    "សីហា",
    "កញ្ញា",
    "តុលា",
    "វិច្ឆិកា",
    "ធ្នូ",
)


def khmer_day(day: date) -> str:
    """ "7 ធ្នូ", as the app writes days in Khmer."""
    return f"{day.day} {KHMER_MONTHS[day.month - 1]}"


def _price(amount) -> str:
    return f"${amount:.2f}".replace(".00", "")


def kind_now(store: Store, today: date) -> str | None:
    """Which reminder the admin's "Send a reminder now" sends: the start
    day's while the plan is ending or in its first days unpaid, day 5's
    after that, and once new orders have stopped, that they have. None
    when there's nothing to pay yet (in setup, or paid well ahead)."""
    stage = plan_service.stage(store.paid_until, today)
    if stage is PlanStage.STOPPED:
        return "stopped"
    if stage is PlanStage.OVERDUE:
        return "day5" if (today - store.paid_until).days >= 5 else "start"
    if stage is PlanStage.ENDING_SOON:
        return "start"
    return None


async def remind_now(db: AsyncSession, store: Store, kind: str) -> NotificationLog | None:
    """The admin's reminder (part 18), sent today on the admin's session
    (commits). The message as logged, or None when Telegram isn't set up
    or the shop has no chat."""
    await notifications.send_to_seller(
        db,
        store,
        PLAN_REMINDER,
        {"paid_until": store.paid_until.isoformat(), "kind": NOW},
        reminder_text(store, kind),
        _button("/dashboard/settings/plan", "បង់ប្រាក់"),
    )
    return await db.scalar(
        select(NotificationLog)
        .where(
            NotificationLog.store_id == store.id,
            NotificationLog.event_type == PLAN_REMINDER,
            NotificationLog.payload["kind"].astext == NOW,
        )
        .order_by(NotificationLog.sent_at.desc())
        .limit(1)
    )


def reminder_text(store: Store, kind: str) -> str:
    """Khmer only, like every bot message (2026-10-09)."""
    pay_by = plan_service.pay_by(store.paid_until)
    stop = khmer_day(pay_by + timedelta(days=1))
    code = plan_service.shop_code(store.id)
    month = _price(plan_service.PRICES[PlanPeriod.MONTH])
    year = _price(plan_service.PRICES[PlanPeriod.YEAR])
    how = (
        f"បង់ {month} ក្នុងមួយខែ ឬ {year} ក្នុងមួយឆ្នាំ តាម KHQR ឬផ្ទេរប្រាក់ "
        f"ក្នុង ការកំណត់ → គម្រោង ដោយដាក់លេខកូដ <b>{code}</b> ហើយចុច «ខ្ញុំបានបង់»។"
    )
    if kind == "stopped":
        # Settings → Plan's own words for a stopped shop.
        return (
            f"⛔ <b>Oak Order</b> · {escape(store.name)}\n"
            "ហាងរបស់អ្នកមិនទទួលការកុម្ម៉ង់ថ្មីទេ។ សូមបង់ ដើម្បីបើកវិញភ្លាមៗ។\n"
            f"{how}"
        )
    if kind == "start":
        return (
            f"🔔 <b>Oak Order</b> · {escape(store.name)}\n"
            f"ដល់ពេលបង់ប្រាក់សម្រាប់គម្រោងរបស់អ្នកហើយ។ {how}\n"
            f"បើមិនទាន់បង់ត្រឹម {khmer_day(pay_by)} ទេ ហាងរបស់អ្នកនឹងឈប់ទទួលការកុម្ម៉ង់ថ្មីនៅ {stop}។"
        )
    return (
        f"⚠️ <b>Oak Order</b> · {escape(store.name)}\n"
        f"យើងមិនទាន់ទទួលបានការបង់ប្រាក់របស់អ្នកនៅឡើយ។ {how}\n"
        f"សូមបង់ត្រឹម {khmer_day(pay_by)}៖ ហាងរបស់អ្នកនឹងឈប់ទទួលការកុម្ម៉ង់ថ្មីនៅ {stop}។"
    )


def claim_text(store: Store, payment: PlanPayment) -> str:
    period = "មួយខែ" if payment.period is PlanPeriod.MONTH else "មួយឆ្នាំ"
    return (
        f"💰 <b>{escape(store.name)}</b> ({plan_service.shop_code(store.id)}) "
        f"និយាយថាបានបង់ {_price(payment.amount)} សម្រាប់{period}។\n"
        "ពិនិត្យគណនីរបស់អ្នក ហើយកត់ថាបានបង់ ក្នុងទំព័រគ្រប់គ្រង។"
    )


def _button(path: str, label: str) -> tuple[str, str] | None:
    """Telegram refuses buttons to non-https addresses such as localhost."""
    app = get_settings().public_app_url.rstrip("/")
    if not app.startswith("https://"):
        return None
    return label, f"{app}{path}"
