import uuid

from fastapi import APIRouter, status

from app.api.deps import Seller, TenantDb
from app.models import ProductStatus
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services import product as product_service

router = APIRouter(prefix="/seller/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
async def list_products(
    seller: Seller,
    db: TenantDb,
    status: ProductStatus | None = None,
    category_id: uuid.UUID | None = None,
) -> list[ProductOut]:
    return await product_service.list_products(db, seller.store_id, status, category_id)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(data: ProductCreate, seller: Seller, db: TenantDb) -> ProductOut:
    return await product_service.create_product(db, seller.store_id, data)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: uuid.UUID, seller: Seller, db: TenantDb) -> ProductOut:
    return await product_service.get_product(db, seller.store_id, product_id)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: uuid.UUID, data: ProductUpdate, seller: Seller, db: TenantDb
) -> ProductOut:
    return await product_service.update_product(db, seller.store_id, product_id, data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_product(product_id: uuid.UUID, seller: Seller, db: TenantDb) -> None:
    await product_service.deactivate_product(db, seller.store_id, product_id)
