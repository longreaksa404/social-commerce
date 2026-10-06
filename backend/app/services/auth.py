"""Seller accounts and tokens. Runs on an unscoped session: no tenant is
known yet, so every query filters by seller explicitly."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.errors import AppError
from app.models import RefreshToken, Seller, Store
from app.schemas.auth import LoginIn, RegisterIn, TokenPair
from app.services.slugs import slugify, unique_slug


def _invalid_credentials() -> AppError:
    return AppError(401, "INVALID_CREDENTIALS", "Wrong email or password.")


def _invalid_refresh() -> AppError:
    return AppError(401, "INVALID_TOKEN", "Your session has ended. Please log in again.")


def _token_id(payload: dict) -> uuid.UUID:
    try:
        return uuid.UUID(payload["jti"])
    except (KeyError, ValueError) as exc:
        raise _invalid_refresh() from exc


async def register(db: AsyncSession, data: RegisterIn) -> TokenPair:
    """Create the seller and their store together (1:1 in the MVP)."""
    email = data.email.lower()
    if await db.scalar(select(Seller.id).where(Seller.email == email)):
        raise AppError(409, "EMAIL_TAKEN", "An account with this email already exists.", "email")

    seller = Seller(
        email=email,
        password_hash=await security.hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
    )
    db.add(seller)
    await db.flush()
    slug = await unique_slug(db, Store.slug, slugify(data.store_name))
    store = Store(seller_id=seller.id, name=data.store_name, slug=slug)
    db.add(store)
    await db.flush()

    tokens = await _issue_tokens(db, seller.id, store.id)
    await db.commit()
    return tokens


async def login(db: AsyncSession, data: LoginIn) -> TokenPair:
    seller = await db.scalar(select(Seller).where(Seller.email == data.email.lower()))
    if seller is None:
        await security.verify_password(data.password, security.DUMMY_PASSWORD_HASH)
        raise _invalid_credentials()
    if not await security.verify_password(data.password, seller.password_hash):
        raise _invalid_credentials()
    if not seller.is_active:
        raise AppError(403, "ACCOUNT_DISABLED", "This account has been disabled.")

    tokens = await _issue_tokens(db, seller.id, await _store_id(db, seller.id))
    await db.commit()
    return tokens


async def refresh(db: AsyncSession, refresh_token: str) -> TokenPair:
    """Rotate: the presented token is used up and a new pair is issued.

    A token that was already used means someone kept a copy, so every
    session of that seller is ended.
    """
    payload = security.decode_token(refresh_token, "refresh")
    row = await db.scalar(
        select(RefreshToken).where(RefreshToken.id == _token_id(payload)).with_for_update()
    )
    if row is None or str(row.seller_id) != payload["sub"]:
        raise _invalid_refresh()

    now = datetime.now(UTC)
    if row.revoked_at is not None:
        await _revoke_all(db, row.seller_id, now)
        await db.commit()
        raise _invalid_refresh()
    if row.expires_at <= now:
        raise _invalid_refresh()

    seller = await db.get(Seller, row.seller_id)
    if seller is None or not seller.is_active:
        raise _invalid_refresh()

    row.revoked_at = now
    tokens = await _issue_tokens(db, seller.id, await _store_id(db, seller.id))
    await db.commit()
    return tokens


async def logout(db: AsyncSession, refresh_token: str) -> None:
    """End this session. An invalid or expired token is ignored: the
    client is logging out either way."""
    try:
        token_id = _token_id(security.decode_token(refresh_token, "refresh"))
    except AppError:
        return
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.id == token_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    await db.commit()


async def _store_id(db: AsyncSession, seller_id: uuid.UUID) -> uuid.UUID:
    store_id = await db.scalar(select(Store.id).where(Store.seller_id == seller_id))
    if store_id is None:  # every seller gets a store at registration
        raise AppError(409, "STORE_MISSING", "This account has no store.")
    return store_id


async def _issue_tokens(db: AsyncSession, seller_id: uuid.UUID, store_id: uuid.UUID) -> TokenPair:
    row = RefreshToken(
        id=uuid.uuid4(),
        seller_id=seller_id,
        expires_at=datetime.now(UTC) + security.refresh_token_lifetime(),
    )
    db.add(row)
    await db.flush()
    return TokenPair(
        access_token=security.create_access_token(seller_id, store_id),
        refresh_token=security.create_refresh_token(seller_id, row.id),
    )


async def _revoke_all(db: AsyncSession, seller_id: uuid.UUID, now: datetime) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.seller_id == seller_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )
