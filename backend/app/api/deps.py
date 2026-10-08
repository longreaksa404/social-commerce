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
from app.models import SellerRole, Store
from app.services import storefront as storefront_service

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentSeller:
    seller_id: uuid.UUID
    store_id: uuid.UUID
    # Tokens from before staff logins existed have no role: only owners did.
    role: SellerRole = SellerRole.OWNER


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
        )
    except (KeyError, ValueError) as exc:
        raise AppError(401, "INVALID_TOKEN", "Invalid authentication token.") from exc


async def current_owner(
    seller: Annotated[CurrentSeller, Depends(current_seller)],
) -> CurrentSeller:
    """Settings and staff: the shop's owner only, not staff (founder's
    choice 2026-10-08)."""
    if seller.role is not SellerRole.OWNER:
        raise AppError(403, "OWNER_ONLY", "Only the shop's owner can do this.")
    return seller


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
Owner = Annotated[CurrentSeller, Depends(current_owner)]
TenantDb = Annotated[AsyncSession, Depends(get_tenant_db)]
UnscopedDb = Annotated[AsyncSession, Depends(get_db)]
Shop = Annotated[Store, Depends(get_shop)]
ShopDb = Annotated[AsyncSession, Depends(get_shop_db)]
