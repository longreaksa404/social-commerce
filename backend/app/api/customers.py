"""The seller's customers (02_TECHNICAL.md section 6.2, "Seller - Customers")."""

from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import Seller, TenantDb
from app.schemas.customer import CustomerListOut
from app.services import customer as customer_service

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
