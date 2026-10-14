"""The shop's plan with Oak Order (Settings → Plan, 01_PRODUCT.md §33.1)."""

from fastapi import APIRouter, BackgroundTasks, Depends, Request

from app.api.deps import Owner, Seller, TenantDb
from app.core.ratelimit import check_limit
from app.schemas.plan import PaidClaimIn, PlanOut
from app.services import billing
from app.services import plan as plan_service

router = APIRouter(prefix="/seller/plan", tags=["plan"])


# Staff may read it too: the Orders tab tells them when the shop has
# stopped taking new orders. Paying is the owner's.
@router.get("", response_model=PlanOut)
async def get_plan(seller: Seller, db: TenantDb) -> PlanOut:
    return await plan_service.get_plan(db, seller.store_id)


def _claim_rate_limit(request: Request) -> None:
    # Each one can alert the founder.
    check_limit("10/minute", "plan-paid", request)


@router.post("/paid", response_model=PlanOut, dependencies=[Depends(_claim_rate_limit)])
async def say_paid(
    data: PaidClaimIn, seller: Owner, db: TenantDb, background: BackgroundTasks
) -> PlanOut:
    """ "I've paid" (by KHQR or transfer to Oak): waits for the founder to
    find it; they get a Telegram alert. Again while one waits: nothing new."""
    payment_id = await billing.claim(seller.store_id, data.period)
    if payment_id is not None:
        background.add_task(billing.notify_claim, seller.store_id, payment_id)
    return await plan_service.get_plan(db, seller.store_id)
