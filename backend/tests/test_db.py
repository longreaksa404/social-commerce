import uuid

from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase

from app.db.base import TenantMixin, UUIDPrimaryKeyMixin
from app.db.session import tenant_session

CURRENT_TENANT = text("SELECT current_setting('app.tenant_id', true)")
CURRENT_ROLE = text("SELECT current_user")


def test_tenant_mixin_adds_required_store_id():
    # Separate base so this throwaway table stays out of the app's metadata.
    class ScratchBase(DeclarativeBase):
        pass

    class TenantThing(UUIDPrimaryKeyMixin, TenantMixin, ScratchBase):
        __tablename__ = "tenant_thing"

    store_id = TenantThing.__table__.c.store_id

    assert not store_id.nullable
    assert [fk.target_fullname for fk in store_id.foreign_keys] == ["store.id"]


async def test_tenant_session_scopes_every_transaction():
    store_id = uuid.uuid4()

    async with tenant_session(store_id) as session:
        first = (await session.scalar(CURRENT_TENANT), await session.scalar(CURRENT_ROLE))
        await session.commit()
        # A new transaction after commit is scoped again.
        second = (await session.scalar(CURRENT_TENANT), await session.scalar(CURRENT_ROLE))

    assert first == (str(store_id), "app_user")
    assert second == (str(store_id), "app_user")
