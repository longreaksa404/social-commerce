"""The admin panel's log (01_PRODUCT.md §22.11, part 28; founder's pick 13A,
2026-10-28): everything done from the admin, with what changed, a day at a
time. A row is added in the same transaction as the thing it records, so
one never happens without the other.

Actions so far: mark_paid (by hand, or a seller's "I've paid" found),
claim_not_found, close_shop, reopen_shop, reset_password, logout_all,
change_phone, remove_login. Each keeps the shop's and the person's names
in `details`, so a line still reads right after a rename or an erase.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminAction, Store
from app.schemas.admin import AdminLogOut

# One page of the log; older ones with `before`.
PAGE = 100


def record(
    db: AsyncSession,
    admin_id: uuid.UUID,
    action: str,
    *,
    store: Store | None = None,
    reason: str | None = None,
    **details: Any,
) -> None:
    """Add a line to the log, in the caller's transaction (not committed).
    `details` must be JSON: strings, numbers, booleans."""
    if store is not None:
        details = {"shop": store.name, **details}
    db.add(
        AdminAction(
            admin_id=admin_id,
            store_id=store.id if store is not None else None,
            action=action,
            reason=reason,
            details=details,
        )
    )


async def entries(
    db: AsyncSession,
    *,
    store_id: uuid.UUID | None = None,
    before: datetime | None = None,
    limit: int = PAGE,
) -> list[AdminLogOut]:
    """The newest first, with each shop's name as it is now (as it was
    when the shop is gone)."""
    query = (
        select(AdminAction, Store.name)
        .outerjoin(Store, Store.id == AdminAction.store_id)
        .order_by(AdminAction.created_at.desc(), AdminAction.id)
        .limit(limit)
    )
    if store_id is not None:
        query = query.where(AdminAction.store_id == store_id)
    if before is not None:
        query = query.where(AdminAction.created_at < before)
    return [
        AdminLogOut(
            id=row.id,
            created_at=row.created_at,
            action=row.action,
            store_id=row.store_id,
            shop=name or row.details.get("shop"),
            reason=row.reason,
            details=row.details,
        )
        for row, name in (await db.execute(query)).all()
    ]
