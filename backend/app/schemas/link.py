"""Shareable links and their views and orders (02_TECHNICAL.md section 9)."""

import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, StringConstraints, model_validator

from app.models import LinkTarget
from app.schemas.order import OrderSummaryOut

TOKEN_PATTERN = r"^[a-z0-9]{8}$"

# Where the link is posted: "tiktok", "facebook", ... from the app's
# choices, or what the seller typed for "Other".
Source = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]
# The seller's own name for it, e.g. "Video 3 Oct" or "September sale".
Campaign = Annotated[str, StringConstraints(strip_whitespace=True, max_length=60)]
Token = Annotated[str, StringConstraints(pattern=TOKEN_PATTERN)]


class LinkCreate(BaseModel):
    target_type: LinkTarget
    target_id: uuid.UUID | None = None  # the product or category; none for the shop
    source: Source
    campaign: Campaign | None = None

    @model_validator(mode="after")
    def _target(self) -> Self:
        if (self.target_type is LinkTarget.STORE) != (self.target_id is None):
            raise ValueError("Choose what the link opens.")
        self.campaign = self.campaign or None
        return self


class LinkOut(BaseModel):
    id: uuid.UUID
    target_type: LinkTarget
    target_id: uuid.UUID | None
    # The product's or category's current name; null for the shop, or once
    # the category is deleted.
    target_name: str | None
    # The address to share, from the site's root (current slugs + ?l=token).
    # Null while the page doesn't open: the product is hidden or the
    # category deleted.
    path: str | None
    token: str
    source: str | None
    campaign: str | None
    created_at: datetime
    view_count: int
    order_count: int


class LinkStatsOut(LinkOut):
    # The orders it brought, newest first (at most 100).
    orders: list[OrderSummaryOut]


class TrackViewIn(BaseModel):
    token: Token
