"""plan_payment status: the seller's "I've paid", confirmed or not by the founder

Hand collection (01_PRODUCT.md §33.1, 2026-10-14): a seller taps "I've
paid" (pending), and the founder marks it paid or not found (failed, with
a note). Its days are set when it's paid, so they may be empty until then.
Rows so far are all paid by hand. (The PayWay version of this table, with
transactions and saved tokens, is parked on the payway branch.)

Revision ID: b7e2c4a9d1f3
Revises: d450a35183c0
Create Date: 2026-10-14 12:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7e2c4a9d1f3"
down_revision: str | Sequence[str] | None = "d450a35183c0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PAID_HAS_DATES = (
    "(status = 'paid') = (paid_on IS NOT NULL AND covers_from IS NOT NULL"
    " AND covers_until IS NOT NULL)"
)


def upgrade() -> None:
    op.add_column(
        "plan_payment",
        sa.Column(
            "status",
            sa.Enum("pending", "paid", "failed", name="status", native_enum=False, length=32),
            server_default="paid",
            nullable=False,
        ),
    )
    op.create_check_constraint(
        op.f("ck_plan_payment_status"), "plan_payment", "status IN ('pending', 'paid', 'failed')"
    )
    op.add_column("plan_payment", sa.Column("failure", sa.Text(), nullable=True))
    op.alter_column("plan_payment", "paid_on", existing_type=sa.Date(), nullable=True)
    op.alter_column("plan_payment", "covers_from", existing_type=sa.Date(), nullable=True)
    op.alter_column("plan_payment", "covers_until", existing_type=sa.Date(), nullable=True)
    op.create_check_constraint(
        op.f("ck_plan_payment_paid_has_dates"), "plan_payment", PAID_HAS_DATES
    )
    op.create_index(
        "ix_plan_payment_store_id_created_at", "plan_payment", ["store_id", "created_at"]
    )


def downgrade() -> None:
    # Only paid rows fit the old table.
    op.execute("DELETE FROM plan_payment WHERE status <> 'paid'")
    op.drop_index("ix_plan_payment_store_id_created_at", table_name="plan_payment")
    op.drop_constraint(op.f("ck_plan_payment_paid_has_dates"), "plan_payment", type_="check")
    op.alter_column("plan_payment", "covers_until", existing_type=sa.Date(), nullable=False)
    op.alter_column("plan_payment", "covers_from", existing_type=sa.Date(), nullable=False)
    op.alter_column("plan_payment", "paid_on", existing_type=sa.Date(), nullable=False)
    op.drop_column("plan_payment", "failure")
    op.drop_constraint(op.f("ck_plan_payment_status"), "plan_payment", type_="check")
    op.drop_column("plan_payment", "status")
