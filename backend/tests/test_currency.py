"""Switching a shop's currency converts its amounts (founder's test list
#15, 2026-10-24): $1 = 4,100៛, riel to the nearest 100, dollars to the
cent."""

from decimal import Decimal

import pytest
from sqlalchemy import select

from app.db.session import unscoped_session
from app.models import Currency, Product, ProductVariant
from app.services.currency import convert
from tests.helpers import add_product, registered_seller, set_delivery, set_discounts

STORE = "/api/v1/seller/store"


@pytest.mark.parametrize(
    ("amount", "to", "converted"),
    [
        ("1.00", Currency.KHR, "4100"),
        ("12.50", Currency.KHR, "51300"),  # 51,250 rounds up to 51,300
        ("12.49", Currency.KHR, "51200"),  # 51,209
        ("0.99", Currency.KHR, "4100"),  # 4,059
        ("0.00", Currency.KHR, "0"),
        ("51300", Currency.USD, "12.51"),
        ("4100", Currency.USD, "1.00"),
        ("10000", Currency.USD, "2.44"),  # 2.439
        ("5000", Currency.USD, "1.22"),
        ("0", Currency.USD, "0.00"),
    ],
)
def test_convert_rounds_riel_to_100_and_dollars_to_the_cent(amount, to, converted):
    assert convert(Decimal(amount), to) == Decimal(converted)


async def _prices(product_id) -> tuple[Decimal, list[Decimal | None]]:
    async with unscoped_session() as db:
        product = await db.get(Product, product_id)
        overrides = list(
            await db.scalars(
                select(ProductVariant.price_override)
                .where(ProductVariant.product_id == product_id)
                .order_by(ProductVariant.name)
            )
        )
        return product.price, overrides


async def test_switching_converts_prices_fees_and_discounts_of_this_shop_only(client, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    _, other_store_id, _ = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt")  # $10.00
    dress = await add_product(
        store_id, "dress", variants=[("L", Decimal("12.50"), 1), ("M", None, 1)]
    )
    others = await add_product(other_store_id, "hat")
    await set_delivery(client, headers, fee="1.50", free_from_amount="30.00")
    await set_discounts(client, headers, ("50.00", "5.00"))

    riel = await client.patch(STORE, headers=headers, json={"currency": "KHR"})

    assert riel.status_code == 200, riel.text
    body = riel.json()
    assert body["currency"] == "KHR"
    assert body["khr_per_usd"] == 4100
    assert (body["delivery_settings"]["fee"], body["delivery_settings"]["free_from_amount"]) == (
        "6200.00",  # 6,150 rounds up
        "123000.00",
    )
    assert body["discount_settings"]["rules"] == [
        {"min_subtotal": "205000.00", "amount_off": "20500.00"}
    ]
    assert await _prices(shirt) == (Decimal("41000.00"), [])
    assert await _prices(dress) == (Decimal("41000.00"), [Decimal("51300.00"), None])
    # Another shop's product is left alone.
    assert await _prices(others) == (Decimal("10.00"), [])

    back = await client.patch(STORE, headers=headers, json={"currency": "USD"})
    assert back.json()["delivery_settings"]["fee"] == "1.51"
    assert await _prices(dress) == (Decimal("10.00"), [Decimal("12.51"), None])


async def test_saving_the_same_currency_changes_nothing(client, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt")

    await client.patch(STORE, headers=headers, json={"currency": "USD", "name": "Same"})

    assert await _prices(shirt) == (Decimal("10.00"), [])
