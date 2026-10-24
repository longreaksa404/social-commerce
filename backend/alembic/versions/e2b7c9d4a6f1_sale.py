"""sale: a sale on chosen products, with RLS

A percentage or an amount off the products a seller picks, until a day
or until removed (founder's test list #21, 2026-10-24). A tenant table:
app_user reads and writes only its shop's rows.

Revision ID: e2b7c9d4a6f1
Revises: d9a3f1b7c2e5
Create Date: 2026-10-24

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e2b7c9d4a6f1"
down_revision: str | Sequence[str] | None = "d9a3f1b7c2e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CURRENT_TENANT = "NULLIF(current_setting('app.tenant_id', true), '')::uuid"


def upgrade() -> None:
    op.create_table(
        "sale",
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column("percent_off", sa.Integer(), nullable=True),
        sa.Column("amount_off", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column(
            "product_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("store_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(percent_off IS NULL) <> (amount_off IS NULL)",
            name=op.f("ck_sale_one_kind_of_saving"),
        ),
        sa.CheckConstraint(
            "percent_off IS NULL OR percent_off BETWEEN 1 AND 90", name=op.f("ck_sale_percent")
        ),
        sa.CheckConstraint("amount_off IS NULL OR amount_off > 0", name=op.f("ck_sale_amount")),
        sa.ForeignKeyConstraint(
            ["store_id"], ["store.id"], name=op.f("fk_sale_store_id_store"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sale")),
    )
    op.create_index(op.f("ix_sale_store_id"), "sale", ["store_id"])

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON sale TO app_user")
    op.execute("ALTER TABLE sale ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON sale "
        f"USING (store_id = {CURRENT_TENANT}) WITH CHECK (store_id = {CURRENT_TENANT})"
    )


def downgrade() -> None:
    op.execute("DROP POLICY tenant_isolation ON sale")
    op.execute("REVOKE ALL ON sale FROM app_user")
    op.drop_index(op.f("ix_sale_store_id"), table_name="sale")
    op.drop_table("sale")
