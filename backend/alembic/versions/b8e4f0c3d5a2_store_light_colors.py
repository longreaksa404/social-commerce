"""store_light_colors: six light shop colours

Pink, sky, mint, peach, lilac and sand beside the eight deep ones, with
dark words on their buttons (founder's request after trying the colours,
2026-10-15). Only the CHECK constraint changes.

Revision ID: b8e4f0c3d5a2
Revises: a7d3e9b2c4f1
Create Date: 2026-10-15 20:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b8e4f0c3d5a2"
down_revision: str | Sequence[str] | None = "a7d3e9b2c4f1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEEP = ("navy", "teal", "forest", "olive", "coffee", "wine", "plum", "charcoal")
LIGHT = ("pink", "sky", "mint", "peach", "lilac", "sand")


def _check(colors: tuple[str, ...]) -> None:
    values = ", ".join(f"'{color}'" for color in colors)
    op.drop_constraint(op.f("ck_store_shop_color"), "store", type_="check")
    op.create_check_constraint(op.f("ck_store_shop_color"), "store", f"color IN ({values})")


def upgrade() -> None:
    _check(DEEP + LIGHT)


def downgrade() -> None:
    op.execute(f"UPDATE store SET color = 'navy' WHERE color IN {LIGHT}")
    _check(DEEP)
