"""Money in the admin panel (01_PRODUCT.md §22.11, parts 15 to 18): a
shop's paid-until date moved with a reason, a payment marked by mistake
undone, every shop's payments by month or year (and as an Excel file),
and the plan reminder sent now. Each is logged (services/admin_log.py).
"""

import io
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

import xlsxwriter
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.config import get_settings
from app.core.errors import AppError, NotFound
from app.models import (
    AdminAction,
    NotificationStatus,
    PlanPayment,
    PlanPaymentStatus,
    PlanPeriod,
    Seller,
    Store,
)
from app.schemas.plan import AdminPaymentRowOut, AdminPaymentsOut, AdminShopDetailOut
from app.services import admin_log, billing, bot_texts
from app.services import plan as plan_service
from app.services.admin import locked_store, shop_detail

# How far a paid-until date can be moved: a year back, two ahead.
DAYS_BACK = 365
DAYS_AHEAD = 2 * 365


async def set_paid_until(
    db: AsyncSession, admin_id: uuid.UUID, store_id: uuid.UUID, day: date, reason: str
) -> AdminShopDetailOut:
    """Part 15: a longer trial or a few free days. The next payment carries
    on from the new date, like any other. A shop in setup has no date yet:
    its trial starts when the seller opens it."""
    store = await locked_store(db, store_id)
    if store.paid_until is None:
        raise AppError(
            409,
            "SHOP_IN_SETUP",
            "This shop isn't open yet: its trial starts when the seller opens it.",
        )
    if day == store.paid_until:
        raise AppError(422, "SAME_DATE", "It's paid until that day already.", "paid_until")
    today = clock.today()
    if not today - timedelta(days=DAYS_BACK) <= day <= today + timedelta(days=DAYS_AHEAD):
        raise AppError(
            422,
            "DATE_OUT_OF_RANGE",
            "Choose a day within a year back and two years ahead.",
            "paid_until",
        )
    before = store.paid_until
    store.paid_until = day
    admin_log.record(
        db,
        admin_id,
        "paid_until",
        store=store,
        reason=reason,
        before=before.isoformat(),
        after=day.isoformat(),
    )
    await db.commit()
    return await shop_detail(db, store_id)


async def undo_payment(
    db: AsyncSession, admin_id: uuid.UUID, store_id: uuid.UUID, payment_id: uuid.UUID, reason: str
) -> AdminShopDetailOut:
    """Part 16: the shop's latest paid payment, marked by mistake, becomes
    Undone. Its time comes off: the paid-until date goes back to what it
    was before the payment (from its log line), or for one marked before
    the log kept that, the day before the payment's first day. The row
    stays, out of the totals and the seller's list."""
    store = await locked_store(db, store_id)
    payment = await db.scalar(
        select(PlanPayment)
        .where(PlanPayment.id == payment_id, PlanPayment.store_id == store_id)
        .with_for_update()
    )
    if payment is None:
        raise NotFound("PAYMENT_NOT_FOUND", "Payment not found.")
    if payment.status is not PlanPaymentStatus.PAID:
        raise AppError(409, "PAYMENT_NOT_PAID", "Only a paid payment can be undone.")
    latest = await db.scalar(
        select(PlanPayment.id)
        .where(PlanPayment.store_id == store_id, PlanPayment.status == PlanPaymentStatus.PAID)
        .order_by(PlanPayment.covers_until.desc(), PlanPayment.created_at.desc())
        .limit(1)
    )
    if latest != payment.id:
        raise AppError(409, "NOT_LATEST_PAYMENT", "Undo the newest payment first.")

    before = store.paid_until
    store.paid_until = await _paid_until_before(db, payment)
    payment.status = PlanPaymentStatus.VOID
    payment.failure = reason
    admin_log.record(
        db,
        admin_id,
        "undo_payment",
        store=store,
        reason=reason,
        amount=f"{payment.amount:.2f}",
        period=payment.period.value,
        before=before.isoformat() if before else None,
        after=store.paid_until.isoformat() if store.paid_until else None,
    )
    await db.commit()
    return await shop_detail(db, store_id)


async def _paid_until_before(db: AsyncSession, payment: PlanPayment) -> date | None:
    """The paid-until date the payment moved on: None for a shop that paid
    before it opened (back in setup)."""
    line = await db.scalar(
        select(AdminAction)
        .where(
            AdminAction.store_id == payment.store_id,
            AdminAction.action == "mark_paid",
            AdminAction.details["payment"].astext == str(payment.id),
        )
        .limit(1)
    )
    if line is not None and "before" in line.details:
        before = line.details["before"]
        return date.fromisoformat(before) if before else None
    return payment.covers_from - timedelta(days=1)


async def remind(db: AsyncSession, admin_id: uuid.UUID, store_id: uuid.UUID) -> AdminShopDetailOut:
    """Part 18: the plan reminder on the owner's Telegram now, as a shop
    ending soon, unpaid or stopped gets it on day 1 and day 5 (those still
    go by themselves). Logged with whether it reached them."""
    if not get_settings().telegram_configured:
        raise AppError(
            503, "TELEGRAM_NOT_SET_UP", "Oak's Telegram bot isn't set up on this server."
        )
    store = await locked_store(db, store_id)
    owner = await db.get(Seller, store.seller_id)
    if not owner.is_active:
        raise AppError(409, "SHOP_CLOSED", "This shop is closed.")
    if store.telegram_chat_id is None:
        raise AppError(409, "NO_TELEGRAM", "This shop's Telegram isn't connected.")
    kind = billing.kind_now(store, clock.today())
    if kind is None:
        raise AppError(409, "NOTHING_DUE", "Nothing to pay yet.")
    if not (await bot_texts.load(db)).on(f"plan_{kind}"):
        raise AppError(409, "MESSAGE_OFF", "This reminder is turned off on the Bot page.")
    message = await billing.remind_now(db, store, kind)
    sent = message is not None and message.status is NotificationStatus.SENT
    admin_log.record(
        db,
        admin_id,
        "remind",
        store=store,
        kind=kind,
        sent=sent,
        error=None if sent or message is None else message.payload.get("error"),
    )
    await db.commit()
    return await shop_detail(db, store_id)


def _period(year: int, month: int | None) -> tuple[date, date]:
    """The first and last day of a month, or of the year."""
    if month is None:
        return date(year, 1, 1), date(year, 12, 31)
    first = date(year, month, 1)
    return first, plan_service.add_months(first, 1) - timedelta(days=1)


def _said_on(payment: PlanPayment) -> date:
    return payment.created_at.astimezone(clock.PHNOM_PENH).date()


def _row(payment: PlanPayment, store: Store) -> AdminPaymentRowOut:
    paid = payment.status in (PlanPaymentStatus.PAID, PlanPaymentStatus.VOID)
    return AdminPaymentRowOut(
        id=payment.id,
        period=payment.period,
        amount=payment.amount,
        method=payment.method,
        status=payment.status,
        failure=payment.failure,
        created_at=payment.created_at,
        paid_on=payment.paid_on,
        covers_from=payment.covers_from,
        covers_until=payment.covers_until,
        reference=payment.reference,
        store_id=store.id,
        shop=store.name,
        code=plan_service.shop_code(store.id),
        day=payment.paid_on if paid else _said_on(payment),
    )


async def payments(db: AsyncSession, year: int, month: int | None) -> AdminPaymentsOut:
    """Part 17 (founder's pick 9B): every "I've paid" waiting, then the
    month's (or year's) paid, not found and undone payments, newest first,
    with what was collected in it and in its year."""
    first, last = _period(year, month)
    year_first, year_last = _period(year, None)
    since = plan_service.day_start(year_first)
    until = plan_service.day_start(year_last + timedelta(days=1))
    rows = (
        await db.execute(
            select(PlanPayment, Store)
            .join(Store, Store.id == PlanPayment.store_id)
            .where(
                or_(
                    PlanPayment.status == PlanPaymentStatus.PENDING,
                    PlanPayment.paid_on.between(year_first, year_last),
                    and_(
                        PlanPayment.status == PlanPaymentStatus.FAILED,
                        PlanPayment.created_at >= since,
                        PlanPayment.created_at < until,
                    ),
                )
            )
            .order_by(PlanPayment.created_at.desc())
        )
    ).all()
    waiting, listed = [], []
    collected_year = Decimal("0")
    for payment, store in rows:
        row = _row(payment, store)
        if payment.status is PlanPaymentStatus.PENDING:
            waiting.append(row)
            continue
        if payment.status is PlanPaymentStatus.PAID:
            collected_year += payment.amount
        if first <= row.day <= last:
            listed.append(row)
    listed.sort(key=lambda r: (r.day, r.created_at), reverse=True)
    paid = [r for r in listed if r.status is PlanPaymentStatus.PAID]
    return AdminPaymentsOut(
        year=year,
        month=month,
        collected=sum((r.amount for r in paid), Decimal("0")),
        paid=len(paid),
        collected_year=collected_year,
        waiting=waiting[::-1],
        payments=listed,
    )


STATUS = {
    PlanPaymentStatus.PAID: "Paid",
    PlanPaymentStatus.FAILED: "Not found",
    PlanPaymentStatus.VOID: "Undone",
    PlanPaymentStatus.PENDING: "Says paid",
}
# (heading, column width)
COLUMNS = [
    ("Date", 12),
    ("Shop", 26),
    ("Code", 12),
    ("For", 8),
    ("Amount (USD)", 13),
    ("Status", 11),
    ("Covers from", 12),
    ("Covers until", 12),
    ("Note", 30),
]


def workbook(data: AdminPaymentsOut) -> bytes:
    """The listed payments, for the founder's accounts, with what was
    collected under them (the paid ones only). Dates as dates, amounts as
    numbers."""
    out = io.BytesIO()
    book = xlsxwriter.Workbook(out, {"in_memory": True})
    sheet = book.add_worksheet("Payments")
    bold = book.add_format({"bold": True, "bg_color": "#EEF1F6", "border": 1})
    day = book.add_format({"num_format": "yyyy-mm-dd"})
    money = book.add_format({"num_format": "$#,##0.00"})
    total = book.add_format({"num_format": "$#,##0.00", "bold": True})

    for col, (heading, width) in enumerate(COLUMNS):
        sheet.write_string(0, col, heading, bold)
        sheet.set_column(col, col, width)
    r = 0
    for r, row in enumerate(data.payments, start=1):
        sheet.write_datetime(r, 0, datetime.combine(row.day, datetime.min.time()), day)
        sheet.write_string(r, 1, row.shop)
        sheet.write_string(r, 2, row.code)
        sheet.write_string(r, 3, "Year" if row.period is PlanPeriod.YEAR else "Month")
        sheet.write_number(r, 4, float(row.amount), money)
        sheet.write_string(r, 5, STATUS[row.status])
        for col, value in ((6, row.covers_from), (7, row.covers_until)):
            if value is not None:
                sheet.write_datetime(r, col, datetime.combine(value, datetime.min.time()), day)
        sheet.write_string(r, 8, " · ".join(n for n in (row.reference, row.failure) if n))
    sheet.write_string(r + 2, 3, "Collected", bold)
    sheet.write_number(r + 2, 4, float(data.collected), total)
    sheet.freeze_panes(1, 0)
    sheet.autofilter(0, 0, max(len(data.payments), 1), len(COLUMNS) - 1)
    book.close()
    return out.getvalue()
