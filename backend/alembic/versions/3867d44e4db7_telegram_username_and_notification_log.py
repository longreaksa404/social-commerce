"""store.telegram_username; notification_log table, with RLS

telegram_username is the seller's own Telegram account, which "Ask seller"
on the shop opens (decided 2026-10-03). notification_log is the table from
02_TECHNICAL.md section 5.2; Telegram alerts write to it from Phase 6, web
notifications from Phase 7. Same RLS setup as the ccd7d9bce820 migration.

Revision ID: 3867d44e4db7
Revises: b2f4c81e9d03
Create Date: 2026-10-03 10:05:53.827460

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3867d44e4db7"
down_revision: str | Sequence[str] | None = "b2f4c81e9d03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CURRENT_TENANT = "NULLIF(current_setting('app.tenant_id', true), '')::uuid"


def upgrade() -> None:
    op.create_table(
        "notification_log",
        sa.Column(
            "channel",
            sa.Enum(
                "web",
                "telegram",
                name="channel",
                native_enum=False,
                create_constraint=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column(
            "payload", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False
        ),
        sa.Column(
            "status",
            sa.Enum(
                "sent",
                "failed",
                name="status",
                native_enum=False,
                create_constraint=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column(
            "sent_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("store_id", sa.Uuid(), nullable=False),
        sa.CheckConstraint(
            "channel IN ('web', 'telegram')", name=op.f("ck_notification_log_channel")
        ),
        sa.CheckConstraint("status IN ('sent', 'failed')", name=op.f("ck_notification_log_status")),
        sa.ForeignKeyConstraint(
            ["store_id"],
            ["store.id"],
            name=op.f("fk_notification_log_store_id_store"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notification_log")),
    )
    op.create_index(
        op.f("ix_notification_log_store_id"), "notification_log", ["store_id"], unique=False
    )
    op.add_column("store", sa.Column("telegram_username", sa.Text(), nullable=True))

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON notification_log TO app_user")
    op.execute("ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON notification_log "
        f"USING (store_id = {CURRENT_TENANT}) WITH CHECK (store_id = {CURRENT_TENANT})"
    )


def downgrade() -> None:
    op.execute("DROP POLICY tenant_isolation ON notification_log")
    op.execute("REVOKE ALL ON notification_log FROM app_user")
    op.drop_column("store", "telegram_username")
    op.drop_index(op.f("ix_notification_log_store_id"), table_name="notification_log")
    op.drop_table("notification_log")
