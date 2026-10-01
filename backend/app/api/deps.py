import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import decode_token
from app.db.session import get_db, tenant_session

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentSeller:
    seller_id: uuid.UUID
    store_id: uuid.UUID


async def current_seller(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> CurrentSeller:
    if credentials is None:
        raise AppError(401, "NOT_AUTHENTICATED", "Please log in.")
    payload = decode_token(credentials.credentials, "access")
    try:
        return CurrentSeller(uuid.UUID(payload["sub"]), uuid.UUID(payload["store_id"]))
    except (KeyError, ValueError) as exc:
        raise AppError(401, "INVALID_TOKEN", "Invalid authentication token.") from exc


async def get_tenant_db(
    seller: Annotated[CurrentSeller, Depends(current_seller)],
) -> AsyncIterator[AsyncSession]:
    """Session restricted by RLS to the authenticated seller's store."""
    async with tenant_session(seller.store_id) as session:
        yield session


Seller = Annotated[CurrentSeller, Depends(current_seller)]
TenantDb = Annotated[AsyncSession, Depends(get_tenant_db)]
UnscopedDb = Annotated[AsyncSession, Depends(get_db)]
