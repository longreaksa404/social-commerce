"""phone_check.telegram_name: a new seller's name from Telegram

Sign-up no longer asks for the seller's name: the bot keeps the name of
the Telegram account that shared the number, and a new seller starts with
it (founder, 2026-10-18). Nullable: older checks and customers' checks
have none.

Revision ID: 5e89ca8ba3c8
Revises: ffa0fb97ae00
Create Date: 2026-10-18 14:03:27.557913

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5e89ca8ba3c8"
down_revision: str | Sequence[str] | None = "ffa0fb97ae00"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("phone_check", sa.Column("telegram_name", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("phone_check", "telegram_name")
