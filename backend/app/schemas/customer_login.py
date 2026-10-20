"""A customer's "Continue with Telegram" (app/services/customer_login.py)."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.order import MAX_LINE_QUANTITY, MAX_ORDER_LINES

Short = Annotated[str, StringConstraints(max_length=200)]


class CartLineIn(BaseModel):
    """A cart line as the shop's page keeps it, to show the cart again
    inside Telegram. Prices and stock are checked again at checkout."""

    product_id: uuid.UUID
    variant_id: uuid.UUID | None = None
    quantity: int = Field(ge=1, le=MAX_LINE_QUANTITY)
    product_slug: Short
    name: Short
    variant_name: Short | None = None
    price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    image_url: Annotated[str, StringConstraints(max_length=500)] | None = None


class TelegramLoginIn(BaseModel):
    lines: list[CartLineIn] = Field(default_factory=list, max_length=MAX_ORDER_LINES)


class ShopCustomerOut(BaseModel):
    """What checkout fills in for a logged-in customer: this shop's name
    and address for them, else the name from Telegram."""

    name: str
    phone: str
    address: str | None = None


class CustomerSessionOut(ShopCustomerOut):
    """The customer, logged in: also the token their device keeps."""

    token: str


class TelegramLoginOut(BaseModel):
    id: uuid.UUID  # the page's secret: it reads the result with it
    telegram_url: str  # t.me/<bot>?start=login_<code>
    expires_at: datetime
    customer: CustomerSessionOut | None = None  # once the phone is shared
