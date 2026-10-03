"""Orders. Shop* models are what a customer sees (their own order only, no
seller or other customers' details); the rest are for the seller."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints
from pydantic_core import PydanticCustomError

from app.models import (
    Currency,
    DeliveryMethod,
    DeliveryStatus,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
)
from app.schemas.common import Name
from app.schemas.delivery import CourierName, DeliveryOut, ShopDeliveryOut
from app.schemas.payment import PaymentOut, ShopPaymentOut
from app.schemas.product import Money
from app.services.phone import normalize_phone

MAX_ORDER_LINES = 50
MAX_LINE_QUANTITY = 99


def _phone(value: str) -> str:
    try:
        return normalize_phone(value)
    except ValueError as exc:
        # A custom error type, so the message isn't prefixed "Value error, ".
        raise PydanticCustomError("phone", str(exc)) from exc


Phone = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=32), AfterValidator(_phone)
]
Address = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=500)]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
# The phone's GPS position, to 6 decimals (about 10 cm).
Latitude = Annotated[Decimal, Field(ge=-90, le=90), AfterValidator(lambda v: round(v, 6))]
Longitude = Annotated[Decimal, Field(ge=-180, le=180), AfterValidator(lambda v: round(v, 6))]


class OrderLineIn(BaseModel):
    product_id: uuid.UUID
    variant_id: uuid.UUID | None = None  # required when the product has variants
    quantity: int = Field(ge=1, le=MAX_LINE_QUANTITY)


class OrderCreate(BaseModel):
    """Guest checkout: no login, the customer is matched by phone."""

    name: Name
    phone: Phone
    notes: Note | None = None
    items: list[OrderLineIn] = Field(min_length=1, max_length=MAX_ORDER_LINES)
    payment_method: PaymentMethod  # one the shop takes (ShopStoreOut.payment_methods)
    delivery_method: DeliveryMethod  # one the shop offers (ShopStoreOut.delivery)
    # One of the shop's couriers; null = the shop's own delivery. Ignored
    # for pickup.
    courier: CourierName | None = None
    # A delivery needs the typed address, the GPS location, or both. All
    # ignored for pickup.
    delivery_address: Address | None = None
    delivery_lat: Latitude | None = None
    delivery_lng: Longitude | None = None
    delivery_address_note: Note | None = None
    # The total the customer was shown. If prices, fees or discounts changed
    # since, the order is refused rather than charged at a total they
    # didn't see.
    expected_total: Money
    # The shop link this device opened in the last 7 days (?l=<token>), if
    # any; the order counts for it. Unknown tokens are ignored.
    link: Annotated[str, StringConstraints(max_length=16)] | None = None


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: uuid.UUID
    variant_id: uuid.UUID | None  # null once the seller deletes the variant
    product_name: str = Field(validation_alias="product_name_snapshot")
    variant_name: str | None = Field(validation_alias="variant_name_snapshot")
    unit_price: Decimal = Field(validation_alias="unit_price_snapshot")
    quantity: int
    line_total: Decimal


class ShopOrderOut(BaseModel):
    """The confirmation page and order tracking (02_TECHNICAL.md section 8)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    number: int
    status: OrderStatus
    created_at: datetime
    currency: Currency
    subtotal: Decimal
    discount: Decimal
    delivery_fee: Decimal
    total: Decimal  # subtotal - discount + delivery_fee
    delivery_method: DeliveryMethod
    items: list[OrderItemOut]
    payment: ShopPaymentOut
    delivery: ShopDeliveryOut


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone: str
    address: str | None


class OrderOut(ShopOrderOut):
    updated_at: datetime
    delivery_address: str | None
    delivery_lat: Decimal | None
    delivery_lng: Decimal | None
    delivery_address_note: str | None
    notes: str | None
    source: str | None  # where the shop link it came through was posted, e.g. "tiktok"
    customer: CustomerOut
    payment: PaymentOut  # the seller's view of it, with what they can record next
    delivery: DeliveryOut  # likewise
    # What the seller can move the order to now (the state machine plus the
    # completion rule), so the app doesn't keep its own copy of the rules.
    next_statuses: list[OrderStatus] = []


class OrderSummaryOut(BaseModel):
    """A row in the seller's order list."""

    id: uuid.UUID
    number: int
    status: OrderStatus
    created_at: datetime
    currency: Currency
    total: Decimal
    customer_name: str
    item_count: int  # units, not lines
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    delivery_method: DeliveryMethod
    delivery_status: DeliveryStatus


class OrderListOut(BaseModel):
    orders: list[OrderSummaryOut]
    has_more: bool
    # Orders per status within the date range, ignoring the status filter
    # (for the filter tabs).
    counts: dict[OrderStatus, int]


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
