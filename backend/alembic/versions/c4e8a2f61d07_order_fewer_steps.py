"""Orders in the retired steps go back to accepted

The order's own Preparing, Shipped and Delivered steps went, and Ready
stays only for pickup orders ("Ready to collect"); the delivery's row says
the rest (founder's test list #1, 2026-10-24). Orders sitting in those
steps move back to accepted, as the founder agreed; their delivery and
payment are left as they are. The values stay allowed by the CHECK
constraint, so nothing else changes.

Revision ID: c4e8a2f61d07
Revises: b7d41c2e9a10
Create Date: 2026-10-24

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c4e8a2f61d07"
down_revision: str | Sequence[str] | None = "b7d41c2e9a10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE "order" SET status = 'accepted'
        WHERE status IN ('processing', 'shipped', 'delivered')
        """
    )
    op.execute(
        """
        UPDATE "order" SET status = 'accepted'
        FROM delivery
        WHERE delivery.order_id = "order".id
          AND "order".status = 'ready'
          AND delivery.method <> 'pickup'
        """
    )


def downgrade() -> None:
    # Which step each order was in isn't kept: they stay accepted.
    pass
