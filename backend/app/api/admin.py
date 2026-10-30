"""The founder's admin page (founder's pick 2B, 2026-10-14): every shop
at once, so unscoped, and only for an admin account (the Admin guard)."""

import uuid
from datetime import datetime

from fastapi import APIRouter

from app.api.deps import Admin, UnscopedDb
from app.schemas.admin import AdminCloseIn, AdminLogOut, AdminReopenIn
from app.schemas.plan import (
    AdminConfirmIn,
    AdminOverviewOut,
    AdminPaymentIn,
    AdminRejectIn,
    AdminShopDetailOut,
    AdminShopOut,
)
from app.services import admin as admin_service
from app.services import admin_log

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview", response_model=AdminOverviewOut)
async def overview(_: Admin, db: UnscopedDb) -> AdminOverviewOut:
    """Home: the numbers across every shop, then what needs the admin."""
    return await admin_service.overview(db)


@router.get("/shops", response_model=list[AdminShopOut])
async def list_shops(_: Admin, db: UnscopedDb) -> list[AdminShopOut]:
    return await admin_service.list_shops(db)


@router.get("/shops/{store_id}", response_model=AdminShopDetailOut)
async def shop_detail(store_id: uuid.UUID, _: Admin, db: UnscopedDb) -> AdminShopDetailOut:
    return await admin_service.shop_detail(db, store_id)


@router.post("/shops/{store_id}/payments", response_model=AdminShopDetailOut)
async def mark_paid(
    store_id: uuid.UUID, data: AdminPaymentIn, admin: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """A payment made by hand (or free time: amount 0)."""
    return await admin_service.mark_paid(db, admin.admin_id, store_id, data)


@router.post("/shops/{store_id}/payments/{payment_id}/confirm", response_model=AdminShopDetailOut)
async def confirm(
    store_id: uuid.UUID, payment_id: uuid.UUID, data: AdminConfirmIn, admin: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """The seller's "I've paid", found in the bank."""
    return await admin_service.confirm(db, admin.admin_id, store_id, payment_id, data)


@router.post("/shops/{store_id}/payments/{payment_id}/reject", response_model=AdminShopDetailOut)
async def reject(
    store_id: uuid.UUID, payment_id: uuid.UUID, data: AdminRejectIn, admin: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """Not found: the seller sees the note."""
    return await admin_service.reject(db, admin.admin_id, store_id, payment_id, data)


@router.post("/shops/{store_id}/close", response_model=AdminShopDetailOut)
async def close_shop(
    store_id: uuid.UUID, data: AdminCloseIn, admin: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """The link stops and every login of the shop is logged out; nothing
    is erased. 409 SHOP_ALREADY_CLOSED."""
    return await admin_service.set_open(db, admin.admin_id, store_id, data, is_open=False)


@router.post("/shops/{store_id}/reopen", response_model=AdminShopDetailOut)
async def reopen_shop(
    store_id: uuid.UUID, data: AdminReopenIn, admin: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """The link and the logins work again. 409 SHOP_ALREADY_OPEN."""
    return await admin_service.set_open(db, admin.admin_id, store_id, data, is_open=True)


@router.get("/log", response_model=list[AdminLogOut])
async def log(
    _: Admin,
    db: UnscopedDb,
    store_id: uuid.UUID | None = None,
    before: datetime | None = None,
) -> list[AdminLogOut]:
    """Everything done from the admin, newest first, 100 at a time (older:
    `before` = the last one's created_at); one shop's with `store_id`."""
    return await admin_log.entries(db, store_id=store_id, before=before)
