"""The admin panel (01_PRODUCT.md §22.11) from Step 2 on: its log, people
and logins, closing a shop. Home, the shop list and a shop's page are in
schemas/plan.py, where they began."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AdminLogOut(BaseModel):
    """One line of the admin's log (part 28)."""

    id: uuid.UUID
    created_at: datetime
    action: str
    store_id: uuid.UUID | None
    shop: str | None  # its name now; as it was, once the shop is gone
    reason: str | None
    details: dict[str, Any]


class AdminCloseIn(BaseModel):
    """Close a shop (part 5): why, for the log."""

    model_config = ConfigDict(str_strip_whitespace=True)
    reason: str = Field(min_length=1, max_length=300)


class AdminReopenIn(BaseModel):
    reason: str | None = Field(default=None, max_length=300)


class AdminLoginOut(BaseModel):
    """A Google or Facebook account connected to a login."""

    provider: str
    label: str | None  # its email, or its name


class AdminSellerOut(BaseModel):
    """One login, an owner's or a helper's (parts 8 to 12)."""

    id: uuid.UUID
    name: str
    phone: str | None
    email: str | None  # older accounts log in with it
    role: str  # owner, staff
    store_id: uuid.UUID
    shop: str
    code: str  # the shop's code: asked for before changing their phone
    is_open: bool  # false once its shop is closed
    has_password: bool
    logins: list[AdminLoginOut]
    last_seen: datetime | None  # the last time the app renewed its login


class AdminPhoneIn(BaseModel):
    phone: str = Field(min_length=6, max_length=30)


class AdminOpenIn(BaseModel):
    """Open as seller (D1A): why, for the log."""

    model_config = ConfigDict(str_strip_whitespace=True)
    reason: str = Field(min_length=1, max_length=300)


class AdminActingOut(BaseModel):
    """The owner's access for 30 minutes, naming the admin; no refresh."""

    access_token: str
    expires_at: datetime
    store_id: uuid.UUID
    shop: str


class AdminNewPasswordOut(BaseModel):
    """Shown once, for the admin to send or read out."""

    password: str


class AdminOrderOut(BaseModel):
    """An order found from the admin (part 19): look only."""

    id: uuid.UUID
    store_id: uuid.UUID
    shop: str
    number: int
    created_at: datetime
    customer_name: str
    customer_phone: str
    items: list[str]  # "Clear case iPhone 15 (Black) × 1"
    currency: str
    delivery_fee: Decimal
    total: Decimal
    status: str  # the order's own
    payment_method: str
    payment_status: str
    delivery_method: str
    delivery_status: str
    seller: str  # the owner's name
    seller_phone: str | None


class AdminCustomerShopOut(BaseModel):
    store_id: uuid.UUID
    shop: str
    customer_id: uuid.UUID
    orders: int
    last_order_at: datetime | None
    telegram: bool  # gets updates on Telegram


class AdminCustomerOut(BaseModel):
    """One phone number in every shop it ordered from (part 20)."""

    phone: str
    name: str  # their newest name
    shops: list[AdminCustomerShopOut]


class AdminForgetIn(BaseModel):
    """Remove a customer's details (part 21): from one shop or every shop,
    with REMOVE typed and the admin's password, every time."""

    phone: str = Field(min_length=6, max_length=30)
    store_id: uuid.UUID | None = None  # None: every shop
    confirm: Literal["REMOVE"]
    password: str = Field(min_length=1, max_length=200)


class AdminForgetOut(BaseModel):
    shops: int
    orders: int


class AdminProductOut(BaseModel):
    """A product of any shop (part 22, pick 14A)."""

    id: uuid.UUID
    store_id: uuid.UUID
    shop: str
    name: str
    price: Decimal
    currency: str
    image_url: str | None
    status: str  # active, inactive (hidden)
    created_at: datetime


class AdminHideIn(BaseModel):
    reason: str | None = Field(default=None, max_length=300)


class AdminSettingsIn(BaseModel):
    """Oak Order's own settings (D2B, pick 11A): one Save for all."""

    khr_per_usd: int = Field(ge=1000, le=10000)
    month: Decimal = Field(gt=0, le=1000, decimal_places=2)
    year: Decimal = Field(gt=0, le=10000, decimal_places=2)
    trial_days: int = Field(ge=1, le=365)


class AdminSettingsOut(AdminSettingsIn):
    paying_shops: int  # who pays a new price from their next payment
    updated_at: datetime | None  # the last change


class PlanPricesPublicOut(BaseModel):
    """For the Terms' Fees (public): the prices and the trial today."""

    month: Decimal
    year: Decimal
    trial_days: int
    changed_on: date | None  # the day they last changed
