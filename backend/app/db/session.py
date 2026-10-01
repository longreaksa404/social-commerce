import uuid
from collections.abc import AsyncIterator

from sqlalchemy import Connection, event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, SessionTransaction

from app.core.config import get_settings

# Role without BYPASSRLS that seller requests run as (see the RLS migration).
TENANT_ROLE = "app_user"

engine = create_async_engine(get_settings().database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


def unscoped_session() -> AsyncSession:
    """Session that is NOT restricted by RLS.

    Only for code that runs before a tenant is known (auth) or that is
    public by design (storefront). Every query here must filter explicitly.
    """
    return SessionLocal()


def tenant_session(store_id: uuid.UUID) -> AsyncSession:
    """Session whose every transaction is restricted to one store by RLS."""
    return SessionLocal(info={"store_id": store_id})


@event.listens_for(Session, "after_begin")
def _scope_transaction_to_tenant(
    session: Session, transaction: SessionTransaction, connection: Connection
) -> None:
    """Runs at the start of each transaction of a tenant session.

    Both settings are transaction-local (SET LOCAL / set_config(..., true)),
    so they are gone when the connection goes back to the pool and can't
    leak into another request. Applying them per transaction rather than
    once per session keeps them in force after a commit.
    """
    store_id = session.info.get("store_id")
    if store_id is None:
        return
    connection.execute(text(f"SET LOCAL ROLE {TENANT_ROLE}"))
    connection.execute(
        text("SELECT set_config('app.tenant_id', :tenant_id, true)"),
        {"tenant_id": str(store_id)},
    )


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: unscoped session (see unscoped_session)."""
    async with unscoped_session() as session:
        yield session
