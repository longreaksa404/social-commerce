import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import decode_token
from app.db.session import get_db, tenant_session, unscoped_session
from app.models import AdminAccount, AdminSession, SellerRole, Store
from app.services import admin_auth
from app.services import storefront as storefront_service

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentSeller:
    seller_id: uuid.UUID
    store_id: uuid.UUID
    # Tokens from before staff logins existed have no role: only owners did.
    role: SellerRole = SellerRole.OWNER
    # Open as seller (01_PRODUCT.md §22.11, D1A): the admin using the
    # owner's app; None for the seller themselves.
    admin_id: uuid.UUID | None = None


async def current_seller(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> CurrentSeller:
    if credentials is None:
        raise AppError(401, "NOT_AUTHENTICATED", "Please log in.")
    payload = decode_token(credentials.credentials, "access")
    try:
        return CurrentSeller(
            uuid.UUID(payload["sub"]),
            uuid.UUID(payload["store_id"]),
            SellerRole(payload.get("role", SellerRole.OWNER)),
            uuid.UUID(payload["act"]) if "act" in payload else None,
        )
    except (KeyError, ValueError) as exc:
        raise AppError(401, "INVALID_TOKEN", "Invalid authentication token.") from exc


async def current_seller_themselves(
    seller: Annotated[CurrentSeller, Depends(current_seller)],
) -> CurrentSeller:
    """The owner's own password, login phone and logins, Close shop and
    "I've paid": never while the admin has the shop open (D1A)."""
    if seller.admin_id is not None:
        raise AppError(403, "NOT_AS_ADMIN", "Only the seller can do this, not Oak Order.")
    return seller


async def current_owner(
    seller: Annotated[CurrentSeller, Depends(current_seller)],
) -> CurrentSeller:
    """Settings and staff: the shop's owner only, not staff (founder's
    choice 2026-10-08)."""
    if seller.role is not SellerRole.OWNER:
        raise AppError(403, "OWNER_ONLY", "Only the shop's owner can do this.")
    return seller


@dataclass(frozen=True)
class CurrentAdmin:
    admin_id: uuid.UUID
    session_id: uuid.UUID


async def current_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> CurrentAdmin:
    """The admin panel: an admin account's own token (not a seller's), its
    phone still in ADMIN_PHONES, read from the database each time."""
    if credentials is None:
        raise AppError(401, "NOT_AUTHENTICATED", "Please log in.")
    payload = decode_token(credentials.credentials, "admin")
    try:
        admin = CurrentAdmin(uuid.UUID(payload["sub"]), uuid.UUID(payload["sid"]))
    except (KeyError, ValueError) as exc:
        raise AppError(401, "INVALID_TOKEN", "Invalid authentication token.") from exc
    async with unscoped_session() as db:
        if not admin_auth.allowed(await db.get(AdminAccount, admin.admin_id)):
            raise AppError(403, "ADMIN_ONLY", "This page is for Oak Order only.")
    return admin


async def current_admin_password_again(
    admin: Annotated[CurrentAdmin, Depends(current_admin)],
) -> CurrentAdmin:
    """A critical action (01_PRODUCT.md §22.11): the password typed again in
    this browser in the last 10 minutes (POST /admin/auth/password)."""
    async with unscoped_session() as db:
        if not admin_auth.password_recent(await db.get(AdminSession, admin.session_id)):
            raise AppError(403, "PASSWORD_AGAIN", "Type your password again to do this.")
    return admin


async def get_tenant_db(
    seller: Annotated[CurrentSeller, Depends(current_seller)],
) -> AsyncIterator[AsyncSession]:
    """Session restricted by RLS to the authenticated seller's store."""
    async with tenant_session(seller.store_id) as session:
        yield session


async def get_shop(store_slug: str) -> Store:
    """The public shop named in the URL (/shop/{store_slug}/...).

    Its own short session, closed before the tenant session opens, so a
    storefront request holds one connection at a time.
    """
    async with unscoped_session() as db:
        return await storefront_service.get_store(db, store_slug)


async def get_shop_db(shop: Annotated[Store, Depends(get_shop)]) -> AsyncIterator[AsyncSession]:
    """Session restricted by RLS to the shop being browsed."""
    async with tenant_session(shop.id) as session:
        yield session


Seller = Annotated[CurrentSeller, Depends(current_seller)]
SellerThemselves = Annotated[CurrentSeller, Depends(current_seller_themselves)]
Owner = Annotated[CurrentSeller, Depends(current_owner)]
Admin = Annotated[CurrentAdmin, Depends(current_admin)]
AdminPasswordAgain = Annotated[CurrentAdmin, Depends(current_admin_password_again)]
TenantDb = Annotated[AsyncSession, Depends(get_tenant_db)]
UnscopedDb = Annotated[AsyncSession, Depends(get_db)]
Shop = Annotated[Store, Depends(get_shop)]
ShopDb = Annotated[AsyncSession, Depends(get_shop_db)]
