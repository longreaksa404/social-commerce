"""store.paid_until may be null: a shop in setup

A new shop no longer starts its free trial at sign-up: it's in setup (no
orders) until the owner opens it, which starts the 30-day trial (founder,
2026-10-16; 01_PRODUCT.md §33.1). Shops that exist keep their dates.

Revision ID: ffa0fb97ae00
Revises: b8e4f0c3d5a2
Create Date: 2026-10-16 08:04:40.590647

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ffa0fb97ae00"
down_revision: str | Sequence[str] | None = "b8e4f0c3d5a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TRIAL_DAYS = 30  # app.models.account.TRIAL_DAYS when this ran


def upgrade() -> None:
    op.alter_column("store", "paid_until", nullable=True)


def downgrade() -> None:
    # Shops still in setup get their trial from today.
    op.execute(
        "UPDATE store SET paid_until = "
        f"(now() AT TIME ZONE 'Asia/Phnom_Penh')::date + {TRIAL_DAYS - 1} "
        "WHERE paid_until IS NULL"
    )
    op.alter_column("store", "paid_until", nullable=False)
