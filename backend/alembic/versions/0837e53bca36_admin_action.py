"""admin action

The admin panel's log (01_PRODUCT.md §22.11, part 28): one row per thing
done from the admin. Kept when its admin or shop goes. No app_user grant:
not tenant data.

Revision ID: 0837e53bca36
Revises: 388a455df41c
Create Date: 2026-10-30 14:42:08.441579

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0837e53bca36"
down_revision: str | Sequence[str] | None = "388a455df41c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "admin_action",
        sa.Column("admin_id", sa.Uuid(), nullable=True),
        sa.Column("store_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "details", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["admin_id"],
            ["admin_account.id"],
            name=op.f("fk_admin_action_admin_id_admin_account"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["store_id"],
            ["store.id"],
            name=op.f("fk_admin_action_store_id_store"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_action")),
    )
    op.create_index("ix_admin_action_created_at", "admin_action", ["created_at"], unique=False)
    op.create_index(
        "ix_admin_action_store_id_created_at",
        "admin_action",
        ["store_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_admin_action_store_id_created_at", table_name="admin_action")
    op.drop_index("ix_admin_action_created_at", table_name="admin_action")
    op.drop_table("admin_action")
