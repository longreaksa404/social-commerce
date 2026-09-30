import uuid
from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

engine = create_async_engine(get_settings().database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: one session (one transaction) per request."""
    async with SessionLocal() as session:
        yield session


async def set_tenant(session: AsyncSession, store_id: uuid.UUID) -> None:
    """Scope the current transaction to one tenant for Postgres RLS.

    Equivalent to `SET LOCAL app.tenant_id = ...` (which can't take bind
    parameters): the setting is cleared when the transaction ends, so it
    can't leak to another request through the connection pool.
    """
    await session.execute(
        text("SELECT set_config('app.tenant_id', :tenant_id, true)"),
        {"tenant_id": str(store_id)},
    )
