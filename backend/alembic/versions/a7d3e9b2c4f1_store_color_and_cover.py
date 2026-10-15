"""store_color_and_cover: the shop's colour and cover photo

The colour customers see in the shop, one of eight made for light and dark
mode (every shop starts navy, as before), and a wide cover photo at the
top of the shop that is also its link card (founder's picks 1A-5A and
approval of both columns, 2026-10-15). The dashboard stays navy.

The cover is uploaded like the logo, into stores/<id>/cover/ in R2, so
erasing a shop deletes it with the rest of the shop's folder.

Revision ID: a7d3e9b2c4f1
Revises: e5a9c2f7b318
Create Date: 2026-10-15 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a7d3e9b2c4f1"
down_revision: str | Sequence[str] | None = "e5a9c2f7b318"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COLORS = ("navy", "teal", "forest", "olive", "coffee", "wine", "plum", "charcoal")


def upgrade() -> None:
    op.add_column("store", sa.Column("cover_url", sa.Text(), nullable=True))
    op.add_column(
        "store",
        sa.Column(
            "color",
            sa.Enum(
                *COLORS, name="shop_color", native_enum=False, create_constraint=False, length=32
            ),
            server_default="navy",
            nullable=False,
        ),
    )
    values = ", ".join(f"'{color}'" for color in COLORS)
    op.create_check_constraint(op.f("ck_store_shop_color"), "store", f"color IN ({values})")


def downgrade() -> None:
    op.drop_constraint(op.f("ck_store_shop_color"), "store", type_="check")
    op.drop_column("store", "color")
    op.drop_column("store", "cover_url")
