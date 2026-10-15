import re
import secrets
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Store, StoreOldSlug

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
    return _first_free(base, set((await db.scalars(query)).all()))


async def unique_store_slug(db: AsyncSession, base: str) -> str:
    """unique_slug for a new shop: other shops' old links are taken too.
    On an unscoped session, so every shop counts."""
    prefix = base[: MAX_SLUG_LENGTH - 4]
    taken: set[str] = set()
    for column in (Store.slug, StoreOldSlug.slug):
        query = select(column).where(column.startswith(prefix, autoescape=True))
        taken.update((await db.scalars(query)).all())
    return _first_free(base, taken)


async def store_slug_taken(db: AsyncSession, slug: str, store_id: uuid.UUID | None = None) -> bool:
    """Another shop's link, now or before (store_id: the shop asking, whose
    own links are free to it). On an unscoped session; it only says yes or no."""
    for column, owner in ((Store.slug, Store.id), (StoreOldSlug.slug, StoreOldSlug.store_id)):
        query = select(owner).where(column == slug)
        if store_id is not None:
            query = query.where(owner != store_id)
        if await db.scalar(query.limit(1)) is not None:
            return True
    return False


def _first_free(base: str, taken: set[str]) -> str:
    prefix = base[: MAX_SLUG_LENGTH - 4]
    if base not in taken:
        return base
    n = 2
    while (candidate := f"{prefix}-{n}") in taken:
        n += 1
    return candidate
