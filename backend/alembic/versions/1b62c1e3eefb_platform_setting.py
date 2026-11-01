"""platform setting

Oak Order's own settings changed from the admin panel without a redeploy
(founder's pick D2B, 02 §5): the riel rate, the prices, the trial length
and the jobs' last runs. A missing key reads as today's default. Sellers'
pages and the shop read the prices and the rate: app_user may only SELECT.

Revision ID: 1b62c1e3eefb
Revises: 5c1d8e3a7f20
Create Date: 2026-10-30 23:55:15.819562

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1b62c1e3eefb"
down_revision: str | Sequence[str] | None = "5c1d8e3a7f20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "platform_setting",
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_by", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["updated_by"],
            ["admin_account.id"],
            name=op.f("fk_platform_setting_updated_by_admin_account"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_platform_setting")),
    )
    op.execute("GRANT SELECT ON platform_setting TO app_user")


def downgrade() -> None:
    op.drop_table("platform_setting")
