"""customer.telegram_phone: the number the customer's Telegram shared

"Get updates on Telegram" on the order page (founder's pick 2026-10-15):
the customer shares their Telegram number with the bot, which then sends
them their orders' news (customer.telegram_user_id, until now never
written). The seller sees "Phone confirmed in Telegram" when it's the
order's number, or this number when it's another one.

Revision ID: c3f8a1d6e2b4
Revises: b7e2c4a9d1f3
Create Date: 2026-10-15 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3f8a1d6e2b4"
down_revision: str | Sequence[str] | None = "b7e2c4a9d1f3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("customer", sa.Column("telegram_phone", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("customer", "telegram_phone")
