import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.account import Currency, OrderConfirmationMode
from app.schemas.common import Description, Name, Slug
from app.schemas.payment import PaymentSettings


class StoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    logo_url: str | None
    currency: Currency
    # automatic: new orders are accepted at once; manual: they wait as pending.
    order_confirmation_mode: OrderConfirmationMode
    payment_settings: PaymentSettings = Field(validation_alias="payment_config")
    created_at: datetime


class StoreUpdate(BaseModel):
    name: Name | None = None
    slug: Slug | None = None
    description: Description | None = None
    currency: Currency | None = None
    order_confirmation_mode: OrderConfirmationMode | None = None
    # All of it at once: the settings screen sends the whole thing.
    payment_settings: PaymentSettings | None = None
