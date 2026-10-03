"""notification_log.read_at, for the dashboard's notification list

Phase 7: the web rows of notification_log are the dashboard's
notifications. read_at is when the seller opened the list with the row in,
on any device (decided 2026-10-03); null rows are what the bell counts.
Existing rows are all Telegram ones, so none show up as unread.

Revision ID: aa40287b7688
Revises: 3867d44e4db7
Create Date: 2026-10-03 15:01:23.640129

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "aa40287b7688"
down_revision: str | Sequence[str] | None = "3867d44e4db7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "notification_log", sa.Column("read_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index(
        "ix_notification_log_store_id_channel_sent_at",
        "notification_log",
        ["store_id", "channel", "sent_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_notification_log_store_id_channel_sent_at", table_name="notification_log")
    op.drop_column("notification_log", "read_at")
