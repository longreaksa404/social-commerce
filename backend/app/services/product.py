"""Every query filters by store_id explicitly (layer 1) and runs on a
tenant session where RLS enforces the same thing (layer 2)."""

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.errors import AppError, NotFound
from app.models import Product, ProductStatus, ProductVariant
from app.schemas.product import ProductCreate, ProductUpdate, VariantIn
from app.services import category as category_service
from app.services.slugs import slugify, unique_slug


async def list_products(
    db: AsyncSession,
    store_id: uuid.UUID,
    status: ProductStatus | None = None,
    category_id: uuid.UUID | None = None,
) -> list[Product]:
    query = (
        select(Product)
        .where(Product.store_id == store_id)
        .options(selectinload(Product.variants))
        .order_by(Product.created_at.desc())
    )
    if status is not None:
        query = query.where(Product.status == status)
    if category_id is not None:
        query = query.where(Product.category_id == category_id)
    return list((await db.scalars(query)).all())


async def get_product(db: AsyncSession, store_id: uuid.UUID, product_id: uuid.UUID) -> Product:
    product = await db.scalar(
        select(Product)
        .where(Product.id == product_id, Product.store_id == store_id)
        .options(selectinload(Product.variants))
    )
    if product is None:
        raise NotFound("PRODUCT_NOT_FOUND", "Product not found.")
    return product


async def create_product(db: AsyncSession, store_id: uuid.UUID, data: ProductCreate) -> Product:
    await _check_category(db, store_id, data.category_id)
    slug = data.slug or await unique_slug(
        db, Product.slug, slugify(data.name), Product.store_id == store_id
    )
    product = Product(
        store_id=store_id,
        category_id=data.category_id,
        name=data.name,
        slug=slug,
        description=data.description,
        price=data.price,
        status=data.status,
        has_variants=data.has_variants,
        stock_quantity=None if data.has_variants else (data.stock_quantity or 0),
        variants=[_new_variant(store_id, v) for v in data.variants],
    )
    db.add(product)
    await _commit(db)
    return product


async def update_product(
    db: AsyncSession, store_id: uuid.UUID, product_id: uuid.UUID, data: ProductUpdate
) -> Product:
    product = await get_product(db, store_id, product_id)
    changes = data.model_dump(exclude_unset=True)

    if "category_id" in changes:
        await _check_category(db, store_id, data.category_id)
        product.category_id = data.category_id
    for field in ("name", "slug", "price", "status"):
        if changes.get(field) is not None:
            setattr(product, field, changes[field])
    if "description" in changes:
        product.description = data.description
    if data.image_urls is not None:
        product.image_urls = _checked_image_urls(store_id, product.id, data.image_urls)

    has_variants = product.has_variants if data.has_variants is None else data.has_variants
    if data.variants is not None:
        product.variants = _merge_variants(store_id, product.variants, data.variants)
    if has_variants:
        if not product.variants:
            raise AppError(
                422,
                "VARIANTS_REQUIRED",
                "Add at least one variant, or turn variants off.",
                "variants",
            )
        product.stock_quantity = None
    else:
        if data.variants:
            raise AppError(
                422, "VARIANTS_DISABLED", "Turn variants on to add variants.", "variants"
            )
        product.variants = []
        if data.stock_quantity is not None:
            product.stock_quantity = data.stock_quantity
        elif product.stock_quantity is None:
            product.stock_quantity = 0
    product.has_variants = has_variants

    await _commit(db)
    return product


async def deactivate_product(db: AsyncSession, store_id: uuid.UUID, product_id: uuid.UUID) -> None:
    """Soft delete (02_TECHNICAL.md 6.2): the product stays for order history."""
    product = await get_product(db, store_id, product_id)
    product.status = ProductStatus.INACTIVE
    await db.commit()


def _new_variant(store_id: uuid.UUID, data: VariantIn) -> ProductVariant:
    return ProductVariant(
        store_id=store_id,
        name=data.name,
        sku=data.sku,
        price_override=data.price_override,
        stock_quantity=data.stock_quantity or 0,
    )


def _merge_variants(
    store_id: uuid.UUID, existing: list[ProductVariant], incoming: list[VariantIn]
) -> list[ProductVariant]:
    by_id = {v.id: v for v in existing}
    merged = []
    for data in incoming:
        if data.id is None:
            merged.append(_new_variant(store_id, data))
            continue
        variant = by_id.get(data.id)
        if variant is None:
            raise AppError(422, "VARIANT_NOT_FOUND", "A variant was not found.", "variants")
        variant.name = data.name
        variant.sku = data.sku
        variant.price_override = data.price_override
        if data.stock_quantity is not None:
            variant.stock_quantity = data.stock_quantity
        merged.append(variant)
    return merged


async def _check_category(
    db: AsyncSession, store_id: uuid.UUID, category_id: uuid.UUID | None
) -> None:
    # FK checks bypass RLS, so this is what stops a foreign category id.
    if category_id is None:
        return
    try:
        await category_service.get_category(db, store_id, category_id)
    except NotFound as exc:
        raise AppError(422, "CATEGORY_NOT_FOUND", "Category not found.", "category_id") from exc


def image_prefix(store_id: uuid.UUID, product_id: uuid.UUID) -> str:
    return f"{get_settings().r2_public_url}/stores/{store_id}/products/{product_id}/"


def _checked_image_urls(store_id: uuid.UUID, product_id: uuid.UUID, urls: list[str]) -> list[str]:
    """Only images uploaded for this product may be attached to it."""
    prefix = image_prefix(store_id, product_id)
    if len(set(urls)) != len(urls) or not all(
        get_settings().r2_public_url and url.startswith(prefix) for url in urls
    ):
        raise AppError(422, "INVALID_IMAGE", "Invalid product image.", "image_urls")
    return urls


async def _commit(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError(
            409, "SLUG_TAKEN", "Another product already uses this link.", "slug"
        ) from exc
