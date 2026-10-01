import uuid

from fastapi import APIRouter, status

from app.api.deps import Seller, TenantDb
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.services import category as category_service

router = APIRouter(prefix="/seller/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
async def list_categories(seller: Seller, db: TenantDb) -> list[CategoryOut]:
    return await category_service.list_categories(db, seller.store_id)


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(data: CategoryCreate, seller: Seller, db: TenantDb) -> CategoryOut:
    return await category_service.create_category(db, seller.store_id, data)


@router.patch("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: uuid.UUID, data: CategoryUpdate, seller: Seller, db: TenantDb
) -> CategoryOut:
    return await category_service.update_category(db, seller.store_id, category_id, data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: uuid.UUID, seller: Seller, db: TenantDb) -> None:
    await category_service.delete_category(db, seller.store_id, category_id)
