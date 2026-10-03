"""shareable_link and link_event tables, with RLS

The seller's tracked links and their views and orders (02_TECHNICAL.md
section 9). link_event gets store_id, like the other tenant tables, so RLS
covers it. Same RLS setup as the ccd7d9bce820 migration.

Revision ID: 883276fadeed
Revises: aa40287b7688
Create Date: 2026-10-03 16:04:59.213935

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "883276fadeed"
down_revision: str | Sequence[str] | None = "aa40287b7688"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CURRENT_TENANT = "NULLIF(current_setting('app.tenant_id', true), '')::uuid"
TABLES = ("shareable_link", "link_event")


def _enum(name: str, *values: str) -> sa.Enum:
    return sa.Enum(*values, name=name, native_enum=False, create_constraint=False, length=32)


def upgrade() -> None:
    op.create_table(
        "shareable_link",
        sa.Column(
            "target_type", _enum("target_type", "store", "product", "category"), nullable=False
        ),
        sa.Column("target_id", sa.Uuid(), nullable=True),
        sa.Column("token", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("campaign", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("store_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(target_type = 'store') = (target_id IS NULL)",
            name=op.f("ck_shareable_link_target_id_matches_type"),
        ),
        sa.CheckConstraint(
            "target_type IN ('store', 'product', 'category')",
            name=op.f("ck_shareable_link_target_type"),
        ),
        sa.ForeignKeyConstraint(
            ["store_id"],
            ["store.id"],
            name=op.f("fk_shareable_link_store_id_store"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_shareable_link")),
        sa.UniqueConstraint("token", name=op.f("uq_shareable_link_token")),
    )
    op.create_index(op.f("ix_shareable_link_store_id"), "shareable_link", ["store_id"])
    op.create_index(
        "ix_shareable_link_store_id_created_at", "shareable_link", ["store_id", "created_at"]
    )

    op.create_table(
        "link_event",
        sa.Column("link_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", _enum("event_type", "view", "order"), nullable=False),
        sa.Column("order_id", sa.Uuid(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("store_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(event_type = 'order') = (order_id IS NOT NULL)",
            name=op.f("ck_link_event_order_id_matches_type"),
        ),
        sa.CheckConstraint(
            "event_type IN ('view', 'order')", name=op.f("ck_link_event_event_type")
        ),
        sa.ForeignKeyConstraint(
            ["link_id"],
            ["shareable_link.id"],
            name=op.f("fk_link_event_link_id_shareable_link"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["order.id"],
            name=op.f("fk_link_event_order_id_order"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["store_id"],
            ["store.id"],
            name=op.f("fk_link_event_store_id_store"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_link_event")),
    )
    op.create_index(op.f("ix_link_event_store_id"), "link_event", ["store_id"])
    op.create_index("ix_link_event_store_id_link_id", "link_event", ["store_id", "link_id"])
    op.create_index("uq_link_event_order_id", "link_event", ["order_id"], unique=True)

    for table in TABLES:
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO app_user")
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY tenant_isolation ON {table} "
            f"USING (store_id = {CURRENT_TENANT}) WITH CHECK (store_id = {CURRENT_TENANT})"
        )


def downgrade() -> None:
    for table in reversed(TABLES):
        op.execute(f"DROP POLICY tenant_isolation ON {table}")
        op.execute(f"REVOKE ALL ON {table} FROM app_user")
    op.drop_index("uq_link_event_order_id", table_name="link_event")
    op.drop_index("ix_link_event_store_id_link_id", table_name="link_event")
    op.drop_index(op.f("ix_link_event_store_id"), table_name="link_event")
    op.drop_table("link_event")
    op.drop_index("ix_shareable_link_store_id_created_at", table_name="shareable_link")
    op.drop_index(op.f("ix_shareable_link_store_id"), table_name="shareable_link")
    op.drop_table("shareable_link")
