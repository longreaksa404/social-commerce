"""The logged-in seller's own account: details and password.

`seller` isn't a tenant table (app_user has no grant on it), so this runs
on an unscoped session and every query filters by the seller id from the
access token.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.errors import AppError, NotFound
from app.models import Seller
from app.schemas.account import AccountUpdate, PasswordChange
from app.schemas.auth import TokenPair
from app.services import auth as auth_service


def _email_taken() -> AppError:
    return AppError(409, "EMAIL_TAKEN", "An account with this email already exists.", "email")


async def get_account(db: AsyncSession, seller_id: uuid.UUID) -> Seller:
    seller = await db.scalar(select(Seller).where(Seller.id == seller_id))
    if seller is None:
        raise NotFound("ACCOUNT_NOT_FOUND", "Account not found.")
    return seller


async def update_account(db: AsyncSession, seller_id: uuid.UUID, data: AccountUpdate) -> Seller:
    seller = await get_account(db, seller_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "email" in changes:
        changes["email"] = changes["email"].lower()
        if changes["email"] != seller.email and await db.scalar(
            select(Seller.id).where(Seller.email == changes["email"])
        ):
            raise _email_taken()
    for field, value in changes.items():
        setattr(seller, field, value)
    try:
        await db.commit()
    except IntegrityError as exc:  # the same email saved by someone else meanwhile
        await db.rollback()
        raise _email_taken() from exc
    return seller


async def change_password(
    db: AsyncSession, seller_id: uuid.UUID, store_id: uuid.UUID, data: PasswordChange
) -> TokenPair:
    """New password, and every other phone logged out: all sessions end and
    this one gets a fresh pair."""
    seller = await get_account(db, seller_id)
    if not await security.verify_password(data.current_password, seller.password_hash):
        # Not 401: the app treats a 401 as "session over" and logs out.
        raise AppError(422, "WRONG_PASSWORD", "Your current password is wrong.", "current_password")
    seller.password_hash = await security.hash_password(data.new_password)
    return await auth_service.restart_sessions(db, seller, store_id)
