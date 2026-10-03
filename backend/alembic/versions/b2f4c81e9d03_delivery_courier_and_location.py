"""delivery.courier instead of area_name; order location and address note

Delivery areas were dropped for one fee per shop (decided 2026-10-03): the
customer now chooses the seller's own delivery or one of the seller's
couriers (J&T Express, VET Express, ...), and can share their GPS location
and a note for the driver.

Revision ID: b2f4c81e9d03
Revises: 7461cde1fdf0
Create Date: 2026-10-03 11:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2f4c81e9d03"
down_revision: str | Sequence[str] | None = "7461cde1fdf0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("delivery", "area_name", new_column_name="courier")
    op.add_column("order", sa.Column("delivery_lat", sa.Numeric(9, 6), nullable=True))
    op.add_column("order", sa.Column("delivery_lng", sa.Numeric(9, 6), nullable=True))
    op.add_column("order", sa.Column("delivery_address_note", sa.Text(), nullable=True))
    op.create_check_constraint(
        op.f("ck_order_location_complete"),
        "order",
        "(delivery_lat IS NULL) = (delivery_lng IS NULL)",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_order_location_complete"), "order", type_="check")
    op.drop_column("order", "delivery_address_note")
    op.drop_column("order", "delivery_lng")
    op.drop_column("order", "delivery_lat")
    op.alter_column("delivery", "courier", new_column_name="area_name")
