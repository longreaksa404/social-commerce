"""Seller order management (02_TECHNICAL.md section 6.2, "Seller - Orders")."""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import Seller, TenantDb
from app.models import OrderStatus
from app.schemas.order import OrderListOut, OrderOut, OrderStatusUpdate
from app.schemas.payment import PaymentUpdate
from app.services import order as order_service

router = APIRouter(prefix="/seller/orders", tags=["orders"])


@router.get("", response_model=OrderListOut)
async def list_orders(
    seller: Seller,
    db: TenantDb,
    status: Annotated[list[OrderStatus] | None, Query()] = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> OrderListOut:
    """Newest first. `status` may repeat (?status=accepted&status=ready)."""
    return await order_service.list_orders(
        db,
        seller.store_id,
        statuses=status,
        created_from=created_from,
        created_to=created_to,
        limit=limit,
        offset=offset,
    )


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: uuid.UUID, seller: Seller, db: TenantDb) -> OrderOut:
    return order_service.order_out(await order_service.get_order(db, seller.store_id, order_id))


@router.patch("/{order_id}/status", response_model=OrderOut)
async def change_status(
    order_id: uuid.UUID, data: OrderStatusUpdate, seller: Seller, db: TenantDb
) -> OrderOut:
    """Moves the order along the state machine (02 section 7.1)."""
    order = await order_service.change_status(db, seller.store_id, order_id, data.status)
    return order_service.order_out(order)


@router.patch("/{order_id}/payment", response_model=OrderOut)
async def record_payment(
    order_id: uuid.UUID, data: PaymentUpdate, seller: Seller, db: TenantDb
) -> OrderOut:
    """Marks the payment paid or failed (02 section 7.2). Recording it can
    let the order complete (section 7.4), so the whole order comes back."""
    order = await order_service.record_payment(db, seller.store_id, order_id, data)
    return order_service.order_out(order)
