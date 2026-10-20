"""phone_check.cart: the cart of a customer's "Continue with Telegram"

A customer logging in with Telegram at checkout can finish inside Telegram
(the shop as a mini app); the check keeps the shop and the cart until then
(founder, 2026-10-20). Nullable: sellers' and older checks have none.

Revision ID: 3fe44025aa7b
Revises: 5e89ca8ba3c8
Create Date: 2026-10-20 04:06:48.593628

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3fe44025aa7b"
down_revision: str | Sequence[str] | None = "5e89ca8ba3c8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("phone_check", sa.Column("cart", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("phone_check", "cart")
