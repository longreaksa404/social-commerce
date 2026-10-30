"""The admin panel (01_PRODUCT.md §22.11) from Step 2 on: its log, people
and logins, closing a shop. Home, the shop list and a shop's page are in
schemas/plan.py, where they began."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AdminLogOut(BaseModel):
    """One line of the admin's log (part 28)."""

    id: uuid.UUID
    created_at: datetime
    action: str
    store_id: uuid.UUID | None
    shop: str | None  # its name now; as it was, once the shop is gone
    reason: str | None
    details: dict[str, Any]
