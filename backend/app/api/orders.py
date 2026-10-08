"""Seller order management (02_TECHNICAL.md section 6.2, "Seller - Orders")."""

import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Query, Response

from app.api.deps import Owner, Seller, TenantDb
from app.core.errors import AppError
from app.models import OrderStatus
from app.schemas.delivery import DeliveryUpdate
from app.schemas.order import OrderListOut, OrderOut, OrderStatusUpdate
from app.schemas.payment import PaymentUpdate
from app.services import export as export_service
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


XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


# Before /{order_id}, which would take "export" for an order id.
@router.get("/export", response_class=Response, responses={200: {"content": {XLSX: {}}}})
async def export_orders(
    seller: Owner,  # in Settings, which staff don't have
    db: TenantDb,
    first: date,
    last: date,
    lang: Literal["en", "km"] = "en",
) -> Response:
    """The orders placed from `first` to `last` (days in Phnom Penh, both
    included) as an Excel file, for the seller's own accounts."""
    if last < first or (last - first).days > 366:
        raise AppError(
            422, "INVALID_DATE_RANGE", "Choose up to a year, ending after it starts.", "last"
        )
    orders = await export_service.load_orders(db, seller.store_id, first, last)
    return Response(
        export_service.workbook(orders, lang),
        media_type=XLSX,
        headers={"Content-Disposition": f'attachment; filename="orders-{first}-to-{last}.xlsx"'},
    )


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: uuid.UUID, seller: Seller, db: TenantDb) -> OrderOut:
    order = await order_service.get_order(db, seller.store_id, order_id)
    return await order_service.order_out(db, seller.store_id, order)


@router.patch("/{order_id}/status", response_model=OrderOut)
async def change_status(
    order_id: uuid.UUID, data: OrderStatusUpdate, seller: Seller, db: TenantDb
) -> OrderOut:
    """Moves the order along the state machine (02 section 7.1)."""
    order = await order_service.change_status(db, seller.store_id, order_id, data.status)
    return await order_service.order_out(db, seller.store_id, order)


@router.patch("/{order_id}/payment", response_model=OrderOut)
async def record_payment(
    order_id: uuid.UUID, data: PaymentUpdate, seller: Seller, db: TenantDb
) -> OrderOut:
    """Marks the payment paid or failed (02 section 7.2). Recording it can
    let the order complete (section 7.4), so the whole order comes back."""
    order = await order_service.record_payment(db, seller.store_id, order_id, data)
    return await order_service.order_out(db, seller.store_id, order)


@router.patch("/{order_id}/delivery", response_model=OrderOut)
async def record_delivery(
    order_id: uuid.UUID, data: DeliveryUpdate, seller: Seller, db: TenantDb
) -> OrderOut:
    """Moves the delivery along its own state machine (02 section 7.3).
    Delivering it can let the order complete (section 7.4), so the whole
    order comes back."""
    order = await order_service.record_delivery(db, seller.store_id, order_id, data)
    return await order_service.order_out(db, seller.store_id, order)
