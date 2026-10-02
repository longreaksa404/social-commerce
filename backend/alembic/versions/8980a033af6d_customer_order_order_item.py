"""customer, order, order_item tables, with RLS

Same RLS setup as the ccd7d9bce820 migration: app_user may read and write
only rows whose store_id is the session's app.tenant_id.

Revision ID: 8980a033af6d
Revises: ccd7d9bce820
Create Date: 2026-10-02 03:40:15.770568

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8980a033af6d"
down_revision: str | Sequence[str] | None = "ccd7d9bce820"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CURRENT_TENANT = "NULLIF(current_setting('app.tenant_id', true), '')::uuid"
# Quoted: ORDER is a reserved word.
TENANT_TABLES = ("customer", '"order"', "order_item")


def upgrade() -> None:
    op.create_table(
        "customer",
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("telegram_user_id", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("store_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["store_id"], ["store.id"], name=op.f("fk_customer_store_id_store"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_customer")),
        sa.UniqueConstraint("store_id", "phone", name=op.f("uq_customer_store_id")),
    )
    op.create_index(op.f("ix_customer_store_id"), "customer", ["store_id"], unique=False)
    op.create_table(
        "order",
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "accepted",
                "processing",
                "ready",
                "shipped",
                "delivered",
                "completed",
                "cancelled",
                "rejected",
                name="status",
                native_enum=False,
                create_constraint=False,
                length=32,
            ),
            server_default="pending",
            nullable=False,
        ),
        sa.Column(
            "currency",
            sa.Enum(
                "USD", "KHR", name="currency", native_enum=False, create_constraint=False, length=32
            ),
            nullable=False,
        ),
        sa.Column("subtotal", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "delivery_fee", sa.Numeric(precision=12, scale=2), server_default="0", nullable=False
        ),
        sa.Column("total", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "delivery_method",
            sa.Enum(
                "seller_delivery",
                "pickup",
                name="delivery_method",
                native_enum=False,
                create_constraint=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column("delivery_address", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
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
        sa.CheckConstraint("currency IN ('USD', 'KHR')", name=op.f("ck_order_currency")),
        sa.CheckConstraint(
            "delivery_method IN ('seller_delivery', 'pickup')",
            name=op.f("ck_order_delivery_method"),
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'accepted', 'processing', 'ready', 'shipped', "
            "'delivered', 'completed', 'cancelled', 'rejected')",
            name=op.f("ck_order_status"),
        ),
        sa.CheckConstraint(
            "subtotal >= 0 AND delivery_fee >= 0 AND total >= 0",
            name=op.f("ck_order_money_not_negative"),
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"], ["customer.id"], name=op.f("fk_order_customer_id_customer")
        ),
        sa.ForeignKeyConstraint(
            ["store_id"], ["store.id"], name=op.f("fk_order_store_id_store"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_order")),
        sa.UniqueConstraint("store_id", "number", name=op.f("uq_order_store_id")),
    )
    op.create_index(op.f("ix_order_store_id"), "order", ["store_id"], unique=False)
    op.create_index(
        "ix_order_store_id_created_at", "order", ["store_id", "created_at"], unique=False
    )
    op.create_index(
        "ix_order_store_id_customer_id", "order", ["store_id", "customer_id"], unique=False
    )
    op.create_index("ix_order_store_id_status", "order", ["store_id", "status"], unique=False)
    op.create_table(
        "order_item",
        sa.Column("order_id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("variant_id", sa.Uuid(), nullable=True),
        sa.Column("product_name_snapshot", sa.Text(), nullable=False),
        sa.Column("variant_name_snapshot", sa.Text(), nullable=True),
        sa.Column("unit_price_snapshot", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("line_total", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("store_id", sa.Uuid(), nullable=False),
        sa.CheckConstraint("quantity > 0", name=op.f("ck_order_item_quantity_positive")),
        sa.CheckConstraint(
            "unit_price_snapshot >= 0", name=op.f("ck_order_item_price_not_negative")
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["order.id"],
            name=op.f("fk_order_item_order_id_order"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"], ["product.id"], name=op.f("fk_order_item_product_id_product")
        ),
        sa.ForeignKeyConstraint(
            ["store_id"],
            ["store.id"],
            name=op.f("fk_order_item_store_id_store"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["variant_id"],
            ["product_variant.id"],
            name=op.f("fk_order_item_variant_id_product_variant"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_order_item")),
    )
    op.create_index(op.f("ix_order_item_store_id"), "order_item", ["store_id"], unique=False)
    op.create_index(
        "ix_order_item_store_id_order_id", "order_item", ["store_id", "order_id"], unique=False
    )
    op.create_index("ix_order_item_variant_id", "order_item", ["variant_id"], unique=False)

    for table in TENANT_TABLES:
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO app_user")
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY tenant_isolation ON {table} "
            f"USING (store_id = {CURRENT_TENANT}) WITH CHECK (store_id = {CURRENT_TENANT})"
        )


def downgrade() -> None:
    for table in TENANT_TABLES:
        op.execute(f"DROP POLICY tenant_isolation ON {table}")
        op.execute(f"REVOKE ALL ON {table} FROM app_user")
    op.drop_index("ix_order_item_variant_id", table_name="order_item")
    op.drop_index("ix_order_item_store_id_order_id", table_name="order_item")
    op.drop_index(op.f("ix_order_item_store_id"), table_name="order_item")
    op.drop_table("order_item")
    op.drop_index("ix_order_store_id_status", table_name="order")
    op.drop_index("ix_order_store_id_customer_id", table_name="order")
    op.drop_index("ix_order_store_id_created_at", table_name="order")
    op.drop_index(op.f("ix_order_store_id"), table_name="order")
    op.drop_table("order")
    op.drop_index(op.f("ix_customer_store_id"), table_name="customer")
    op.drop_table("customer")
