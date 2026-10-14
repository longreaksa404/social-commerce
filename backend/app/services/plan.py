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
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.config import get_settings
from app.models import (
    Currency,
    PlanPayment,
    PlanPaymentMethod,
    PlanPaymentStatus,
    PlanPeriod,
    Store,
)
from app.schemas.plan import (
    BankOut,
    PayToOut,
    PlanOut,
    PlanPaymentOut,
    PlanPricesOut,
    PlanStage,
)
from app.services import khqr as khqr_service
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


# No 0/O or 1/I: read off a bank statement or typed in a transfer note.
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def shop_code(store_id: uuid.UUID) -> str:
    """The shop's code for paying Oak Order ("OAK-K7Q2MX"): what the seller
    puts in the transfer's note and the KHQR's bill number, so the founder
    can match money to shops. From the store id's first 30 bits, so it
    never changes and needs no column; two shops sharing one is about a 1
    in 200,000 chance at 100 shops (the admin page shows both)."""
    n = store_id.int >> 98
    chars = []
    for _ in range(6):
        n, digit = divmod(n, 32)
        chars.append(CODE_ALPHABET[digit])
    return "OAK-" + "".join(chars)


def pay_to(code: str) -> PayToOut:
    """Oak's own KHQR (with the shop's code as the bill number) and bank
    account, from the OAK_* settings. A KHQR with an amount expires in a
    day: a fresh one is made each time the page asks."""
    settings = get_settings()
    khqr = {}
    if settings.oak_khqr_account:
        for period in PlanPeriod:
            khqr[period] = khqr_service.individual_khqr(
                bakong_account_id=settings.oak_khqr_account,
                merchant_name=settings.oak_khqr_name,
                currency=Currency.USD,
                amount=PRICES[period],
                bill_number=code,
                now=datetime.now(UTC),
            )
    bank = None
    if settings.oak_bank_name and settings.oak_bank_account_number:
        bank = BankOut(
            bank_name=settings.oak_bank_name,
            account_name=settings.oak_bank_account_name,
            account_number=settings.oak_bank_account_number,
        )
    return PayToOut(
        khqr_month=khqr.get(PlanPeriod.MONTH),
        khqr_year=khqr.get(PlanPeriod.YEAR),
        khqr_name=settings.oak_khqr_name if khqr else None,
        bank=bank,
    )


def open_claim(payments: list[PlanPayment]) -> PlanPayment | None:
    """The seller's "I've paid" still waiting for the founder."""
    return next((p for p in payments if p.status is PlanPaymentStatus.PENDING), None)


async def payments_of(db: AsyncSession, store_id: uuid.UUID) -> list[PlanPayment]:
    return list(
        await db.scalars(
            select(PlanPayment)
            .where(PlanPayment.store_id == store_id)
            .order_by(PlanPayment.created_at.desc())
        )
    )


async def get_plan(db: AsyncSession, store_id: uuid.UUID) -> PlanOut:
    store = await store_service.get_store(db, store_id)
    payments = await payments_of(db, store_id)
    today = clock.today()
    claim = open_claim(payments)
    code = shop_code(store_id)
    return PlanOut(
        stage=stage(store.paid_until, today),
        on_trial=not any(p.status is PlanPaymentStatus.PAID for p in payments),
        paid_until=store.paid_until,
        pay_by=pay_by(store.paid_until),
        days_left=max((store.paid_until - today).days + 1, 0),
        prices=PlanPricesOut(month=PRICES[PlanPeriod.MONTH], year=PRICES[PlanPeriod.YEAR]),
        code=code,
        pay_to=pay_to(code),
        claim=PlanPaymentOut.model_validate(claim) if claim else None,
        payments=[
            PlanPaymentOut.model_validate(p)
            for p in payments
            if p.status is not PlanPaymentStatus.PENDING
        ],
    )
