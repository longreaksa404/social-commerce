import asyncio
import uuid

from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase

from app.db.base import TenantMixin, UUIDPrimaryKeyMixin
from app.db.session import SessionLocal, engine, set_tenant

CURRENT_TENANT = text("SELECT current_setting('app.tenant_id', true)")


def test_tenant_mixin_adds_required_store_id():
    # Separate base so this throwaway table stays out of the app's metadata.
    class ScratchBase(DeclarativeBase):
        pass

    class TenantThing(UUIDPrimaryKeyMixin, TenantMixin, ScratchBase):
        __tablename__ = "tenant_thing"

    store_id = TenantThing.__table__.c.store_id

    assert not store_id.nullable
    assert [fk.target_fullname for fk in store_id.foreign_keys] == ["store.id"]


def test_set_tenant_is_scoped_to_the_transaction():
    """Needs the local Postgres (docker compose up -d)."""
    store_id = uuid.uuid4()

    async def scenario() -> tuple[str | None, str | None]:
        try:
            async with SessionLocal() as session:
                await set_tenant(session, store_id)
                inside = await session.scalar(CURRENT_TENANT)
                await session.commit()
                after = await session.scalar(CURRENT_TENANT)
            return inside, after
        finally:
            await engine.dispose()

    inside, after = asyncio.run(scenario())

    assert inside == str(store_id)
    assert not after
