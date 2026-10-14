"""The shop's plan with Oak Order (Settings → Plan, 01_PRODUCT.md §33.1)."""

from fastapi import APIRouter

from app.api.deps import Seller, TenantDb
from app.schemas.plan import PlanOut
from app.services import plan as plan_service

router = APIRouter(prefix="/seller/plan", tags=["plan"])


# Staff may read it too: the Orders tab tells them when the shop has
# stopped taking new orders. Paying is the owner's.
@router.get("", response_model=PlanOut)
async def get_plan(seller: Seller, db: TenantDb) -> PlanOut:
    return await plan_service.get_plan(db, seller.store_id)
