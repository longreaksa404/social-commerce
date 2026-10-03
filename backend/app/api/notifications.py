"""The dashboard's notification list: new orders and low stock (02_TECHNICAL.md
section 12.1). No push: the dashboard asks for the unread count now and then."""

from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import Seller, TenantDb
from app.schemas.notification import MarkReadIn, NotificationListOut, UnreadOut
from app.services import notifications

router = APIRouter(prefix="/seller/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListOut)
async def list_notifications(
    seller: Seller,
    db: TenantDb,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> NotificationListOut:
    """Newest first. Listing doesn't mark them read."""
    return await notifications.list_web(db, seller.store_id, limit=limit, offset=offset)


@router.get("/unread", response_model=UnreadOut)
async def unread(seller: Seller, db: TenantDb) -> UnreadOut:
    """The count on the bell."""
    return UnreadOut(unread=await notifications.unread_count(db, seller.store_id))


@router.post("/read", response_model=UnreadOut)
async def mark_read(data: MarkReadIn, seller: Seller, db: TenantDb) -> UnreadOut:
    """Marks read everything up to the newest notification the seller was
    shown; returns what's still unread (one that arrived since)."""
    return UnreadOut(unread=await notifications.mark_read(db, seller.store_id, data.up_to))
