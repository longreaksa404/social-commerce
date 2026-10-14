"""The shop's plan with Oak Order (01_PRODUCT.md §33.1): a 30-day free
trial, then $9.99 a month or $99 a year.

Everything follows from one date, store.paid_until, the last day the shop
is covered, worked out whenever it's read (like a paused shop reopening by
itself; there's no scheduled job). With paid_until = 30 Nov:

    25–30 Nov   ending soon: the dashboard reminds the seller
    1–7 Dec     overdue: orders still come; the seller has 7 days to pay
    from 8 Dec  stopped: no new orders. Customers see the shop with the
                paused notice, never anything about payment; the seller can
                still finish the orders already placed. Paying reopens it.
"""

import uuid
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.config import get_settings
from app.models import PlanPayment, PlanPaymentMethod, PlanPaymentStatus, PlanPeriod, Store
from app.schemas.plan import AutoChargeOut, PlanOut, PlanPaymentOut, PlanPricesOut, PlanStage
from app.services import store as store_service

REMIND_DAYS = 6
GRACE_DAYS = 7
PRICES = {PlanPeriod.MONTH: Decimal("9.99"), PlanPeriod.YEAR: Decimal("99.00")}
MONTHS = {PlanPeriod.MONTH: 1, PlanPeriod.YEAR: 12}


def stage(paid_until: date, today: date) -> PlanStage:
    if today > paid_until + timedelta(days=GRACE_DAYS):
        return PlanStage.STOPPED
    if today > paid_until:
        return PlanStage.OVERDUE
    if today > paid_until - timedelta(days=REMIND_DAYS):
        return PlanStage.ENDING_SOON
    return PlanStage.ACTIVE


def orders_stopped(store: Store) -> bool:
    """No new orders: a week has passed since the trial or the paid time ran out."""
    return stage(store.paid_until, clock.today()) is PlanStage.STOPPED


def pay_by(paid_until: date) -> date:
    """The last day to pay before new orders stop."""
    return paid_until + timedelta(days=GRACE_DAYS)


def add_months(day: date, months: int) -> date:
    """The same day `months` later. A day that month doesn't have (31 Jan +
    1 month) becomes the 1st of the month after, so no paid day is lost."""
    index = day.month - 1 + months
    try:
        return day.replace(year=day.year + index // 12, month=index % 12 + 1)
    except ValueError:
        index += 1
        return date(day.year + index // 12, index % 12 + 1, 1)


def next_period(paid_until: date, today: date, period: PlanPeriod) -> tuple[date, date]:
    """The days a payment made today pays for, both included. It carries on
    from the time already covered, so the 7 days to pay aren't free extra
    days; once orders have stopped, it starts today."""
    if stage(paid_until, today) is PlanStage.STOPPED:
        start = today
    else:
        start = paid_until + timedelta(days=1)
    return start, add_months(start, MONTHS[period]) - timedelta(days=1)


def mark_paid(payment: PlanPayment, store: Store) -> None:
    """The payment reached Oak Order today: it covers the next month or
    year (next_period) and moves the shop's paid-until date. Lock the store
    row first when anything else may move it."""
    today = clock.today()
    payment.covers_from, payment.covers_until = next_period(store.paid_until, today, payment.period)
    payment.status = PlanPaymentStatus.PAID
    payment.paid_on = today
    payment.failure = None
    store.paid_until = payment.covers_until


def record_payment(
    db: AsyncSession,
    store: Store,
    period: PlanPeriod,
    *,
    amount: Decimal | None = None,
    reference: str | None = None,
) -> PlanPayment:
    """A payment made by hand (the founder's command or admin page). Added
    to the session, not committed."""
    payment = PlanPayment(
        store_id=store.id,
        period=period,
        amount=PRICES[period] if amount is None else amount,
        method=PlanPaymentMethod.MANUAL,
        reference=reference,
    )
    mark_paid(payment, store)
    db.add(payment)
    return payment


def day_start(day: date) -> datetime:
    """Midnight in Phnom Penh, to compare with created_at."""
    return datetime.combine(day, time(), tzinfo=clock.PHNOM_PENH)


def auto_charge_failed(
    store: Store, payments: list[PlanPayment], today: date
) -> PlanPayment | None:
    """The latest auto-charge that failed since the paid time ran out."""
    if stage(store.paid_until, today) in (PlanStage.ACTIVE, PlanStage.ENDING_SOON):
        return None
    since = day_start(store.paid_until + timedelta(days=1))
    failed = [
        p
        for p in payments
        if p.method is PlanPaymentMethod.PAYWAY_AUTO
        and p.status is PlanPaymentStatus.FAILED
        and p.created_at >= since
    ]
    return max(failed, key=lambda p: p.created_at, default=None)


def next_charge(store: Store, payments: list[PlanPayment], today: date) -> date | None:
    """When auto-charge next tries (app/services/billing.py): the shop's
    start day; during the 7 days to pay, today, or tomorrow once today's
    try is done; none once orders have stopped (paying now starts it again)."""
    if store.payway_token is None:
        return None
    start = store.paid_until + timedelta(days=1)
    if today < start:
        return start
    if stage(store.paid_until, today) is PlanStage.STOPPED:
        return None
    tried = any(
        p.method is PlanPaymentMethod.PAYWAY_AUTO and p.created_at >= day_start(today)
        for p in payments
    )
    if not tried:
        return today
    tomorrow = today + timedelta(days=1)
    return tomorrow if tomorrow <= pay_by(store.paid_until) else None


async def get_plan(db: AsyncSession, store_id: uuid.UUID) -> PlanOut:
    store = await store_service.get_store(db, store_id)
    payments = list(
        await db.scalars(
            select(PlanPayment)
            .where(PlanPayment.store_id == store_id)
            .order_by(PlanPayment.created_at.desc())
        )
    )
    today = clock.today()
    paid = [p for p in payments if p.status is PlanPaymentStatus.PAID]
    shown = [
        p
        for p in payments
        if p.status is PlanPaymentStatus.PAID
        or (p.status is PlanPaymentStatus.FAILED and p.method is PlanPaymentMethod.PAYWAY_AUTO)
    ]
    auto_charge = None
    if store.payway_token is not None:
        auto_charge = AutoChargeOut(
            label=store.payway_token_label or "",
            amount=PRICES[PlanPeriod.MONTH],
            next_charge=next_charge(store, payments, today),
        )
    return PlanOut(
        stage=stage(store.paid_until, today),
        on_trial=not paid,
        paid_until=store.paid_until,
        pay_by=pay_by(store.paid_until),
        days_left=max((store.paid_until - today).days + 1, 0),
        prices=PlanPricesOut(month=PRICES[PlanPeriod.MONTH], year=PRICES[PlanPeriod.YEAR]),
        payway=get_settings().payway_configured,
        auto_charge=auto_charge,
        charge_failed=auto_charge_failed(store, payments, today) is not None,
        payments=[PlanPaymentOut.model_validate(p) for p in shown],
    )
