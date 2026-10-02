"""Placing an order from the public shop, and tracking it (guest checkout).

Money and stock are where a silent bug costs a seller directly, so these
check exact totals and stock levels, not just status codes.
"""

from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.api.shop import ORDER_RATE_LIMIT
from app.core.ratelimit import limiter
from app.db.session import unscoped_session
from app.models import Customer, Order, OrderConfirmationMode, Product, ProductVariant, Store
from app.services.checkout import line_total, order_totals
from app.services.phone import normalize_phone
from tests.helpers import add_product, shop_slug, stock, variant_ids


async def _place(client, slug, items, *, total, phone="012 345 678", name="Dara"):
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
        },
    )


async def _order_count(store_id) -> int:
    async with unscoped_session() as db:
        return await db.scalar(select(func.count(Order.id)).where(Order.store_id == store_id))


def test_line_and_order_totals_are_exact():
    # 3 x 0.10 is 0.30000000000000004 in floats; Decimal keeps it exact.
    assert line_total(Decimal("0.10"), 3) == Decimal("0.30")
    assert line_total(Decimal("12.50"), 2) == Decimal("25.00")
    assert order_totals([Decimal("0.30"), Decimal("25.00")], Decimal("1.50")) == (
        Decimal("25.30"),
        Decimal("26.80"),
    )
    # Riel prices are whole numbers.
    assert order_totals([line_total(Decimal("15000"), 3)], Decimal("0")) == (
        Decimal("45000.00"),
        Decimal("45000.00"),
    )


@pytest.mark.parametrize(
    "raw",
    ["012 345 678", "012-345-678", "(012) 345 678", "+855 12 345 678", "855 12345678",
     "+855 012 345 678", "00855 12 345 678"],
)  # fmt: skip
def test_cambodian_phone_numbers_are_stored_one_way(raw):
    assert normalize_phone(raw) == "012345678"


def test_other_phone_numbers():
    assert normalize_phone("010 234 5678") == "0102345678"  # 10-digit mobile
    assert normalize_phone("+66 81 234 5678") == "+66812345678"
    for bad in ("", "12345", "abc", "012 34", "+855", "0123456789012"):
        with pytest.raises(ValueError):
            normalize_phone(bad)


async def test_order_snapshots_prices_and_takes_stock(client, make_store):
    store = await make_store()
    slug = await shop_slug(store.store_id)
    cap = await add_product(store.store_id, "cap", stock=5)
    dress = await add_product(
        store.store_id, "dress", variants=[("S", None, 3), ("XL", Decimal("12.50"), 4)]
    )
    xl = (await variant_ids(dress))["XL"]

    response = await _place(client, slug, [(cap, None, 2), (dress, xl, 1)], total="32.50")

    assert response.status_code == 201, response.text
    order = response.json()
    assert order["number"] == 1001
    assert order["status"] == "pending"
    assert order["currency"] == "USD"
    assert (order["subtotal"], order["delivery_fee"], order["total"]) == ("32.50", "0.00", "32.50")
    assert [
        (i["product_name"], i["variant_name"], i["unit_price"], i["quantity"], i["line_total"])
        for i in order["items"]
    ] == [("Cap", None, "10.00", 2, "20.00"), ("Dress", "XL", "12.50", 1, "12.50")]
    assert await stock(Product, cap) == 3
    assert await stock(ProductVariant, xl) == 3


async def test_order_numbers_count_up_per_store(client, two_stores):
    a, b = two_stores
    a_cap = await add_product(a.store_id, "cap")
    b_cap = await add_product(b.store_id, "cap")
    a_slug, b_slug = await shop_slug(a.store_id), await shop_slug(b.store_id)

    numbers = [
        (await _place(client, a_slug, [(a_cap, None, 1)], total="10.00")).json()["number"],
        (await _place(client, a_slug, [(a_cap, None, 1)], total="10.00")).json()["number"],
        (await _place(client, b_slug, [(b_cap, None, 1)], total="10.00")).json()["number"],
    ]

    assert numbers == [1001, 1002, 1001]


async def test_the_same_item_twice_counts_against_stock_once(client, make_store):
    store = await make_store()
    cap = await add_product(store.store_id, "cap", stock=3)

    response = await _place(
        client, await shop_slug(store.store_id), [(cap, None, 2), (cap, None, 2)], total="40.00"
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PRODUCT_OUT_OF_STOCK"
    assert await stock(Product, cap) == 3


async def test_out_of_stock_refuses_the_whole_order(client, make_store):
    store = await make_store()
    cap = await add_product(store.store_id, "cap", stock=5)
    dress = await add_product(store.store_id, "dress", variants=[("XL", None, 1)])
    xl = (await variant_ids(dress))["XL"]

    response = await _place(
        client, await shop_slug(store.store_id), [(cap, None, 1), (dress, xl, 2)], total="30.00"
    )

    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "PRODUCT_OUT_OF_STOCK",
        "message": "Only 1 of Dress (XL) left.",
        "field": "items.1",
    }
    # Nothing was taken, not even for the line that was in stock.
    assert await stock(Product, cap) == 5
    assert await _order_count(store.store_id) == 0


async def test_changed_total_refuses_the_order(client, make_store):
    store = await make_store()
    cap = await add_product(store.store_id, "cap", stock=5)

    # The customer saw $9.00; the price is now $10.00.
    response = await _place(client, await shop_slug(store.store_id), [(cap, None, 1)], total="9")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORDER_TOTAL_CHANGED"
    assert await stock(Product, cap) == 5


async def test_unavailable_items_are_refused(client, two_stores):
    a, b = two_stores
    slug = await shop_slug(a.store_id)
    hidden = await add_product(a.store_id, "hidden", status="inactive")
    cap = await add_product(a.store_id, "cap")
    dress = await add_product(a.store_id, "dress", variants=[("S", None, 3)])
    other_dress = await add_product(a.store_id, "gown", variants=[("S", None, 3)])
    other_store = await add_product(b.store_id, "theirs")

    for item in (
        (hidden, None, 1),
        (other_store, None, 1),  # another shop's product, through this shop
        (dress, None, 1),  # has variants, none chosen
        (dress, (await variant_ids(other_dress))["S"], 1),  # another product's variant
        (cap, (await variant_ids(dress))["S"], 1),  # variant on a product without any
    ):
        response = await _place(client, slug, [item], total="10.00")
        assert response.status_code == 409, item
        assert response.json()["error"]["code"] == "PRODUCT_UNAVAILABLE"
        assert response.json()["error"]["field"] == "items.0"


async def test_same_phone_is_one_customer_with_their_latest_details(client, make_store):
    store = await make_store()
    slug = await shop_slug(store.store_id)
    cap = await add_product(store.store_id, "cap")

    await _place(client, slug, [(cap, None, 1)], total="10.00", phone="012 345 678")
    await _place(client, slug, [(cap, None, 1)], total="10.00", phone="+855 12-345-678", name="Sok")

    async with unscoped_session() as db:
        customers = (await db.scalars(select(Customer))).all()
    assert [(c.name, c.phone) for c in customers if c.store_id == store.store_id] == [
        ("Sok", "012345678")
    ]


async def test_automatic_confirmation_accepts_new_orders(client, make_store):
    store = await make_store()
    async with unscoped_session() as db:
        shop = await db.get(Store, store.store_id)
        shop.order_confirmation_mode = OrderConfirmationMode.AUTOMATIC
        await db.commit()
    cap = await add_product(store.store_id, "cap")

    response = await _place(client, await shop_slug(store.store_id), [(cap, None, 1)], total="10")

    assert response.json()["status"] == "accepted"


async def test_order_keeps_the_currency_it_was_placed_in(client, make_store):
    store = await make_store()
    slug = await shop_slug(store.store_id)
    cap = await add_product(store.store_id, "cap")
    order = (await _place(client, slug, [(cap, None, 1)], total="10.00")).json()

    async with unscoped_session() as db:
        (await db.get(Store, store.store_id)).currency = "KHR"
        await db.commit()
    tracked = await client.get(f"/api/v1/shop/{slug}/orders/{order['id']}?phone=012345678")

    assert tracked.json()["currency"] == "USD"


async def test_tracking_needs_the_phone_the_order_was_placed_with(client, two_stores):
    a, b = two_stores
    a_slug, b_slug = await shop_slug(a.store_id), await shop_slug(b.store_id)
    cap = await add_product(a.store_id, "cap")
    order = (await _place(client, a_slug, [(cap, None, 1)], total="10.00")).json()
    url = f"/api/v1/shop/{a_slug}/orders/{order['id']}"

    tracked = await client.get(url, params={"phone": "+855 12 345 678"})  # another spelling
    assert tracked.status_code == 200
    assert tracked.json() == order
    assert "customer" not in tracked.json()

    for wrong in (
        f"{url}?phone=098765432",
        f"{url}?phone=not-a-phone",
        f"/api/v1/shop/{b_slug}/orders/{order['id']}?phone=012345678",  # another shop
    ):
        response = await client.get(wrong)
        assert response.status_code == 404, wrong
        assert response.json()["error"]["code"] == "ORDER_NOT_FOUND"


async def test_placing_orders_has_its_own_stricter_rate_limit(client):
    allowed = int(ORDER_RATE_LIMIT.split("/")[0])
    limiter.enabled = True
    try:
        for _ in range(allowed):
            response = await client.post("/api/v1/shop/no-such-shop/orders", json={})
            assert response.status_code == 404
        response = await client.post("/api/v1/shop/no-such-shop/orders", json={})
        assert response.status_code == 429
        assert response.json()["error"]["code"] == "RATE_LIMITED"
        # Browsing is still allowed.
        assert (await client.get("/api/v1/shop/no-such-shop")).status_code == 404
    finally:
        limiter.enabled = False
        limiter.reset()
