import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.account import Currency
from app.schemas.common import Description, Name, Slug


class StoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    logo_url: str | None
    currency: Currency
    created_at: datetime


class StoreUpdate(BaseModel):
    name: Name | None = None
    slug: Slug | None = None
    description: Description | None = None
    currency: Currency | None = None
