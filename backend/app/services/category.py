"""Every query filters by store_id explicitly (layer 1) and runs on a
tenant session where RLS enforces the same thing (layer 2)."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, NotFound
from app.models import Category, Product
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.services.slugs import slugify, unique_slug


async def list_categories(db: AsyncSession, store_id: uuid.UUID) -> list[CategoryOut]:
    product_count = (
        select(func.count(Product.id))
        .where(Product.category_id == Category.id, Product.store_id == store_id)
        .scalar_subquery()
    )
    rows = await db.execute(
        select(Category, product_count).where(Category.store_id == store_id).order_by(Category.name)
    )
    return [
        CategoryOut.model_validate(category).model_copy(update={"product_count": count})
        for category, count in rows
    ]


async def get_category(db: AsyncSession, store_id: uuid.UUID, category_id: uuid.UUID) -> Category:
    category = await db.scalar(
        select(Category).where(Category.id == category_id, Category.store_id == store_id)
    )
    if category is None:
        raise NotFound("CATEGORY_NOT_FOUND", "Category not found.")
    return category


async def create_category(db: AsyncSession, store_id: uuid.UUID, data: CategoryCreate) -> Category:
    slug = data.slug or await unique_slug(
        db, Category.slug, slugify(data.name), Category.store_id == store_id
    )
    category = Category(store_id=store_id, name=data.name, slug=slug)
    db.add(category)
    await _commit(db)
    return category


async def update_category(
    db: AsyncSession, store_id: uuid.UUID, category_id: uuid.UUID, data: CategoryUpdate
) -> Category:
    category = await get_category(db, store_id, category_id)
    for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(category, field, value)
    await _commit(db)
    return category


async def delete_category(db: AsyncSession, store_id: uuid.UUID, category_id: uuid.UUID) -> None:
    """Products in it stay, uncategorized (FK is ON DELETE SET NULL)."""
    category = await get_category(db, store_id, category_id)
    await db.delete(category)
    await db.commit()


async def _commit(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError(
            409, "SLUG_TAKEN", "Another category already uses this link.", "slug"
        ) from exc
