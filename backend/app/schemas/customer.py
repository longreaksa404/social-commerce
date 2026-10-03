"""The seller's customers (guest customers, matched by phone at checkout)."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models import Currency
from app.schemas.order import OrderSummaryOut


class AmountOut(BaseModel):
    currency: Currency
    amount: Decimal


class CustomerSummaryOut(BaseModel):
    """A row in the seller's customer list."""

    id: uuid.UUID
    name: str  # as typed at their latest order
    phone: str
    order_count: int  # every order, rejected and cancelled ones too
    last_order_at: datetime | None
    # What their orders came to, except rejected and cancelled ones; orders
    # still on their way count (decided 2026-10-03). Per currency, in case
    # the shop changed its currency: usually just one.
    spent: list[AmountOut]


class CustomerListOut(BaseModel):
    customers: list[CustomerSummaryOut]
    has_more: bool
    total: int  # customers matching the search, on every page


class CustomerDetailOut(BaseModel):
    """A customer's page: who they are and their orders."""

    id: uuid.UUID
    name: str
    phone: str
    address: str | None  # their latest delivery address
    created_at: datetime  # their first order
    order_count: int
    spent: list[AmountOut]  # as in CustomerSummaryOut
    # Newest first; only the latest MAX_HISTORY when there are more than
    # that (order_count says how many).
    orders: list[OrderSummaryOut]
