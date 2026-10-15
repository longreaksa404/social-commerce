"""store_old_slug: a shop's earlier links keep working, with RLS

When a seller changes the shop's link (Settings → Link), the old one is
kept here for that shop: /shop/<old> still opens it and the page moves to
the new link, so posts already shared don't break (founder's approval
2026-10-15). No other shop can take an old link.

app_user (seller requests) adds a row when the link changes and removes
one when the shop changes back to it.

Revision ID: e5a9c2f7b318
Revises: c3f8a1d6e2b4
Create Date: 2026-10-15 14:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5a9c2f7b318"
down_revision: str | Sequence[str] | None = "c3f8a1d6e2b4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CURRENT_TENANT = "NULLIF(current_setting('app.tenant_id', true), '')::uuid"


def upgrade() -> None:
    op.create_table(
        "store_old_slug",
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("store_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["store_id"],
            ["store.id"],
            name=op.f("fk_store_old_slug_store_id_store"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("slug", name=op.f("pk_store_old_slug")),
    )
    op.create_index(op.f("ix_store_old_slug_store_id"), "store_old_slug", ["store_id"])

    op.execute("GRANT SELECT, INSERT, DELETE ON store_old_slug TO app_user")
    op.execute("ALTER TABLE store_old_slug ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON store_old_slug "
        f"USING (store_id = {CURRENT_TENANT}) WITH CHECK (store_id = {CURRENT_TENANT})"
    )


def downgrade() -> None:
    op.execute("DROP POLICY tenant_isolation ON store_old_slug")
    op.execute("REVOKE ALL ON store_old_slug FROM app_user")
    op.drop_index(op.f("ix_store_old_slug_store_id"), table_name="store_old_slug")
    op.drop_table("store_old_slug")
