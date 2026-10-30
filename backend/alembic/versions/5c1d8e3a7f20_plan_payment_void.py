"""plan_payment status void: a payment undone by the founder

Admin panel, part 16 (01_PRODUCT.md §22.11, 02 §5, 2026-10-28): a payment
marked paid by mistake is undone, not deleted. It keeps its dates (what it
had covered), so "paid has dates" becomes "paid or undone has dates".

Revision ID: 5c1d8e3a7f20
Revises: 0837e53bca36
Create Date: 2026-10-30 18:10:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5c1d8e3a7f20"
down_revision: str | Sequence[str] | None = "0837e53bca36"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DATES = "(paid_on IS NOT NULL AND covers_from IS NOT NULL AND covers_until IS NOT NULL)"


def upgrade() -> None:
    op.drop_constraint(op.f("ck_plan_payment_status"), "plan_payment", type_="check")
    op.create_check_constraint(
        op.f("ck_plan_payment_status"),
        "plan_payment",
        "status IN ('pending', 'paid', 'failed', 'void')",
    )
    op.drop_constraint(op.f("ck_plan_payment_paid_has_dates"), "plan_payment", type_="check")
    op.create_check_constraint(
        op.f("ck_plan_payment_paid_has_dates"),
        "plan_payment",
        f"(status IN ('paid', 'void')) = {DATES}",
    )


def downgrade() -> None:
    # Undone payments didn't happen: the old table has no word for them.
    op.execute("DELETE FROM plan_payment WHERE status = 'void'")
    op.drop_constraint(op.f("ck_plan_payment_paid_has_dates"), "plan_payment", type_="check")
    op.create_check_constraint(
        op.f("ck_plan_payment_paid_has_dates"), "plan_payment", f"(status = 'paid') = {DATES}"
    )
    op.drop_constraint(op.f("ck_plan_payment_status"), "plan_payment", type_="check")
    op.create_check_constraint(
        op.f("ck_plan_payment_status"), "plan_payment", "status IN ('pending', 'paid', 'failed')"
    )
