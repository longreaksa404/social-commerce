"""The logged-in seller's own account: details, phone number and password.

`seller` isn't a tenant table (app_user has no grant on it), so this runs
on an unscoped session and every query filters by the seller id from the
access token.
"""

import uuid

from sqlalchemy import delete, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.errors import AppError, NotFound
from app.models import RefreshToken, Seller
from app.schemas.account import AccountUpdate, PasswordChange
from app.schemas.auth import TokenPair
from app.services import auth as auth_service
from app.services import phone_check


def _phone_taken() -> AppError:
    return AppError(
        409, "PHONE_TAKEN", "Another account already has this phone number.", "phone_check"
    )


async def get_account(db: AsyncSession, seller_id: uuid.UUID) -> Seller:
    seller = await db.scalar(select(Seller).where(Seller.id == seller_id))
    if seller is None:
        raise NotFound("ACCOUNT_NOT_FOUND", "Account not found.")
    return seller


async def update_account(db: AsyncSession, seller_id: uuid.UUID, data: AccountUpdate) -> Seller:
    seller = await get_account(db, seller_id)
    for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(seller, field, value)
    await db.commit()
    return seller


async def change_phone(db: AsyncSession, seller_id: uuid.UUID, check_id: uuid.UUID) -> Seller:
    """A new login number, shared with the bot like at sign-up."""
    seller = await get_account(db, seller_id)
    check = await phone_check.use(db, check_id)
    if check.phone != seller.phone and await phone_check.phone_taken(db, check.phone):
        raise _phone_taken()
    seller.phone = check.phone
    try:
        await db.commit()
    except IntegrityError as exc:  # the same number taken meanwhile
        await db.rollback()
        raise _phone_taken() from exc
    return seller


async def close_shop(
    db: AsyncSession, seller_id: uuid.UUID, store_id: uuid.UUID, password: str
) -> None:
    """Settings → Close shop: the shop link stops working and nobody can log
    in. Nothing is erased: the founder reopens it, or erases it for good,
    when the seller asks (python -m app.admin, docs/ADMIN.md)."""
    seller = await get_account(db, seller_id)
    if not await security.verify_password(password, seller.password_hash):
        raise AppError(422, "WRONG_PASSWORD", "Your current password is wrong.", "password")
    await set_shop_logins(db, seller.id, store_id, active=False)
    await db.commit()


async def set_shop_logins(
    db: AsyncSession, owner_id: uuid.UUID, store_id: uuid.UUID, *, active: bool
) -> None:
    """Close or open every login of a shop, the owner's and its staff's
    (the shop page checks the owner's). Closing logs them all out."""
    logins = or_(Seller.id == owner_id, Seller.store_id == store_id)
    await db.execute(update(Seller).where(logins).values(is_active=active))
    if not active:
        ids = select(Seller.id).where(logins).scalar_subquery()
        await db.execute(delete(RefreshToken).where(RefreshToken.seller_id.in_(ids)))


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
