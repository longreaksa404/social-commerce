"""The shop's plan with Oak Order (Settings → Plan, 01_PRODUCT.md §33.1)."""

from fastapi import APIRouter, BackgroundTasks, Depends, Request

from app.api.deps import Owner, Seller, TenantDb, UnscopedDb, current_seller_themselves
from app.core.ratelimit import check_limit
from app.schemas.admin import PlanPricesPublicOut
from app.schemas.plan import PaidClaimIn, PlanOut
from app.services import billing, platform
from app.services import plan as plan_service

router = APIRouter(prefix="/seller/plan", tags=["plan"])
# Oak Order's prices for anyone (the Terms' Fees read them, 2026-10-30).
public_router = APIRouter(prefix="/plan", tags=["plan"])


def _prices_rate_limit(request: Request) -> None:
    check_limit("60/minute", "plan-prices", request)


@public_router.get(
    "/prices", response_model=PlanPricesPublicOut, dependencies=[Depends(_prices_rate_limit)]
)
async def prices(db: UnscopedDb) -> PlanPricesPublicOut:
    """The prices and the trial length set in the admin (D2B)."""
    now = await platform.load(db)
    return PlanPricesPublicOut(
        month=now.month, year=now.year, trial_days=now.trial_days, changed_on=now.terms_changed_on
    )


# Staff may read it too: the Orders tab tells them when the shop has
# stopped taking new orders. Paying is the owner's.
@router.get("", response_model=PlanOut)
async def get_plan(seller: Seller, db: TenantDb) -> PlanOut:
    return await plan_service.get_plan(db, seller.store_id)


@router.post("/open", response_model=PlanOut)
async def open_shop(seller: Owner, db: TenantDb) -> PlanOut:
    """Open the shop: its 30-day free trial starts today and customers can
    order (the dashboard asks first). Opening is the owner's."""
    return await plan_service.open_shop(db, seller.store_id)


def _claim_rate_limit(request: Request) -> None:
    # Each one can alert the founder.
    check_limit("10/minute", "plan-paid", request)


# Paying is the seller's own, never Oak Order's while it has the shop open.
@router.post(
    "/paid",
    response_model=PlanOut,
    dependencies=[Depends(current_seller_themselves), Depends(_claim_rate_limit)],
)
async def say_paid(
    data: PaidClaimIn, seller: Owner, db: TenantDb, background: BackgroundTasks
) -> PlanOut:
    """ "I've paid" (by KHQR or transfer to Oak): waits for the founder to
    find it; they get a Telegram alert. Again while one waits: nothing new."""
    payment_id = await billing.claim(seller.store_id, data.period)
    if payment_id is not None:
        background.add_task(billing.notify_claim, seller.store_id, payment_id)
    return await plan_service.get_plan(db, seller.store_id)
