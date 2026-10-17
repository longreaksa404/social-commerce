"""The founder's admin page (founder's pick 2B, 2026-10-14): every shop's
plan with Oak Order and its code, the sellers' "I've paid" to check, and
marking payments made by hand (01_PRODUCT.md §33.1).

It reads across every shop, so on an unscoped session, and only behind
the Admin guard (api/deps.py): a login whose phone number is in
ADMIN_PHONES.
"""

import uuid
from collections import defaultdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.config import get_settings
from app.core.errors import AppError, NotFound
from app.models import PlanPayment, PlanPaymentStatus, Seller, Store
from app.schemas.plan import (
    AdminConfirmIn,
    AdminPaymentIn,
    AdminPaymentOut,
    AdminRejectIn,
    AdminShopDetailOut,
    AdminShopOut,
    PlanPaymentOut,
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


def is_admin(seller: Seller) -> bool:
    return seller.phone is not None and seller.phone in admin_phones()


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
