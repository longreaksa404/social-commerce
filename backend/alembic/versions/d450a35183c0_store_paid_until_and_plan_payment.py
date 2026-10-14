"""store.paid_until and plan_payment, with RLS

The shop's plan with Oak Order (01_PRODUCT.md §33.1, founder's approval
2026-10-14): store.paid_until is the last day a shop is covered, by its
30-day free trial and then by payments; plan_payment lists those payments.
Shops that exist now get their full trial from today (Phnom Penh), so none
runs out the day this ships.

app_user (seller requests) may only read plan_payment: payments are
recorded by the founder's command on an unscoped session.

Revision ID: d450a35183c0
Revises: 39a133fd8c02
Create Date: 2026-10-14 07:05:25.598427

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d450a35183c0"
down_revision: str | Sequence[str] | None = "39a133fd8c02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CURRENT_TENANT = "NULLIF(current_setting('app.tenant_id', true), '')::uuid"
TRIAL_DAYS = 30  # app.models.account.TRIAL_DAYS when this ran


def _enum(name: str, *values: str) -> sa.Enum:
    return sa.Enum(*values, name=name, native_enum=False, create_constraint=False, length=32)


def upgrade() -> None:
    op.add_column("store", sa.Column("paid_until", sa.Date(), nullable=True))
    op.execute(
        "UPDATE store SET paid_until = "
        f"(now() AT TIME ZONE 'Asia/Phnom_Penh')::date + {TRIAL_DAYS - 1}"
    )
    op.alter_column("store", "paid_until", nullable=False)

    op.create_table(
        "plan_payment",
        sa.Column("period", _enum("period", "month", "year"), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("method", _enum("method", "manual"), nullable=False),
        sa.Column("reference", sa.Text(), nullable=True),
        sa.Column("paid_on", sa.Date(), nullable=False),
        sa.Column("covers_from", sa.Date(), nullable=False),
        sa.Column("covers_until", sa.Date(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("store_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("period IN ('month', 'year')", name=op.f("ck_plan_payment_period")),
        sa.CheckConstraint("method IN ('manual')", name=op.f("ck_plan_payment_method")),
        sa.CheckConstraint("amount >= 0", name=op.f("ck_plan_payment_amount_not_negative")),
        sa.CheckConstraint(
            "covers_from <= covers_until", name=op.f("ck_plan_payment_covers_in_order")
        ),
        sa.ForeignKeyConstraint(
            ["store_id"],
            ["store.id"],
            name=op.f("fk_plan_payment_store_id_store"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_plan_payment")),
    )
    op.create_index(op.f("ix_plan_payment_store_id"), "plan_payment", ["store_id"])

    op.execute("GRANT SELECT ON plan_payment TO app_user")
    op.execute("ALTER TABLE plan_payment ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON plan_payment "
        f"USING (store_id = {CURRENT_TENANT}) WITH CHECK (store_id = {CURRENT_TENANT})"
    )


def downgrade() -> None:
    op.execute("DROP POLICY tenant_isolation ON plan_payment")
    op.execute("REVOKE ALL ON plan_payment FROM app_user")
    op.drop_index(op.f("ix_plan_payment_store_id"), table_name="plan_payment")
    op.drop_table("plan_payment")
    op.drop_column("store", "paid_until")
