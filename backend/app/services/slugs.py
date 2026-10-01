import re
import secrets
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

MAX_SLUG_LENGTH = 50
SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


def slugify(text: str) -> str:
    """Lowercase ASCII words joined by hyphens.

    Names written only in Khmer (or any non-Latin script) have no ASCII
    letters; they get a short random slug that the seller can edit later.
    """
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    slug = slug[:MAX_SLUG_LENGTH].rstrip("-")
    return slug or secrets.token_hex(3)


async def unique_slug(db: AsyncSession, column: Any, base: str, *scope: Any) -> str:
    """First free slug among base, base-2, base-3, ... for `column`.

    `scope` narrows uniqueness, e.g. Product.store_id == store_id.
    """
    prefix = base[: MAX_SLUG_LENGTH - 4]  # room for "-NNN"
    query = select(column).where(column.startswith(prefix, autoescape=True), *scope)
    taken = set((await db.scalars(query)).all())
    if base not in taken:
        return base
    n = 2
    while (candidate := f"{prefix}-{n}") in taken:
        n += 1
    return candidate
