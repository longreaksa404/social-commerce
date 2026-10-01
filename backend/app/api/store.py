from fastapi import APIRouter

from app.api.deps import Seller, TenantDb
from app.schemas.store import StoreOut, StoreUpdate
from app.services import store as store_service

router = APIRouter(prefix="/seller/store", tags=["store"])


@router.get("", response_model=StoreOut)
async def get_store(seller: Seller, db: TenantDb) -> StoreOut:
    return await store_service.get_store(db, seller.store_id)


@router.patch("", response_model=StoreOut)
async def update_store(data: StoreUpdate, seller: Seller, db: TenantDb) -> StoreOut:
    return await store_service.update_store(db, seller.store_id, data)
