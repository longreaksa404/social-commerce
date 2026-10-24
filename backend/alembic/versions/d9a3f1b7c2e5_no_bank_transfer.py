"""Bank transfer is no longer a way to pay

Shops stop offering it (founder's test list #19, 2026-10-24); its details
stay in payment_config, so orders already placed with it still show the
account. A shop that took only bank transfer would be left with no way to
pay, so cash on delivery is turned on for it (the new-shop default).

Revision ID: d9a3f1b7c2e5
Revises: c4e8a2f61d07
Create Date: 2026-10-24

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d9a3f1b7c2e5"
down_revision: str | Sequence[str] | None = "c4e8a2f61d07"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Saved settings are stored whole, so each has its "cod" part.
    op.execute(
        """
        UPDATE store SET payment_config = jsonb_set(
            payment_config, '{cod,enabled}', 'true'::jsonb
        )
        WHERE payment_config->'bank_transfer'->>'enabled' = 'true'
          AND payment_config ? 'cod'
          AND coalesce(payment_config->'cod'->>'enabled', 'false') <> 'true'
          AND coalesce(payment_config->'khqr'->>'enabled', 'false') <> 'true'
        """
    )
    op.execute(
        """
        UPDATE store SET payment_config = jsonb_set(
            payment_config, '{bank_transfer,enabled}', 'false'::jsonb
        )
        WHERE payment_config->'bank_transfer'->>'enabled' = 'true'
        """
    )


def downgrade() -> None:
    # Which shops had it on isn't kept.
    pass
