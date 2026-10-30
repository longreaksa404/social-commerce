"""The admin panel (01_PRODUCT.md §22.11) from Step 2 on: its log, people
and logins, closing a shop. Home, the shop list and a shop's page are in
schemas/plan.py, where they began."""

import uuid
from datetime import datetime
from typing import Any

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


class AdminNewPasswordOut(BaseModel):
    """Shown once, for the admin to send or read out."""

    password: str
