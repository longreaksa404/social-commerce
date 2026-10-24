"""store.instagram_username: Instagram as a way to reach the seller

Settings → Contact takes an Instagram account; the shop's "Ask the
seller" opens a DM there (ig.me/m/<username>), as Messenger does for a
Facebook page (founder's test list #22, 2026-10-24). Nullable: shops
without one show no Instagram button.

Revision ID: b7d41c2e9a10
Revises: ac819f379d9c
Create Date: 2026-10-24

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7d41c2e9a10"
down_revision: str | Sequence[str] | None = "ac819f379d9c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("store", sa.Column("instagram_username", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("store", "instagram_username")
