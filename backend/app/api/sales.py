"""The seller's sales on chosen products (founder's test list #21,
2026-10-24): Settings → Discounts."""

import uuid

from fastapi import APIRouter, status

from app.api.deps import Owner, TenantDb
from app.schemas.sale import SaleIn, SaleOut
from app.services import sale as sale_service

router = APIRouter(prefix="/seller/sales", tags=["sales"])


@router.get("", response_model=list[SaleOut])
async def list_sales(seller: Owner, db: TenantDb) -> list[SaleOut]:
    return await sale_service.list_sales(db, seller.store_id)


@router.post("", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
async def create_sale(data: SaleIn, seller: Owner, db: TenantDb) -> SaleOut:
    return await sale_service.create_sale(db, seller.store_id, data)


@router.put("/{sale_id}", response_model=SaleOut)
async def update_sale(sale_id: uuid.UUID, data: SaleIn, seller: Owner, db: TenantDb) -> SaleOut:
    return await sale_service.update_sale(db, seller.store_id, sale_id, data)


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sale(sale_id: uuid.UUID, seller: Owner, db: TenantDb) -> None:
    await sale_service.delete_sale(db, seller.store_id, sale_id)
