"""The shop's numbers on the Orders tab (founder's picks 8B, 9B)."""

from typing import Literal

from fastapi import APIRouter

from app.api.deps import Owner, TenantDb
from app.schemas.stats import StatsOut
from app.services import stats as stats_service
from app.services import store as store_service

router = APIRouter(prefix="/seller/stats", tags=["stats"])


@router.get("", response_model=StatsOut)
async def get_stats(
    seller: Owner,  # what the shop earns is the owner's (pick 9B)
    db: TenantDb,
    period: Literal["today", "week", "month"] = "today",
) -> StatsOut:
    store = await store_service.get_store(db, seller.store_id)
    return await stats_service.shop_stats(db, seller.store_id, store.currency, period)
