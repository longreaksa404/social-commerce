"""Test data straight into the database (bypassing the API)."""

from decimal import Decimal

from sqlalchemy import select

from app.db.session import unscoped_session
from app.models import Category, Product, ProductStatus, ProductVariant, Store


async def shop_slug(store_id) -> str:
    async with unscoped_session() as db:
        return (await db.get(Store, store_id)).slug


async def add_category(store_id, slug="tops"):
    async with unscoped_session() as db:
        category = Category(store_id=store_id, name=slug.title(), slug=slug)
        db.add(category)
        await db.commit()
        return category.id


async def add_product(store_id, slug, *, category_id=None, status="active", stock=3, variants=()):
    """variants: (name, price_override, stock) tuples."""
    async with unscoped_session() as db:
        product = Product(
            store_id=store_id,
            category_id=category_id,
            name=slug.title(),
            slug=slug,
            price=Decimal("10.00"),
            status=ProductStatus(status),
            has_variants=bool(variants),
            stock_quantity=None if variants else stock,
            variants=[
                ProductVariant(
                    store_id=store_id,
                    name=name,
                    sku=f"SKU-{name}",
                    price_override=price,
                    stock_quantity=qty,
                )
                for name, price, qty in variants
            ],
        )
        db.add(product)
        await db.commit()
        return product.id


async def variant_ids(product_id) -> dict[str, object]:
    """{variant name: id} for a product."""
    async with unscoped_session() as db:
        rows = await db.execute(
            select(ProductVariant.name, ProductVariant.id).where(
                ProductVariant.product_id == product_id
            )
        )
        return dict(rows.all())


async def stock(model, row_id) -> int | None:
    """Current stock_quantity of a Product or ProductVariant row."""
    async with unscoped_session() as db:
        return await db.scalar(select(model.stock_quantity).where(model.id == row_id))


async def place_order(
    client, slug, items, *, total, phone="012 345 678", name="Dara", payment_method="cod"
):
    """items: (product_id, variant_id, quantity) tuples."""
    return await client.post(
        f"/api/v1/shop/{slug}/orders",
        json={
            "name": name,
            "phone": phone,
            "delivery_address": "St 271, Phnom Penh",
            "items": [
                {"product_id": str(p), "variant_id": v and str(v), "quantity": q}
                for p, v, q in items
            ],
            "expected_total": total,
            "payment_method": payment_method,
        },
    )
