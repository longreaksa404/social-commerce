"""category, product, product_variant tables

Revision ID: f49fee3833a0
Revises: abd12fdb8cf6
Create Date: 2026-10-01 08:35:02.209203

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f49fee3833a0"
down_revision: str | Sequence[str] | None = "abd12fdb8cf6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "category",
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("store_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["store_id"], ["store.id"], name=op.f("fk_category_store_id_store"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_category")),
        sa.UniqueConstraint("store_id", "slug", name=op.f("uq_category_store_id")),
    )
    op.create_index(op.f("ix_category_store_id"), "category", ["store_id"], unique=False)
    op.create_table(
        "product",
        sa.Column("category_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "image_urls",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "active",
                "inactive",
                name="status",
                native_enum=False,
                create_constraint=False,
                length=32,
            ),
            server_default="active",
            nullable=False,
        ),
        sa.Column("has_variants", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("stock_quantity", sa.Integer(), nullable=True),
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
        sa.CheckConstraint("status IN ('active', 'inactive')", name=op.f("ck_product_status")),
        sa.CheckConstraint("price >= 0", name=op.f("ck_product_price_not_negative")),
        sa.CheckConstraint(
            "stock_quantity IS NULL OR stock_quantity >= 0",
            name=op.f("ck_product_stock_not_negative"),
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["category.id"],
            name=op.f("fk_product_category_id_category"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["store_id"], ["store.id"], name=op.f("fk_product_store_id_store"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product")),
        sa.UniqueConstraint("store_id", "slug", name=op.f("uq_product_store_id")),
    )
    op.create_index(op.f("ix_product_store_id"), "product", ["store_id"], unique=False)
    op.create_index(
        "ix_product_store_id_category_id", "product", ["store_id", "category_id"], unique=False
    )
    op.create_index("ix_product_store_id_status", "product", ["store_id", "status"], unique=False)
    op.create_table(
        "product_variant",
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("sku", sa.Text(), nullable=True),
        sa.Column("price_override", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("stock_quantity", sa.Integer(), server_default="0", nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("store_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "price_override IS NULL OR price_override >= 0",
            name=op.f("ck_product_variant_price_not_negative"),
        ),
        sa.CheckConstraint(
            "stock_quantity >= 0", name=op.f("ck_product_variant_stock_not_negative")
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["product.id"],
            name=op.f("fk_product_variant_product_id_product"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["store_id"],
            ["store.id"],
            name=op.f("fk_product_variant_store_id_store"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product_variant")),
    )
    op.create_index(
        op.f("ix_product_variant_store_id"), "product_variant", ["store_id"], unique=False
    )
    op.create_index(
        "ix_product_variant_store_id_product_id",
        "product_variant",
        ["store_id", "product_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_product_variant_store_id_product_id", table_name="product_variant")
    op.drop_index(op.f("ix_product_variant_store_id"), table_name="product_variant")
    op.drop_table("product_variant")
    op.drop_index("ix_product_store_id_status", table_name="product")
    op.drop_index("ix_product_store_id_category_id", table_name="product")
    op.drop_index(op.f("ix_product_store_id"), table_name="product")
    op.drop_table("product")
    op.drop_index(op.f("ix_category_store_id"), table_name="category")
    op.drop_table("category")
