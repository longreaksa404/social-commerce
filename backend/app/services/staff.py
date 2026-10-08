"""Settings → Staff: the owner's helpers, who log in with their own email
and can do everything but Settings (founder's choice 2026-10-08).

Staff are `seller` rows with role staff and their shop in store_id. The
seller table isn't tenant-scoped, so this runs on an unscoped session and
every query filters by the owner's store id from the access token.
"""

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.errors import AppError, NotFound
from app.models import RefreshToken, Seller, SellerRole
from app.schemas.staff import StaffCreate

MAX_STAFF = 10


def _email_taken() -> AppError:
    return AppError(409, "EMAIL_TAKEN", "An account with this email already exists.", "email")


def _of_shop(store_id: uuid.UUID):
    return (Seller.store_id == store_id, Seller.role == SellerRole.STAFF)


async def list_staff(db: AsyncSession, store_id: uuid.UUID) -> list[Seller]:
    return list(
        await db.scalars(select(Seller).where(*_of_shop(store_id)).order_by(Seller.created_at))
    )


async def add_staff(db: AsyncSession, store_id: uuid.UUID, data: StaffCreate) -> Seller:
    count = await db.scalar(select(func.count()).where(*_of_shop(store_id)))
    if (count or 0) >= MAX_STAFF:
        raise AppError(409, "STAFF_LIMIT", f"A shop can have up to {MAX_STAFF} staff.")
    email = data.email.lower()
    if await db.scalar(select(Seller.id).where(Seller.email == email)):
        raise _email_taken()
    staff = Seller(
        email=email,
        password_hash=await security.hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=SellerRole.STAFF,
        store_id=store_id,
    )
    db.add(staff)
    try:
        await db.commit()
    except IntegrityError as exc:  # the same email saved by someone else meanwhile
        await db.rollback()
        raise _email_taken() from exc
    return staff


async def _get(db: AsyncSession, store_id: uuid.UUID, staff_id: uuid.UUID) -> Seller:
    staff = await db.scalar(select(Seller).where(Seller.id == staff_id, *_of_shop(store_id)))
    if staff is None:
        raise NotFound("STAFF_NOT_FOUND", "Staff member not found.")
    return staff


async def set_password(
    db: AsyncSession, store_id: uuid.UUID, staff_id: uuid.UUID, password: str
) -> Seller:
    """A helper who forgot theirs: the owner sets a new one, and the
    helper's phones are logged out."""
    staff = await _get(db, store_id, staff_id)
    staff.password_hash = await security.hash_password(password)
    await db.execute(delete(RefreshToken).where(RefreshToken.seller_id == staff.id))
    await db.commit()
    return staff


async def remove_staff(db: AsyncSession, store_id: uuid.UUID, staff_id: uuid.UUID) -> None:
    """Their login goes (sessions with it); what they did to orders stays."""
    staff = await _get(db, store_id, staff_id)
    await db.execute(delete(Seller).where(Seller.id == staff.id))
    await db.commit()
