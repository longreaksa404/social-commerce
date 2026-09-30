import uuid

from sqlalchemy import ForeignKey, MetaData
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Explicit constraint names so Alembic can generate and drop them reliably.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class UUIDPrimaryKeyMixin:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)


class TenantMixin:
    """Marks a table as tenant-owned (02_TECHNICAL.md section 4).

    The tenant id is `store.id`, stored in a non-nullable `store_id` column.
    Every query on a tenant table must filter by the store_id of the
    authenticated session, never by a value from the request body, and each
    table also gets an RLS policy comparing store_id to the `app.tenant_id`
    session setting (see `set_tenant` in app/db/session.py).

    Indexes on tenant tables should be composite and lead with store_id,
    e.g. (store_id, id) or (store_id, status).
    """

    store_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("store.id", ondelete="CASCADE"), nullable=False, index=True
    )
