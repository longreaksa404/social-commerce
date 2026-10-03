"""What an order costs (app/services/pricing.py): bill discounts and
delivery fees. Exact decimals throughout; the storefront repeats this
math, so these cases are the contract for both."""

from decimal import Decimal as D

import pytest

from app.models import DeliveryMethod
from app.schemas.delivery import DeliveryArea, DeliverySettings, DiscountRule, DiscountSettings
from app.services.pricing import Totals, discount_for, order_totals

PHNOM_PENH = DeliveryArea(name="Phnom Penh", fee=D("1.50"))
DELIVERY = DeliverySettings.model_validate(
    {"seller_delivery": {"areas": [PHNOM_PENH.model_dump()]}}
)
FREE_FROM_30_OR_3 = DeliverySettings.model_validate(
    {
        "seller_delivery": {
            "areas": [PHNOM_PENH.model_dump()],
            "free_from_amount": "30",
            "free_from_items": 3,
        }
    }
)
NO_DISCOUNTS = DiscountSettings()
# $5 off from $40, $12 off from $80.
DISCOUNTS = DiscountSettings(
    rules=[
        DiscountRule(min_subtotal=D("40"), amount_off=D("5")),
        DiscountRule(min_subtotal=D("80"), amount_off=D("12")),
    ]
)


def _totals(
    lines,
    *,
    items=1,
    method=DeliveryMethod.SELLER_DELIVERY,
    area=PHNOM_PENH,
    delivery=DELIVERY,
    discounts=NO_DISCOUNTS,
):
    return order_totals(
        [D(x) for x in lines],
        item_count=items,
        method=method,
        area=area,
        delivery=delivery,
        discounts=discounts,
    )


def test_delivery_fee_is_added_exactly():
    assert _totals(["0.30", "25.00"], items=2) == Totals(D("25.30"), D("0"), D("1.50"), D("26.80"))


def test_shop_without_areas_delivers_for_free():
    assert _totals(["12.00"], area=None, delivery=DeliverySettings()) == Totals(
        D("12.00"), D("0"), D("0"), D("12.00")
    )


def test_pickup_is_free():
    totals = _totals(["12.00"], method=DeliveryMethod.PICKUP, area=None)
    assert (totals.delivery_fee, totals.total) == (D("0"), D("12.00"))


@pytest.mark.parametrize(
    ("subtotal", "items", "fee"),
    [
        ("29.99", 1, "1.50"),  # just under $30, one item
        ("30.00", 1, "0"),  # exactly $30: free
        ("12.00", 2, "1.50"),
        ("12.00", 3, "0"),  # three items: free, whatever they cost
    ],
)
def test_free_delivery_from_an_amount_or_a_number_of_items(subtotal, items, fee):
    totals = _totals([subtotal], items=items, delivery=FREE_FROM_30_OR_3)
    assert totals.delivery_fee == D(fee)
    assert totals.total == D(subtotal) + D(fee)


@pytest.mark.parametrize(
    ("subtotal", "discount"),
    [
        ("39.99", "0"),
        ("40.00", "5.00"),  # exactly the threshold
        ("79.99", "5.00"),
        ("80.00", "12.00"),  # the biggest one it reaches; they don't add up
        ("500.00", "12.00"),
    ],
)
def test_the_biggest_discount_reached_applies(subtotal, discount):
    assert discount_for(D(subtotal), DISCOUNTS) == D(discount)


def test_discount_comes_off_the_items_and_the_fee_is_added_after():
    assert _totals(["45.00"], discounts=DISCOUNTS) == Totals(
        D("45.00"), D("5.00"), D("1.50"), D("41.50")
    )


def test_free_delivery_looks_at_the_items_before_the_discount():
    # $32 of items, $5 off (from $30) = $27, but delivery stays free from $30.
    discounts = DiscountSettings(rules=[DiscountRule(min_subtotal=D("30"), amount_off=D("5"))])
    totals = _totals(["32.00"], delivery=FREE_FROM_30_OR_3, discounts=discounts)
    assert totals == Totals(D("32.00"), D("5.00"), D("0"), D("27.00"))


def test_a_discount_never_takes_the_total_below_the_delivery_fee():
    whole_bill = DiscountSettings(rules=[DiscountRule(min_subtotal=D("10"), amount_off=D("10"))])
    assert _totals(["10.00"], discounts=whole_bill).total == D("1.50")
    assert discount_for(D("10.00"), whole_bill) == D("10.00")


def test_riel_totals_stay_whole():
    area = DeliveryArea(name="Phnom Penh", fee=D("6000"))
    discounts = DiscountSettings(
        rules=[DiscountRule(min_subtotal=D("100000"), amount_off=D("10000"))]
    )
    totals = _totals(["120000"], area=area, discounts=discounts)
    assert totals == Totals(D("120000"), D("10000"), D("6000"), D("116000"))
