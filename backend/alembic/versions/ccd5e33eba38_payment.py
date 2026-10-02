"""payment table, with RLS; existing orders get a cash-on-delivery payment

Same RLS setup as the ccd7d9bce820 migration: app_user may read and write
only rows whose store_id is the session's app.tenant_id.

Orders placed before payments existed had no payment method, so each gets
a pending cash-on-delivery payment for its total: the seller can then
record it as paid and complete the order (02_TECHNICAL.md section 7.4).

Revision ID: ccd5e33eba38
Revises: 8980a033af6d
Create Date: 2026-10-02 16:44:37.130863

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ccd5e33eba38"
down_revision: str | Sequence[str] | None = "8980a033af6d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CURRENT_TENANT = "NULLIF(current_setting('app.tenant_id', true), '')::uuid"


def upgrade() -> None:
    op.create_table(
        "payment",
        sa.Column("order_id", sa.Uuid(), nullable=False),
        sa.Column(
            "method",
            sa.Enum(
                "cod",
                "bank_transfer",
                "khqr",
                name="method",
                native_enum=False,
                create_constraint=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "paid",
                "failed",
                "refunded",
                name="status",
                native_enum=False,
                create_constraint=False,
                length=32,
            ),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("reference", sa.Text(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("store_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "method IN ('cod', 'bank_transfer', 'khqr')", name=op.f("ck_payment_method")
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'paid', 'failed', 'refunded')", name=op.f("ck_payment_status")
        ),
        sa.CheckConstraint("amount >= 0", name=op.f("ck_payment_amount_not_negative")),
        sa.ForeignKeyConstraint(
            ["order_id"], ["order.id"], name=op.f("fk_payment_order_id_order"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["store_id"], ["store.id"], name=op.f("fk_payment_store_id_store"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payment")),
        sa.UniqueConstraint("order_id", name=op.f("uq_payment_order_id")),
    )
    op.create_index(op.f("ix_payment_store_id"), "payment", ["store_id"], unique=False)

    op.execute(
        "INSERT INTO payment (id, store_id, order_id, method, status, amount, created_at) "
        "SELECT gen_random_uuid(), store_id, id, 'cod', 'pending', total, created_at "
        'FROM "order"'
    )

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON payment TO app_user")
    op.execute("ALTER TABLE payment ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON payment "
        f"USING (store_id = {CURRENT_TENANT}) WITH CHECK (store_id = {CURRENT_TENANT})"
    )


def downgrade() -> None:
    op.execute("DROP POLICY tenant_isolation ON payment")
    op.execute("REVOKE ALL ON payment FROM app_user")
    op.drop_index(op.f("ix_payment_store_id"), table_name="payment")
    op.drop_table("payment")
