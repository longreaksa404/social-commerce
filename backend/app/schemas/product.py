import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Self

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

from app.models import ProductStatus
from app.schemas.common import Description, Name, Slug

MAX_VARIANTS = 50
MAX_IMAGES = 5

# Always two decimals, so responses read "12.50" whether or not the value
# has been re-read from the database yet.
Money = Annotated[
    Decimal,
    Field(ge=0, max_digits=12, decimal_places=2),
    AfterValidator(lambda v: v.quantize(Decimal("0.01"))),
]
Stock = Annotated[int, Field(ge=0, le=1_000_000)]
Sku = Annotated[str, StringConstraints(strip_whitespace=True, max_length=64)]


class VariantIn(BaseModel):
    id: uuid.UUID | None = None  # set to update an existing variant
    name: Name
    sku: Sku | None = None
    price_override: Money | None = None
    # Omitted: 0 for a new variant, unchanged for an existing one (orders
    # change stock while a seller has the product form open).
    stock_quantity: Stock | None = None


class VariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    sku: str | None
    price_override: Decimal | None
    stock_quantity: int


def _check_variant_names(variants: list[VariantIn] | None) -> None:
    names = [v.name.casefold() for v in variants or []]
    if len(names) != len(set(names)):
        raise ValueError("Each variant needs a different name.")


class ProductCreate(BaseModel):
    name: Name
    slug: Slug | None = None  # generated from the name when omitted
    description: Description | None = None
    category_id: uuid.UUID | None = None
    price: Money
    status: ProductStatus = ProductStatus.ACTIVE
    has_variants: bool = False
    stock_quantity: Stock | None = None
    variants: list[VariantIn] = Field(default_factory=list, max_length=MAX_VARIANTS)

    @model_validator(mode="after")
    def _stock_matches_variants(self) -> Self:
        _check_variant_names(self.variants)
        if self.has_variants and not self.variants:
            raise ValueError("Add at least one variant, or turn variants off.")
        if not self.has_variants and self.variants:
            raise ValueError("Turn variants on to add variants.")
        return self


class ProductUpdate(BaseModel):
    """Omitted fields are left alone. `variants`, when sent, is the full new
    list: ids keep and update a variant, new entries are added, and
    variants missing from the list are removed."""

    name: Name | None = None
    slug: Slug | None = None
    description: Description | None = None
    category_id: uuid.UUID | None = None
    price: Money | None = None
    status: ProductStatus | None = None
    has_variants: bool | None = None
    stock_quantity: Stock | None = None
    variants: list[VariantIn] | None = Field(default=None, max_length=MAX_VARIANTS)
    image_urls: list[str] | None = Field(default=None, max_length=MAX_IMAGES)

    @model_validator(mode="after")
    def _unique_variant_names(self) -> Self:
        _check_variant_names(self.variants)
        return self


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    category_id: uuid.UUID | None
    price: Decimal
    image_urls: list[str]
    status: ProductStatus
    has_variants: bool
    stock_quantity: int | None
    variants: list[VariantOut]
    created_at: datetime
    updated_at: datetime
