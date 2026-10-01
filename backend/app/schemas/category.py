import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import Name, Slug


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    product_count: int = 0
    created_at: datetime


class CategoryCreate(BaseModel):
    name: Name
    slug: Slug | None = None  # generated from the name when omitted


class CategoryUpdate(BaseModel):
    name: Name | None = None
    slug: Slug | None = None
