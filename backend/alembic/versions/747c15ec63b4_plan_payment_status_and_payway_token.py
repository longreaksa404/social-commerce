"""plan_payment status and PayWay transaction; the store's saved PayWay token

Billing through ABA PayWay (01_PRODUCT.md §33.1, founder's approval
2026-10-14). A payment can now wait for PayWay (pending) or fail; its days
are set when it's paid, so they may be empty until then. New methods:
payway (Pay now), payway_subscribe (Pay now that saves the ABA account or
card for auto-charge), payway_auto (an auto-charge). The store keeps the
saved token for the monthly auto-charge. Rows so far are all paid by hand.

Revision ID: 747c15ec63b4
Revises: d450a35183c0
Create Date: 2026-10-14 10:35:09.989559

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "747c15ec63b4"
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
    op.drop_constraint(op.f("ck_plan_payment_method"), "plan_payment", type_="check")
    op.create_check_constraint(
        op.f("ck_plan_payment_method"),
        "plan_payment",
        "method IN ('manual', 'payway', 'payway_subscribe', 'payway_auto')",
    )
    op.add_column("plan_payment", sa.Column("tran_id", sa.Text(), nullable=True))
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
    op.create_unique_constraint(op.f("uq_plan_payment_tran_id"), "plan_payment", ["tran_id"])

    op.add_column("store", sa.Column("payway_ctid", sa.Text(), nullable=True))
    op.add_column("store", sa.Column("payway_token", sa.Text(), nullable=True))
    op.add_column("store", sa.Column("payway_token_label", sa.Text(), nullable=True))
    op.create_unique_constraint(op.f("uq_store_payway_ctid"), "store", ["payway_ctid"])


def downgrade() -> None:
    op.drop_constraint(op.f("uq_store_payway_ctid"), "store", type_="unique")
    op.drop_column("store", "payway_token_label")
    op.drop_column("store", "payway_token")
    op.drop_column("store", "payway_ctid")

    # Only paid rows fit the old table.
    op.execute("DELETE FROM plan_payment WHERE status <> 'paid'")
    op.drop_constraint(op.f("uq_plan_payment_tran_id"), "plan_payment", type_="unique")
    op.drop_index("ix_plan_payment_store_id_created_at", table_name="plan_payment")
    op.drop_constraint(op.f("ck_plan_payment_paid_has_dates"), "plan_payment", type_="check")
    op.alter_column("plan_payment", "covers_until", existing_type=sa.Date(), nullable=False)
    op.alter_column("plan_payment", "covers_from", existing_type=sa.Date(), nullable=False)
    op.alter_column("plan_payment", "paid_on", existing_type=sa.Date(), nullable=False)
    op.drop_column("plan_payment", "failure")
    op.drop_column("plan_payment", "tran_id")
    op.drop_constraint(op.f("ck_plan_payment_method"), "plan_payment", type_="check")
    op.execute("UPDATE plan_payment SET method = 'manual'")
    op.create_check_constraint(
        op.f("ck_plan_payment_method"), "plan_payment", "method IN ('manual')"
    )
    op.drop_constraint(op.f("ck_plan_payment_status"), "plan_payment", type_="check")
    op.drop_column("plan_payment", "status")
