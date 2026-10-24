"""The seller's customers (02_TECHNICAL.md section 6.2, "Seller - Customers")."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import Seller, TenantDb
from app.core.ratelimit import check_limit
from app.schemas.customer import CustomerDetailOut, CustomerListOut
from app.schemas.order import CustomerMessageIn
from app.services import customer as customer_service
from app.services import customer_updates

router = APIRouter(prefix="/seller/customers", tags=["customers"])


@router.get("", response_model=CustomerListOut)
async def list_customers(
    seller: Seller,
    db: TenantDb,
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CustomerListOut:
    """Whoever ordered last first. `q` finds part of a name, or part of a
    phone number typed any way ("012 345", "+855 12 345")."""
    return await customer_service.list_customers(
        db, seller.store_id, search=q, limit=limit, offset=offset
    )


@router.get("/{customer_id}", response_model=CustomerDetailOut)
async def get_customer(customer_id: uuid.UUID, seller: Seller, db: TenantDb) -> CustomerDetailOut:
    """Who they are, with their orders (newest first)."""
    return await customer_service.get_customer(db, seller.store_id, customer_id)


def _message_rate_limit(request: Request) -> None:
    # Each one is a Telegram message to a customer; shared with an order's.
    check_limit("20/minute", "customer-message", request)


@router.post(
    "/{customer_id}/telegram-message",
    status_code=204,
    dependencies=[Depends(_message_rate_limit)],
)
async def message_customer(
    customer_id: uuid.UUID, data: CustomerMessageIn, seller: Seller, db: TenantDb
) -> None:
    """ "Message on Telegram" from the customer's page (founder's test list
    #2, 2026-10-24), like an order's, without the order."""
    await customer_updates.send_to_customer(db, seller.store_id, customer_id, data.text)
