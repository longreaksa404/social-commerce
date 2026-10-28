"""The founder's admin page (founder's pick 2B, 2026-10-14): every shop
at once, so unscoped, and only for an admin account (the Admin guard)."""

import uuid

from fastapi import APIRouter

from app.api.deps import Admin, UnscopedDb
from app.schemas.plan import (
    AdminConfirmIn,
    AdminOverviewOut,
    AdminPaymentIn,
    AdminRejectIn,
    AdminShopDetailOut,
    AdminShopOut,
)
from app.services import admin as admin_service

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
    store_id: uuid.UUID, data: AdminPaymentIn, _: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """A payment made by hand (or free time: amount 0)."""
    return await admin_service.mark_paid(db, store_id, data)


@router.post("/shops/{store_id}/payments/{payment_id}/confirm", response_model=AdminShopDetailOut)
async def confirm(
    store_id: uuid.UUID, payment_id: uuid.UUID, data: AdminConfirmIn, _: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """The seller's "I've paid", found in the bank."""
    return await admin_service.confirm(db, store_id, payment_id, data)


@router.post("/shops/{store_id}/payments/{payment_id}/reject", response_model=AdminShopDetailOut)
async def reject(
    store_id: uuid.UUID, payment_id: uuid.UUID, data: AdminRejectIn, _: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """Not found: the seller sees the note."""
    return await admin_service.reject(db, store_id, payment_id, data)
