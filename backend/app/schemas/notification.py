"""The dashboard's notification list (the web rows of notification_log)."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import AwareDatetime, BaseModel

from app.models import Currency


class NotificationOrderOut(BaseModel):
    """The order as it was placed; opening it shows where it is now."""

    id: uuid.UUID
    number: int
    customer_name: str
    item_count: int  # units, not lines
    total: Decimal
    currency: Currency
    accepted_automatically: bool


class StockItemOut(BaseModel):
    product_id: uuid.UUID
    name: str  # "Red T-shirt (XL)"
    left: int  # 0 = sold out


class NotificationOut(BaseModel):
    id: uuid.UUID
    event_type: Literal["new_order", "low_stock"]
    created_at: datetime
    read: bool
    order: NotificationOrderOut | None = None  # new_order
    items: list[StockItemOut] = []  # low_stock


class NotificationListOut(BaseModel):
    notifications: list[NotificationOut]
    has_more: bool
    unread: int


class UnreadOut(BaseModel):
    unread: int


class MarkReadIn(BaseModel):
    # The created_at of the newest notification the seller was shown,
    # exactly as it came: it and everything older are marked read, but not
    # one that arrived since.
    up_to: AwareDatetime
