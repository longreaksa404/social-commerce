"""The shop's plan with Oak Order (Settings → Plan, 01_PRODUCT.md §33.1)."""

import uuid

from fastapi import APIRouter

from app.api.deps import Owner, Seller, TenantDb
from app.schemas.plan import CheckoutIn, CheckoutOut, PlanOut, PlanPaymentOut
from app.services import billing
from app.services import plan as plan_service

router = APIRouter(prefix="/seller/plan", tags=["plan"])


# Staff may read it too: the Orders tab tells them when the shop has
# stopped taking new orders. Paying is the owner's.
@router.get("", response_model=PlanOut)
async def get_plan(seller: Seller, db: TenantDb) -> PlanOut:
    return await plan_service.get_plan(db, seller.store_id)


@router.post("/checkout", response_model=CheckoutOut)
async def checkout(data: CheckoutIn, seller: Owner) -> CheckoutOut:
    """Pay now through PayWay: the form the browser posts to PayWay."""
    return await billing.start_checkout(seller.store_id, data.period, data.auto_charge)


@router.get("/payments/{payment_id}", response_model=PlanPaymentOut)
async def check_payment(payment_id: uuid.UUID, seller: Owner, db: TenantDb) -> PlanPaymentOut:
    """Back from PayWay's page: paid yet? (Asks PayWay while pending.)"""
    return await billing.check_payment(db, seller.store_id, payment_id)


@router.delete("/auto-charge", response_model=PlanOut)
async def turn_off_auto_charge(seller: Owner, db: TenantDb) -> PlanOut:
    await billing.turn_off_auto_charge(seller.store_id)
    return await plan_service.get_plan(db, seller.store_id)
