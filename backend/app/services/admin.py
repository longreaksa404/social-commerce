"""The founder's admin page (founder's pick 2B, 2026-10-14): every shop's
plan with Oak Order and its code, the sellers' "I've paid" to check, and
marking payments made by hand (01_PRODUCT.md §33.1).

It reads across every shop, so on an unscoped session, and only behind
the Admin guard (api/deps.py): a login whose phone number is in
ADMIN_PHONES.
"""

import uuid
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.config import get_settings
from app.core.errors import AppError, NotFound
from app.models import (
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
    Order,
    PlanPayment,
    PlanPaymentStatus,
    PlanPeriod,
    Seller,
    Store,
)
from app.schemas.plan import (
    AdminConfirmIn,
    AdminDayOut,
    AdminNeedOut,
    AdminOverviewOut,
    AdminPaymentIn,
    AdminPaymentOut,
    AdminRejectIn,
    AdminShopDetailOut,
    AdminShopOut,
    AdminShopsCount,
    PlanPaymentOut,
    PlanStage,
)
from app.services import plan as plan_service
from app.services.phone import normalize_phone


def admin_phones() -> set[str]:
    phones = set()
    for raw in get_settings().admin_phones.split(","):
        try:
            phones.add(normalize_phone(raw))
        except ValueError:
            continue
    return phones


def _shop(store: Store, owner: Seller, payments: list[PlanPayment], today: date) -> AdminShopOut:
    paid = [p for p in payments if p.status is PlanPaymentStatus.PAID]
    claim = plan_service.open_claim(payments)
    return AdminShopOut(
        id=store.id,
        name=store.name,
        slug=store.slug,
        code=plan_service.shop_code(store.id),
        login=owner.phone or owner.email or "",
        is_open=owner.is_active,
        telegram=store.telegram_chat_id is not None,
        created_at=store.created_at,
        stage=plan_service.stage(store.paid_until, today),
        on_trial=not paid,
        paid_until=store.paid_until,
        pay_by=plan_service.pay_by(store.paid_until),
        last_paid_on=max((p.paid_on for p in paid if p.paid_on), default=None),
        claim=PlanPaymentOut.model_validate(claim) if claim else None,
    )


async def list_shops(db: AsyncSession) -> list[AdminShopOut]:
    """Every shop, the soonest to run out first."""
    rows = (
        await db.execute(
            select(Store, Seller)
            .join(Seller, Seller.id == Store.seller_id)
            .order_by(Store.paid_until, Store.name)
        )
    ).all()
    by_store: dict[uuid.UUID, list[PlanPayment]] = defaultdict(list)
    for payment in await db.scalars(select(PlanPayment).order_by(PlanPayment.created_at.desc())):
        by_store[payment.store_id].append(payment)
    today = clock.today()
    return [_shop(store, owner, by_store[store.id], today) for store, owner in rows]


# A shop still in setup this long after signing up shows on Home.
NOT_OPENED_DAYS = 7
DAYS = 30


def _pp_day(column):
    """A timestamp's day in Phnom Penh (UTC+7 all year). The zone is written
    in the SQL, not bound, so GROUP BY matches the selected expression."""
    return func.date(func.timezone(literal_column("'Asia/Phnom_Penh'"), column))


async def overview(db: AsyncSession) -> AdminOverviewOut:
    """The admin's Home (founder's pick 3B, 2026-10-28): the numbers across
    every shop, then the shops that need the admin, most urgent first."""
    shops = await list_shops(db)
    today = clock.today()
    open_shops = [s for s in shops if s.is_open]
    running = [s for s in open_shops if s.stage not in (PlanStage.SETUP, PlanStage.STOPPED)]
    count = AdminShopsCount(
        total=len(shops),
        setup=sum(s.stage is PlanStage.SETUP for s in open_shops),
        trial=sum(s.on_trial for s in running),
        paying=sum(not s.on_trial for s in running),
        stopped=sum(s.stage is PlanStage.STOPPED for s in open_shops),
        closed=len(shops) - len(open_shops),
    )

    paid = list(
        await db.scalars(
            select(PlanPayment)
            .where(PlanPayment.status == PlanPaymentStatus.PAID)
            .order_by(PlanPayment.covers_until.desc())
        )
    )
    month = [
        p
        for p in paid
        if p.paid_on and (p.paid_on.year, p.paid_on.month) == (today.year, today.month)
    ]
    year = [p for p in paid if p.paid_on and p.paid_on.year == today.year]
    latest: dict[uuid.UUID, PlanPayment] = {}
    for payment in paid:
        latest.setdefault(payment.store_id, payment)
    income = Decimal("0")
    for shop in running:
        last = latest.get(shop.id)
        if last is not None and last.amount > 0:
            income += last.amount if last.period is PlanPeriod.MONTH else last.amount / 12

    first = today - timedelta(days=DAYS - 1)
    since = datetime.combine(first, datetime.min.time(), clock.PHNOM_PENH)
    orders = dict(
        (
            await db.execute(
                select(_pp_day(Order.created_at), func.count())
                .where(Order.created_at >= since)
                .group_by(_pp_day(Order.created_at))
            )
        ).all()
    )
    signups = dict(
        (
            await db.execute(
                select(_pp_day(Store.created_at), func.count())
                .where(Store.created_at >= since)
                .group_by(_pp_day(Store.created_at))
            )
        ).all()
    )
    days = [
        AdminDayOut(day=d, orders=orders.get(d, 0), signups=signups.get(d, 0))
        for d in (first + timedelta(days=i) for i in range(DAYS))
    ]
    failed = await db.scalar(
        select(func.count())
        .select_from(NotificationLog)
        .where(
            NotificationLog.channel == NotificationChannel.TELEGRAM,
            NotificationLog.status == NotificationStatus.FAILED,
            NotificationLog.sent_at >= datetime.now(UTC) - timedelta(hours=24),
        )
    )

    return AdminOverviewOut(
        shops=count,
        collected_month=sum((p.amount for p in month), Decimal("0")),
        payments_month=len(month),
        collected_year=sum((p.amount for p in year), Decimal("0")),
        monthly_income=income.quantize(Decimal("0.01")),
        orders_today=days[-1].orders,
        orders_week=sum(d.orders for d in days[-7:]),
        days=days,
        needs=_needs(shops, today),
        telegram_failed=failed or 0,
    )


def _needs(shops: list[AdminShopOut], today: date) -> list[AdminNeedOut]:
    """Waiting "I've paid" first, then orders stopped, unpaid, ending soon,
    and shops not opened a week after signing up."""
    needs: list[AdminNeedOut] = []
    for shop in shops:
        if shop.claim is not None:
            needs.append(
                AdminNeedOut(
                    kind="claim",
                    store_id=shop.id,
                    name=shop.name,
                    day=shop.claim.created_at.astimezone(clock.PHNOM_PENH).date(),
                    amount=shop.claim.amount,
                    period=shop.claim.period,
                )
            )
    order = {"stopped": 1, "unpaid": 2, "ending": 3, "not_opened": 4}
    for shop in shops:
        if not shop.is_open or shop.claim is not None:
            continue
        kind, day = None, None
        if shop.stage is PlanStage.STOPPED:
            kind, day = "stopped", shop.pay_by
        elif shop.stage is PlanStage.OVERDUE:
            kind, day = "unpaid", shop.pay_by
        elif shop.stage is PlanStage.ENDING_SOON:
            kind, day = "ending", shop.paid_until
        elif shop.stage is PlanStage.SETUP:
            signed_up = shop.created_at.astimezone(clock.PHNOM_PENH).date()
            if (today - signed_up).days >= NOT_OPENED_DAYS:
                kind, day = "not_opened", signed_up
        if kind:
            needs.append(
                AdminNeedOut(
                    kind=kind, store_id=shop.id, name=shop.name, day=day, on_trial=shop.on_trial
                )
            )
    return sorted(needs, key=lambda n: (0 if n.kind == "claim" else order[n.kind], n.day or today))


async def shop_detail(db: AsyncSession, store_id: uuid.UUID) -> AdminShopDetailOut:
    row = (
        await db.execute(
            select(Store, Seller)
            .join(Seller, Seller.id == Store.seller_id)
            .where(Store.id == store_id)
        )
    ).first()
    if row is None:
        raise NotFound("STORE_NOT_FOUND", "Shop not found.")
    store, owner = row
    payments = await plan_service.payments_of(db, store_id)
    shop = _shop(store, owner, payments, clock.today())
    return AdminShopDetailOut(
        **shop.model_dump(),
        payments=[AdminPaymentOut.model_validate(p) for p in payments],
    )


async def _locked(db: AsyncSession, store_id: uuid.UUID) -> Store:
    store = await db.scalar(select(Store).where(Store.id == store_id).with_for_update())
    if store is None:
        raise NotFound("STORE_NOT_FOUND", "Shop not found.")
    return store


async def mark_paid(
    db: AsyncSession, store_id: uuid.UUID, data: AdminPaymentIn
) -> AdminShopDetailOut:
    """A payment made by hand: covers the next month or year at once. An
    amount of 0 gives free time."""
    store = await _locked(db, store_id)
    plan_service.record_payment(
        db, store, data.period, amount=data.amount, reference=(data.note or "").strip() or None
    )
    await db.commit()
    return await shop_detail(db, store_id)


async def _claim(db: AsyncSession, store_id: uuid.UUID, payment_id: uuid.UUID) -> PlanPayment:
    payment = await db.scalar(
        select(PlanPayment)
        .where(PlanPayment.id == payment_id, PlanPayment.store_id == store_id)
        .with_for_update()
    )
    if payment is None:
        raise NotFound("PAYMENT_NOT_FOUND", "Payment not found.")
    if payment.status is not PlanPaymentStatus.PENDING:
        raise AppError(409, "PAYMENT_NOT_WAITING", "This payment was already checked.")
    return payment


async def confirm(
    db: AsyncSession, store_id: uuid.UUID, payment_id: uuid.UUID, data: AdminConfirmIn
) -> AdminShopDetailOut:
    """The seller's "I've paid", found: paid, the next month or year covered."""
    store = await _locked(db, store_id)
    payment = await _claim(db, store_id, payment_id)
    if data.amount is not None:
        payment.amount = data.amount
    payment.reference = (data.note or "").strip() or None
    plan_service.mark_paid(payment, store)
    await db.commit()
    return await shop_detail(db, store_id)


async def reject(
    db: AsyncSession, store_id: uuid.UUID, payment_id: uuid.UUID, data: AdminRejectIn
) -> AdminShopDetailOut:
    """Not found: the seller sees the note and can say they paid again."""
    payment = await _claim(db, store_id, payment_id)
    payment.status = PlanPaymentStatus.FAILED
    payment.failure = data.note.strip()
    await db.commit()
    return await shop_detail(db, store_id)
