"""delivery table, with RLS; order.discount; store.discount_config

Same RLS setup as the ccd7d9bce820 migration: app_user may read and write
only rows whose store_id is the session's app.tenant_id.

Every existing order gets a delivery for its delivery method, not yet
assigned, so the seller can mark it delivered and complete the order
(02_TECHNICAL.md section 7.4).

Revision ID: 7461cde1fdf0
Revises: ccd5e33eba38
Create Date: 2026-10-03 07:54:57.406553

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7461cde1fdf0"
down_revision: str | Sequence[str] | None = "ccd5e33eba38"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CURRENT_TENANT = "NULLIF(current_setting('app.tenant_id', true), '')::uuid"
STATUSES = "'not_assigned', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed'"


def upgrade() -> None:
    op.create_table(
        "delivery",
        sa.Column("order_id", sa.Uuid(), nullable=False),
        sa.Column(
            "method",
            sa.Enum(
                "seller_delivery",
                "pickup",
                name="method",
                native_enum=False,
                create_constraint=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "not_assigned",
                "assigned",
                "picked_up",
                "in_transit",
                "delivered",
                "failed",
                name="status",
                native_enum=False,
                create_constraint=False,
                length=32,
            ),
            server_default="not_assigned",
            nullable=False,
        ),
        sa.Column("area_name", sa.Text(), nullable=True),
        sa.Column("assignee_note", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("store_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "method IN ('seller_delivery', 'pickup')", name=op.f("ck_delivery_method")
        ),
        sa.CheckConstraint(f"status IN ({STATUSES})", name=op.f("ck_delivery_status")),
        sa.ForeignKeyConstraint(
            ["order_id"], ["order.id"], name=op.f("fk_delivery_order_id_order"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["store_id"], ["store.id"], name=op.f("fk_delivery_store_id_store"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_delivery")),
        sa.UniqueConstraint("order_id", name=op.f("uq_delivery_order_id")),
    )
    op.create_index(op.f("ix_delivery_store_id"), "delivery", ["store_id"], unique=False)

    op.execute(
        "INSERT INTO delivery (id, store_id, order_id, method, status, created_at) "
        "SELECT gen_random_uuid(), store_id, id, delivery_method, 'not_assigned', created_at "
        'FROM "order"'
    )

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON delivery TO app_user")
    op.execute("ALTER TABLE delivery ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON delivery "
        f"USING (store_id = {CURRENT_TENANT}) WITH CHECK (store_id = {CURRENT_TENANT})"
    )

    op.add_column(
        "order",
        sa.Column(
            "discount", sa.Numeric(precision=12, scale=2), server_default="0", nullable=False
        ),
    )
    op.drop_constraint(op.f("ck_order_money_not_negative"), "order", type_="check")
    op.create_check_constraint(
        op.f("ck_order_money_not_negative"),
        "order",
        "subtotal >= 0 AND discount >= 0 AND delivery_fee >= 0 AND total >= 0",
    )
    op.add_column(
        "store",
        sa.Column(
            "discount_config",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("store", "discount_config")
    op.drop_constraint(op.f("ck_order_money_not_negative"), "order", type_="check")
    op.create_check_constraint(
        op.f("ck_order_money_not_negative"),
        "order",
        "subtotal >= 0 AND delivery_fee >= 0 AND total >= 0",
    )
    op.drop_column("order", "discount")
    op.execute("DROP POLICY tenant_isolation ON delivery")
    op.execute("REVOKE ALL ON delivery FROM app_user")
    op.drop_index(op.f("ix_delivery_store_id"), table_name="delivery")
    op.drop_table("delivery")
