"""customer.photo_url: a customer's Telegram profile photo

Once a customer's Telegram is linked to a shop's customer, the bot copies
their profile photo to R2 and the seller sees it on the order and the
customer's page (founder, 2026-10-20). Nullable: guests and customers
without a photo have none.

Revision ID: ac819f379d9c
Revises: 3fe44025aa7b
Create Date: 2026-10-20

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ac819f379d9c"
down_revision: str | Sequence[str] | None = "3fe44025aa7b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("customer", sa.Column("photo_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("customer", "photo_url")
