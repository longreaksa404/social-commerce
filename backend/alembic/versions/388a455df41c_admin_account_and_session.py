"""admin account and session

The admin panel's own login (01_PRODUCT.md §22.11, founder 2026-10-28):
the system owner's account, not a shop's, and its sessions. No app_user
grant: not tenant data.

Revision ID: 388a455df41c
Revises: e2b7c9d4a6f1
Create Date: 2026-10-28 16:27:18.410253

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "388a455df41c"
down_revision: str | Sequence[str] | None = "e2b7c9d4a6f1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "admin_account",
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("telegram_user_id", sa.BigInteger(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_account")),
        sa.UniqueConstraint("phone", name=op.f("uq_admin_account_phone")),
    )
    op.create_table(
        "admin_session",
        sa.Column("admin_id", sa.Uuid(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("password_at", sa.DateTime(timezone=True), nullable=True),
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
            name=op.f("fk_admin_session_admin_id_admin_account"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_session")),
    )
    op.create_index(op.f("ix_admin_session_admin_id"), "admin_session", ["admin_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_admin_session_admin_id"), table_name="admin_session")
    op.drop_table("admin_session")
    op.drop_table("admin_account")
