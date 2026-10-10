"""Public storefront reads (02_TECHNICAL.md 6.2, "Storefront").

Anyone may open any shop, so the store itself is looked up by slug on an
unscoped session (get_store). Everything after that runs on a tenant
session for that store: every query filters by store_id explicitly
(layer 1) and RLS enforces the same thing (layer 2). Only active products
are shown.
"""

import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFound
from app.models import Category, Product, ProductStatus, Seller, Store
from app.schemas.storefront import (
    ShopCategoryOut,
    ShopCategoryPageOut,
    ShopCategoryRef,
    ShopProductCard,
    ShopProductOut,
    ShopStoreOut,
    ShopVariantOut,
)
from app.services.delivery import discount_settings, shop_delivery_options
from app.services.payment import payment_settings


async def get_store(db: AsyncSession, slug: str) -> Store:
    """The shop at /shop/{slug}; a deactivated seller's shop is gone."""
    store = await db.scalar(
        # The owner's account (staff logins link the other way, seller.store_id).
        select(Store)
        .join(Seller, Store.seller_id == Seller.id)
        .where(Store.slug == slug.lower(), Seller.is_active.is_(True))
    )
    if store is None:
        raise NotFound("STORE_NOT_FOUND", "This shop doesn't exist.")
    return store


async def store_page(db: AsyncSession, store: Store) -> ShopStoreOut:
    product_count = func.count(Product.id)
    rows = await db.execute(
        select(Category.name, Category.slug, product_count)
        .join(Product, Product.category_id == Category.id)
        .where(
            Category.store_id == store.id,
            Product.store_id == store.id,
            Product.status == ProductStatus.ACTIVE,
        )
        .group_by(Category.id)
        .order_by(Category.name)
    )
    return ShopStoreOut(
        name=store.name,
        slug=store.slug,
        description=store.description,
        logo_url=store.logo_url,
        currency=store.currency,
        categories=[
            ShopCategoryOut(name=name, slug=slug, product_count=count) for name, slug, count in rows
        ],
        payment_methods=payment_settings(store).enabled_methods(),
        delivery=shop_delivery_options(store),
        discounts=discount_settings(store).rules,
        telegram_username=store.telegram_username,
        contact_phone=store.contact_phone,
        messenger_username=store.messenger_username,
        orders_paused=store.orders_paused_now,
        orders_resume_on=store.orders_resume_on_now,
    )


async def list_products(
    db: AsyncSession, store_id: uuid.UUID, category_id: uuid.UUID | None = None
) -> list[ShopProductCard]:
    query = (
        select(Product)
        .where(Product.store_id == store_id, Product.status == ProductStatus.ACTIVE)
        .options(selectinload(Product.variants))
        .order_by(Product.created_at.desc())
    )
    if category_id is not None:
        query = query.where(Product.category_id == category_id)
    return [_card(product) for product in await db.scalars(query)]


async def get_product(db: AsyncSession, store_id: uuid.UUID, slug: str) -> ShopProductOut:
    product = await db.scalar(
        select(Product)
        .where(
            Product.store_id == store_id,
            Product.slug == slug.lower(),
            Product.status == ProductStatus.ACTIVE,
        )
        .options(selectinload(Product.variants))
    )
    if product is None:
        raise NotFound("PRODUCT_NOT_FOUND", "This product isn't available.")

    category = None
    if product.category_id is not None:
        category = await db.scalar(
            select(Category).where(
                Category.id == product.category_id, Category.store_id == store_id
            )
        )
    return ShopProductOut(
        id=product.id,
        name=product.name,
        slug=product.slug,
        description=product.description,
        price=product.price,
        image_urls=product.image_urls,
        has_variants=product.has_variants,
        stock_quantity=None if product.has_variants else (product.stock_quantity or 0),
        variants=[
            ShopVariantOut(
                id=variant.id,
                name=variant.name,
                price=_variant_price(product, variant.price_override),
                stock_quantity=variant.stock_quantity,
            )
            for variant in product.variants
        ],
        category=category and ShopCategoryRef(name=category.name, slug=category.slug),
    )


async def product_photo(db: AsyncSession, store_id: uuid.UUID, slug: str) -> str | None:
    """A product's first photo, for its link preview; same rule as
    get_product: only the shop's own products on sale."""
    image_urls = await db.scalar(
        select(Product.image_urls).where(
            Product.store_id == store_id,
            Product.slug == slug.lower(),
            Product.status == ProductStatus.ACTIVE,
        )
    )
    if image_urls is None:
        raise NotFound("PRODUCT_NOT_FOUND", "This product isn't available.")
    return image_urls[0] if image_urls else None


async def category_page(db: AsyncSession, store_id: uuid.UUID, slug: str) -> ShopCategoryPageOut:
    category = await db.scalar(
        select(Category).where(Category.store_id == store_id, Category.slug == slug.lower())
    )
    if category is None:
        raise NotFound("CATEGORY_NOT_FOUND", "This category doesn't exist.")
    return ShopCategoryPageOut(
        category=ShopCategoryRef(name=category.name, slug=category.slug),
        products=await list_products(db, store_id, category.id),
    )


def _variant_price(product: Product, price_override: Decimal | None) -> Decimal:
    return product.price if price_override is None else price_override


def _card(product: Product) -> ShopProductCard:
    if product.has_variants and product.variants:
        prices = [_variant_price(product, v.price_override) for v in product.variants]
        in_stock = any(v.stock_quantity > 0 for v in product.variants)
    else:
        prices = [product.price]
        in_stock = (product.stock_quantity or 0) > 0
    return ShopProductCard(
        id=product.id,
        name=product.name,
        slug=product.slug,
        image_url=product.image_urls[0] if product.image_urls else None,
        price_min=min(prices),
        price_max=max(prices),
        in_stock=in_stock,
        has_variants=product.has_variants,
        stock_quantity=None if product.has_variants else (product.stock_quantity or 0),
    )
