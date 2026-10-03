"""Delivery and discounts: the seller's settings (store.delivery_config and
store.discount_config), and an order's delivery as the seller and as the
customer see it."""

from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models import DeliveryMethod, DeliveryStatus
from app.schemas.product import Money

MAX_COURIERS = 10
MAX_DISCOUNT_RULES = 5

CourierName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
PickupAddress = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
AssigneeNote = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class OwnDeliverySettings(BaseModel):
    """The seller, or someone they send, brings the order."""

    enabled: bool = True  # on for every new shop, so it can take orders at once


class PickupSettings(BaseModel):
    """The customer collects the order. Always free. Kept when turned off."""

    enabled: bool = False
    address: PickupAddress = ""  # shown at checkout and on the order page


class DeliverySettings(BaseModel):
    """How a shop gets orders to customers (decided 2026-10-03): its own
    delivery and/or couriers it sends with, for one fee wherever the
    customer is, and/or pickup. Missing parts mean the defaults, so a new
    store delivers itself, for free."""

    fee: Money = Decimal("0.00")  # for any delivery, own or courier; 0 = free
    # Free delivery once the items come to this much (before any
    # discount), or to this many units. Null = no such rule.
    free_from_amount: Money | None = None
    free_from_items: int | None = Field(default=None, ge=1, le=999)
    own_delivery: OwnDeliverySettings = OwnDeliverySettings()
    # e.g. ["J&T Express", "VET Express"]: the customer picks one.
    couriers: list[CourierName] = Field(default=[], max_length=MAX_COURIERS)
    pickup: PickupSettings = PickupSettings()

    def enabled_methods(self) -> list[DeliveryMethod]:
        on = {
            DeliveryMethod.SELLER_DELIVERY: self.own_delivery.enabled or bool(self.couriers),
            DeliveryMethod.PICKUP: self.pickup.enabled,
        }
        return [method for method in DeliveryMethod if on[method]]


class DiscountRule(BaseModel):
    """e.g. 5.00 off once the items come to 40.00 or more."""

    min_subtotal: Money
    amount_off: Money


class DiscountSettings(BaseModel):
    """The shop's bill discounts. The biggest one the order reaches applies;
    they never add up."""

    rules: list[DiscountRule] = Field(default=[], max_length=MAX_DISCOUNT_RULES)


class DeliveryOut(BaseModel):
    """An order's delivery, for the seller."""

    model_config = ConfigDict(from_attributes=True)

    method: DeliveryMethod
    status: DeliveryStatus
    courier: str | None  # null = the seller's own delivery (or pickup)
    assignee_note: str | None
    updated_at: datetime
    # What the seller can move it to now (02 section 7.3), so the app
    # doesn't keep its own copy of the rules.
    next_statuses: list[DeliveryStatus] = []


class DeliveryUpdate(BaseModel):
    status: DeliveryStatus
    # e.g. "Sokha, 012 999 888" or "VET Takeo branch, no. 123456";
    # replaces the old note if given.
    assignee_note: AssigneeNote | None = None


class ShopDeliveryOut(BaseModel):
    """An order's delivery, for the customer who placed it."""

    model_config = ConfigDict(from_attributes=True)

    method: DeliveryMethod
    status: DeliveryStatus
    courier: str | None
    # Where to collect a pickup order: the shop's current pickup address,
    # while the order is on. Null otherwise.
    pickup_address: str | None = None


class ShopPickup(BaseModel):
    address: str


class ShopDeliveryOptions(BaseModel):
    """What checkout offers."""

    fee: Decimal
    free_from_amount: Decimal | None
    free_from_items: int | None
    own_delivery: bool
    couriers: list[str]
    pickup: ShopPickup | None  # null = no pickup
