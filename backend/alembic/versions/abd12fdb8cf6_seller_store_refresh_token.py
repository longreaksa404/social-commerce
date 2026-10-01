"""seller, store, refresh_token tables

Revision ID: abd12fdb8cf6
Revises:
Create Date: 2026-10-01 08:32:46.666086

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "abd12fdb8cf6"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "seller",
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_seller")),
        sa.UniqueConstraint("email", name=op.f("uq_seller_email")),
    )
    op.create_table(
        "refresh_token",
        sa.Column("seller_id", sa.Uuid(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["seller_id"],
            ["seller.id"],
            name=op.f("fk_refresh_token_seller_id_seller"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refresh_token")),
    )
    op.create_index(
        op.f("ix_refresh_token_seller_id"), "refresh_token", ["seller_id"], unique=False
    )
    op.create_table(
        "store",
        sa.Column("seller_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column(
            "currency",
            sa.Enum(
                "USD", "KHR", name="currency", native_enum=False, create_constraint=False, length=32
            ),
            server_default="USD",
            nullable=False,
        ),
        sa.Column("telegram_chat_id", sa.Text(), nullable=True),
        sa.Column(
            "payment_config",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column(
            "delivery_config",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column(
            "order_confirmation_mode",
            sa.Enum(
                "automatic",
                "manual",
                name="order_confirmation_mode",
                native_enum=False,
                create_constraint=False,
                length=32,
            ),
            server_default="manual",
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("currency IN ('USD', 'KHR')", name=op.f("ck_store_currency")),
        sa.CheckConstraint(
            "order_confirmation_mode IN ('automatic', 'manual')",
            name=op.f("ck_store_order_confirmation_mode"),
        ),
        sa.ForeignKeyConstraint(
            ["seller_id"], ["seller.id"], name=op.f("fk_store_seller_id_seller"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_store")),
        sa.UniqueConstraint("seller_id", name=op.f("uq_store_seller_id")),
        sa.UniqueConstraint("slug", name=op.f("uq_store_slug")),
    )


def downgrade() -> None:
    op.drop_table("store")
    op.drop_index(op.f("ix_refresh_token_seller_id"), table_name="refresh_token")
    op.drop_table("refresh_token")
    op.drop_table("seller")
