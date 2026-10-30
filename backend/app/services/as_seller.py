"""Open as seller (01_PRODUCT.md §22.11, founder's pick D1A, 2026-10-28):
the admin uses a shop's whole seller app as its owner for 30 minutes, to
help set it up or fix something, instead of the admin having its own copy
of every seller screen.

- Opening takes a reason and the admin's password again; it's logged, the
  shop's Telegram is told, and so are the admins.
- The token is the owner's access token with `act` = the admin
  (security.create_acting_token): no refresh, gone after 30 minutes.
- Every seller route works as for the owner, except the owner's password,
  login phone and logins, Close shop and "I've paid" (403 NOT_AS_ADMIN,
  api/deps.py current_seller_themselves).
- Each save made with it (a write that succeeded) is logged as
  `seller_save` with its method and path (`log_saves`, a middleware).
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.errors import AppError
from app.db.session import unscoped_session
from app.models import Seller, Store
from app.schemas.admin import AdminActingOut
from app.services import admin_log, notifications
from app.services.admin import locked_store
from app.services.telegram import escape

OPENED = "opened_by_oak"  # the shop's Telegram is told
WRITES = frozenset({"POST", "PUT", "PATCH", "DELETE"})


async def open_as_seller(
    db: AsyncSession, admin_id: uuid.UUID, store_id: uuid.UUID, reason: str
) -> AdminActingOut:
    """A 30-minute token for the shop's owner that names the admin. A
    closed shop can't be opened (its logins are off)."""
    store = await locked_store(db, store_id)
    owner = await db.get(Seller, store.seller_id)
    if not owner.is_active:
        raise AppError(409, "SHOP_CLOSED", "This shop is closed. Reopen it first.")
    token, expires_at = security.create_acting_token(owner.id, store.id, admin_id)
    admin_log.record(
        db, admin_id, "open_as_seller", store=store, reason=reason, until=expires_at.isoformat()
    )
    await db.commit()
    return AdminActingOut(
        access_token=token, expires_at=expires_at, store_id=store.id, shop=store.name
    )


def opened_text(store: Store) -> str:
    """Khmer only, like every bot message: "Oak Order opened your shop to
    help you" (01_PRODUCT.md §22.11)."""
    return f"🛟 <b>Oak Order</b> · {escape(store.name)}\nOak Order បានបើកហាងរបស់អ្នក ដើម្បីជួយអ្នក។"


async def tell_shop(store_id: uuid.UUID) -> None:
    """The line on the shop's Telegram, after the response; logged like
    its alerts, so it shows on the shop's Activity."""
    async with unscoped_session() as db:
        store = await db.get(Store, store_id)
        if store is not None:
            await notifications.send_to_seller(db, store, OPENED, {}, opened_text(store))


def acting(authorization: str | None) -> tuple[uuid.UUID, uuid.UUID] | None:
    """(admin, shop) when a request carries an admin's token for a shop."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        payload = security.decode_token(authorization.removeprefix("Bearer "), "access")
        if "act" not in payload:
            return None
        return uuid.UUID(payload["act"]), uuid.UUID(payload["store_id"])
    except (AppError, KeyError, ValueError):
        return None


async def record_save(admin_id: uuid.UUID, store_id: uuid.UUID, method: str, path: str) -> None:
    """A save made as the seller, in the log: what was sent where (the
    admin's words for it in the app, admin/logWords.ts)."""
    async with unscoped_session() as db:
        store = await db.get(Store, store_id)
        admin_log.record(
            db,
            admin_id,
            "seller_save",
            store=store,
            method=method,
            path=path.removeprefix("/api/v1"),
        )
        await db.commit()
