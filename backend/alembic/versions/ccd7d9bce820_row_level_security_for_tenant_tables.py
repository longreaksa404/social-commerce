"""row level security for tenant tables

Seller requests run as the NOLOGIN role `app_user` (SET LOCAL ROLE, see
app/db/session.py), which has no BYPASSRLS. The login role that runs
migrations owns the tables and is not restricted, so auth and storefront
code must filter explicitly.

Revision ID: ccd7d9bce820
Revises: f49fee3833a0
Create Date: 2026-10-01

"""

from collections.abc import Sequence

from alembic import op

revision: str = "ccd7d9bce820"
down_revision: str | Sequence[str] | None = "f49fee3833a0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Empty string (setting cleared after a transaction) and unset both mean
# "no tenant", which matches no rows.
CURRENT_TENANT = "NULLIF(current_setting('app.tenant_id', true), '')::uuid"
TENANT_TABLES = ("category", "product", "product_variant")


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
                CREATE ROLE app_user NOLOGIN;
            END IF;
        END
        $$
        """
    )
    # Needed for SET ROLE; a no-op for superusers and repeat runs.
    op.execute("GRANT app_user TO CURRENT_USER")
    op.execute("GRANT USAGE ON SCHEMA public TO app_user")

    # The store row is the tenant itself: readable and editable, not
    # creatable or deletable from a seller request.
    op.execute("GRANT SELECT, UPDATE ON store TO app_user")
    op.execute("ALTER TABLE store ENABLE ROW LEVEL SECURITY")
    op.execute(
        f"CREATE POLICY tenant_isolation ON store "
        f"USING (id = {CURRENT_TENANT}) WITH CHECK (id = {CURRENT_TENANT})"
    )

    for table in TENANT_TABLES:
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO app_user")
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY tenant_isolation ON {table} "
            f"USING (store_id = {CURRENT_TENANT}) WITH CHECK (store_id = {CURRENT_TENANT})"
        )


def downgrade() -> None:
    # The app_user role is cluster-wide and is left in place.
    for table in ("store", *TENANT_TABLES):
        op.execute(f"DROP POLICY tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
        op.execute(f"REVOKE ALL ON {table} FROM app_user")
    op.execute("REVOKE USAGE ON SCHEMA public FROM app_user")
