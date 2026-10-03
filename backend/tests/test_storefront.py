"""Public storefront (/api/v1/shop/{store_slug}/...): a shop shows only its
own active products, and nothing private."""

from decimal import Decimal

from sqlalchemy import text, update

from app.api.deps import get_shop, get_shop_db
from app.api.shop import SHOP_RATE_LIMIT
from app.core.ratelimit import limiter
from app.db.session import unscoped_session
from app.models import Seller
from tests.helpers import add_category, add_product, shop_slug


async def test_store_page_shows_only_categories_with_active_products(client, make_store):
    store = await make_store()
    tops = await add_category(store.store_id, "tops")
    await add_category(store.store_id, "empty")
    hidden = await add_category(store.store_id, "hidden")
    await add_product(store.store_id, "shirt", category_id=tops)
    await add_product(store.store_id, "tee", category_id=tops)
    await add_product(store.store_id, "old", category_id=hidden, status="inactive")

    response = await client.get(f"/api/v1/shop/{await shop_slug(store.store_id)}")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "name",
        "slug",
        "description",
        "logo_url",
        "currency",
        "categories",
        "payment_methods",  # names only; bank details come with an order
        "delivery",
        "discounts",
    }
    assert body["currency"] == "USD"
    assert body["payment_methods"] == ["cod"]  # a new shop takes cash on delivery
    # ... and delivers for free, with no areas to choose from.
    assert body["delivery"] == {
        "seller_delivery": {"areas": [], "free_from_amount": None, "free_from_items": None},
        "pickup": None,
    }
    assert body["discounts"] == []
    assert body["categories"] == [{"name": "Tops", "slug": "tops", "product_count": 2}]


async def test_products_are_this_stores_active_products_only(client, two_stores):
    a, b = two_stores
    await add_product(a.store_id, "shirt", stock=0)
    await add_product(a.store_id, "old", status="inactive")
    await add_product(b.store_id, "other")

    response = await client.get(f"/api/v1/shop/{await shop_slug(a.store_id)}/products")

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": response.json()[0]["id"],
            "name": "Shirt",
            "slug": "shirt",
            "image_url": None,
            "price_min": "10.00",
            "price_max": "10.00",
            "in_stock": False,
        }
    ]


async def test_product_card_price_range_and_stock_come_from_variants(client, make_store):
    store = await make_store()
    await add_product(
        store.store_id, "dress", variants=[("S", None, 0), ("XL", Decimal("12.50"), 1)]
    )

    response = await client.get(f"/api/v1/shop/{await shop_slug(store.store_id)}/products")

    [card] = response.json()
    assert (card["price_min"], card["price_max"], card["in_stock"]) == ("10.00", "12.50", True)


async def test_product_page_shows_effective_variant_prices_and_no_skus(client, make_store):
    store = await make_store()
    tops = await add_category(store.store_id, "tops")
    await add_product(
        store.store_id,
        "dress",
        category_id=tops,
        variants=[("S", None, 0), ("XL", Decimal("12.50"), 4)],
    )

    response = await client.get(f"/api/v1/shop/{await shop_slug(store.store_id)}/products/dress")

    assert response.status_code == 200
    body = response.json()
    assert body["category"] == {"name": "Tops", "slug": "tops"}
    assert body["stock_quantity"] is None
    assert [(v["name"], v["price"], v["stock_quantity"]) for v in body["variants"]] == [
        ("S", "10.00", 0),
        ("XL", "12.50", 4),
    ]
    assert "sku" not in body["variants"][0]
    assert "status" not in body


async def test_product_page_is_not_found_when_inactive_or_in_another_store(client, two_stores):
    a, b = two_stores
    await add_product(a.store_id, "shirt")
    await add_product(a.store_id, "old", status="inactive")
    await add_product(b.store_id, "other")
    a_shop = f"/api/v1/shop/{await shop_slug(a.store_id)}"

    for slug in ("old", "other", "missing"):
        response = await client.get(f"{a_shop}/products/{slug}")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "PRODUCT_NOT_FOUND"


async def test_same_product_slug_in_two_stores_shows_each_stores_own(client, two_stores):
    a, b = two_stores
    await add_product(a.store_id, "shirt", stock=1)
    await add_product(b.store_id, "shirt", stock=7)

    a_shirt = await client.get(f"/api/v1/shop/{await shop_slug(a.store_id)}/products/shirt")
    b_shirt = await client.get(f"/api/v1/shop/{await shop_slug(b.store_id)}/products/shirt")

    assert a_shirt.json()["stock_quantity"] == 1
    assert b_shirt.json()["stock_quantity"] == 7


async def test_category_page_lists_its_active_products(client, two_stores):
    a, b = two_stores
    tops = await add_category(a.store_id, "tops")
    await add_category(b.store_id, "shoes")
    await add_product(a.store_id, "shirt", category_id=tops)
    await add_product(a.store_id, "old", category_id=tops, status="inactive")
    await add_product(a.store_id, "hat")
    a_shop = f"/api/v1/shop/{await shop_slug(a.store_id)}"

    response = await client.get(f"{a_shop}/categories/tops")

    assert response.status_code == 200
    assert response.json()["category"] == {"name": "Tops", "slug": "tops"}
    assert [p["slug"] for p in response.json()["products"]] == ["shirt"]
    # Store B's category is not reachable through store A's shop.
    response = await client.get(f"{a_shop}/categories/shoes")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "CATEGORY_NOT_FOUND"


async def test_unknown_or_deactivated_shop_is_not_found(client, make_store):
    store = await make_store()
    slug = await shop_slug(store.store_id)
    async with unscoped_session() as db:
        await db.execute(update(Seller).where(Seller.id == store.seller_id).values(is_active=False))
        await db.commit()

    for path in (
        "/api/v1/shop/no-such-shop",
        f"/api/v1/shop/{slug}",
        f"/api/v1/shop/{slug}/products",
    ):
        response = await client.get(path)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "STORE_NOT_FOUND"


async def test_shop_catalog_queries_run_under_rls(make_store):
    store = await make_store()
    shop = await get_shop(await shop_slug(store.store_id))

    async for db in get_shop_db(shop):
        assert await db.scalar(text("SELECT current_user")) == "app_user"
        tenant = await db.scalar(text("SELECT current_setting('app.tenant_id')"))
        assert tenant == str(store.store_id)


async def test_rate_limit_counts_requests_for_shops_that_do_not_exist(client):
    """Slug guessing is limited too: the limit runs before the shop lookup."""
    allowed = int(SHOP_RATE_LIMIT.split("/")[0])
    limiter.enabled = True
    try:
        for _ in range(allowed):
            assert (await client.get("/api/v1/shop/no-such-shop")).status_code == 404
        response = await client.get("/api/v1/shop/another-guess/products")
        assert response.status_code == 429
        assert response.json()["error"]["code"] == "RATE_LIMITED"
    finally:
        limiter.enabled = False
        limiter.reset()
