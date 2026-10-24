import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.schemas.product import Money

MAX_SALE_PRODUCTS = 200


class SaleIn(BaseModel):
    """A sale on chosen products (founder's test list #21, 2026-10-24):
    `percent_off` or `amount_off` (in the shop's currency), not both."""

    name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=40)] | None = None
    percent_off: int | None = Field(default=None, ge=1, le=90)
    amount_off: Money | None = Field(default=None, gt=0)
    product_ids: list[uuid.UUID] = Field(min_length=1, max_length=MAX_SALE_PRODUCTS)
    # The last day of the sale (Phnom Penh); null: until removed.
    ends_on: date | None = None

    @model_validator(mode="after")
    def _one_kind(self) -> Self:
        if (self.percent_off is None) == (self.amount_off is None):
            raise ValueError("Choose a percentage or an amount off.")
        return self


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str | None
    percent_off: int | None
    amount_off: Decimal | None
    product_ids: list[uuid.UUID]
    ends_on: date | None
    created_at: datetime
    # On today: not past its last day.
    active: bool
