"""Sales on chosen products (founder's test list #21, 2026-10-24): a
percentage or an amount off, the lower price when two apply, until a last
day; checkout, the shop and the seller's list agree."""

import uuid
from datetime import timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select, update

from app.core import clock
from app.db.session import tenant_session, unscoped_session
from app.models import Currency, Sale
from app.services.sale import best_price, sale_price
from tests.helpers import (
    add_product,
    place_order,
    registered_seller,
    set_discounts,
)

SALES = "/api/v1/seller/sales"


@pytest.mark.parametrize(
    ("price", "percent", "amount", "currency", "expected"),
    [
        ("12.50", 20, None, Currency.USD, "10.00"),
        ("9.99", 15, None, Currency.USD, "8.49"),  # 8.4915
        ("41000", 15, None, Currency.KHR, "34900"),  # 34,850 to the nearest 100
        ("10.00", None, "3.00", Currency.USD, "7.00"),
        ("2.00", None, "3.00", Currency.USD, "0.00"),  # never below 0
    ],
)
def test_sale_price(price, percent, amount, currency, expected):
    sale = Sale(percent_off=percent, amount_off=amount and Decimal(amount))
    assert sale_price(Decimal(price), sale, currency) == Decimal(expected)


def test_the_lower_price_wins_and_sales_never_add_up():
    product = uuid.uuid4()
    sales = [
        Sale(percent_off=10, product_ids=[str(product)]),
        Sale(amount_off=Decimal("3.00"), product_ids=[str(product)]),
        Sale(percent_off=50, product_ids=[str(uuid.uuid4())]),  # another product's
    ]
    assert best_price(Decimal("10.00"), product, sales, Currency.USD) == Decimal("7.00")
    assert best_price(Decimal("10.00"), uuid.uuid4(), sales, Currency.USD) == Decimal("10.00")


async def _sale(client, headers, product_ids, **fields):
    body = {"product_ids": [str(p) for p in product_ids], **fields}
    return await client.post(SALES, headers=headers, json=body)


async def test_checkout_and_the_shop_price_with_the_sale(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt", stock=10)  # $10.00
    dress = await add_product(store_id, "dress", variants=[("S", None, 5), ("XL", "12.50", 5)])
    await add_product(store_id, "hat", stock=10)  # on no sale
    made = await _sale(client, headers, [shirt, dress], name="11.11", percent_off=20)
    assert made.status_code == 201, made.text
    assert made.json()["active"] is True

    cards = {c["slug"]: c for c in (await client.get(f"/api/v1/shop/{slug}/products")).json()}
    assert (cards["shirt"]["price_min"], cards["shirt"]["was_price_min"]) == ("8.00", "10.00")
    assert (cards["dress"]["price_min"], cards["dress"]["price_max"]) == ("8.00", "10.00")
    assert cards["hat"]["was_price_min"] is None
    page = (await client.get(f"/api/v1/shop/{slug}/products/dress")).json()
    assert (page["price"], page["was_price"]) == ("8.00", "10.00")
    assert [(v["price"], v["was_price"]) for v in page["variants"]] == [
        ("8.00", "10.00"),
        ("10.00", "12.50"),
    ]
    listed = {
        p["slug"]: p for p in (await client.get("/api/v1/seller/products", headers=headers)).json()
    }
    assert (listed["shirt"]["sale_price"], listed["hat"]["sale_price"]) == ("8.00", None)

    # The full price is refused; the sale's goes through, at the sale price.
    stale = await place_order(client, slug, [(shirt, None, 2)], total="20.00")
    assert stale.json()["error"]["code"] == "ORDER_TOTAL_CHANGED"
    placed = await place_order(client, slug, [(shirt, None, 2)], total="16.00")
    assert placed.status_code == 201, placed.text
    assert placed.json()["items"][0]["unit_price"] == "8.00"


async def test_bill_discounts_count_on_the_sale_prices(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt", stock=10)
    await set_discounts(client, headers, ("40.00", "5.00"))
    await _sale(client, headers, [shirt], percent_off=20)

    # 5 × $8.00 = $40.00 reaches the $40 rule: $35.00.
    placed = await place_order(client, slug, [(shirt, None, 5)], total="35.00")

    assert placed.status_code == 201, placed.text


async def test_an_ended_sale_no_longer_applies(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt", stock=10)
    sale_id = (await _sale(client, headers, [shirt], amount_off="2.00")).json()["id"]
    async with unscoped_session() as db:
        await db.execute(
            update(Sale)
            .where(Sale.id == uuid.UUID(sale_id))
            .values(ends_on=clock.today() - timedelta(days=1))
        )
        await db.commit()

    [card] = (await client.get(f"/api/v1/shop/{slug}/products")).json()
    assert (card["price_min"], card["was_price_min"]) == ("10.00", None)
    [listed] = (await client.get(SALES, headers=headers)).json()
    assert listed["active"] is False


async def test_a_sale_is_one_kind_and_from_today(client, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt")

    both = await _sale(client, headers, [shirt], percent_off=10, amount_off="1.00")
    neither = await _sale(client, headers, [shirt])
    past = await _sale(
        client, headers, [shirt], percent_off=10, ends_on=str(clock.today() - timedelta(days=1))
    )
    none = await _sale(client, headers, [], percent_off=10)

    assert [r.status_code for r in (both, neither, past, none)] == [422, 422, 422, 422]
    assert past.json()["error"]["field"] == "ends_on"


async def test_a_shop_sees_and_changes_only_its_own_sales(client, auth_headers):
    """Tenant isolation: another shop's products can't go in a sale, and
    another shop's sale can't be seen, changed or removed."""
    a, a_store, _ = await registered_seller(client, auth_headers)
    b, b_store, b_slug = await registered_seller(client, auth_headers)
    a_shirt = await add_product(a_store, "shirt")
    b_hat = await add_product(b_store, "hat")

    theirs = await _sale(client, a, [a_shirt, b_hat], percent_off=50)
    assert theirs.status_code == 422
    assert theirs.json()["error"]["field"] == "product_ids"

    sale_id = (await _sale(client, a, [a_shirt], percent_off=50)).json()["id"]
    assert (await client.get(SALES, headers=b)).json() == []
    body = {"product_ids": [str(b_hat)], "percent_off": 90}
    assert (await client.put(f"{SALES}/{sale_id}", headers=b, json=body)).status_code == 404
    assert (await client.delete(f"{SALES}/{sale_id}", headers=b)).status_code == 404
    # B's shop isn't on sale.
    [card] = (await client.get(f"/api/v1/shop/{b_slug}/products")).json()
    assert card["was_price_min"] is None

    edited = await client.put(
        f"{SALES}/{sale_id}", headers=a, json={"product_ids": [str(a_shirt)], "amount_off": "1.00"}
    )
    assert (edited.json()["percent_off"], edited.json()["amount_off"]) == (None, "1.00")
    assert (await client.delete(f"{SALES}/{sale_id}", headers=a)).status_code == 204
    assert (await client.get(SALES, headers=a)).json() == []


async def test_switching_currency_converts_a_sales_amount_off(client, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt")
    await _sale(client, headers, [shirt], amount_off="2.00")
    await _sale(client, headers, [shirt], percent_off=10)

    await client.patch("/api/v1/seller/store", headers=headers, json={"currency": "KHR"})

    sales = (await client.get(SALES, headers=headers)).json()
    assert sorted((s["percent_off"], s["amount_off"]) for s in sales if s["amount_off"]) == [
        (None, "8200.00")
    ]
    assert any(s["percent_off"] == 10 for s in sales)


async def test_rls_keeps_sales_apart(client, auth_headers):
    a, a_store, _ = await registered_seller(client, auth_headers)
    b, b_store, _ = await registered_seller(client, auth_headers)
    for headers, store_id in ((a, a_store), (b, b_store)):
        shirt = await add_product(store_id, "shirt")
        assert (await _sale(client, headers, [shirt], percent_off=10)).status_code == 201

    # Straight to the database, without the service layer's filters.
    async with tenant_session(a_store) as db:
        assert (await db.scalars(select(Sale.store_id))).all() == [a_store]
