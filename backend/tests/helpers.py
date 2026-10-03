"""Test data straight into the database (bypassing the API)."""

import uuid
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
    client,
    slug,
    items,
    *,
    total,
    phone="012 345 678",
    name="Dara",
    payment_method="cod",
    delivery_method="seller_delivery",
    area=None,
    address="St 271, Phnom Penh",
):
    """items: (product_id, variant_id, quantity) tuples."""
    return await client.post(
        f"/api/v1/shop/{slug}/orders",
        json={
            "name": name,
            "phone": phone,
            "delivery_method": delivery_method,
            "delivery_area": area,
            "delivery_address": address,
            "items": [
                {"product_id": str(p), "variant_id": v and str(v), "quantity": q}
                for p, v, q in items
            ],
            "expected_total": total,
            "payment_method": payment_method,
        },
    )


# Payment settings that can be turned on as they are.
BANK = {
    "enabled": True,
    "bank_name": "ABA",
    "account_name": "SOK DARA",
    "account_number": "000 123 456",
}
KHQR = {"enabled": True, "bakong_account_id": "dara@aclb", "merchant_name": "SOK DARA"}


async def registered_seller(client, auth_headers):
    """A seller registered through the API: (headers, store_id, shop slug)."""
    headers = await auth_headers()
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    return headers, uuid.UUID(store["id"]), store["slug"]


async def set_payments(client, headers, **settings):
    """Save the seller's payment settings; parts left out get the defaults."""
    return await client.patch(
        "/api/v1/seller/store", headers=headers, json={"payment_settings": settings}
    )


async def track(client, slug, order_id, phone="012345678"):
    """The customer's order page."""
    return await client.get(f"/api/v1/shop/{slug}/orders/{order_id}?phone={phone}")


async def set_delivery(client, headers, **settings):
    """Save the seller's delivery settings; parts left out get the defaults."""
    return await client.patch(
        "/api/v1/seller/store", headers=headers, json={"delivery_settings": settings}
    )


async def set_discounts(client, headers, *rules):
    """rules: (min_subtotal, amount_off) pairs."""
    return await client.patch(
        "/api/v1/seller/store",
        headers=headers,
        json={
            "discount_settings": {"rules": [{"min_subtotal": m, "amount_off": a} for m, a in rules]}
        },
    )


# Dara's delivery: two areas, free from $30 or from 3 items.
AREAS = {
    "enabled": True,
    "areas": [{"name": "Phnom Penh", "fee": "1.50"}, {"name": "Provinces", "fee": "2.50"}],
    "free_from_amount": "30.00",
    "free_from_items": 3,
}
PICKUP = {"enabled": True, "address": "Shop 12, Orussey Market"}
