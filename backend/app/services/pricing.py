"""What an order costs: items, the shop's bill discount, and its delivery
fee. The storefront repeats this math to show the total before ordering
(frontend/src/lib/pricing.ts); checkout refuses the order if the two
disagree, so a change here must be made there too.

total = subtotal - discount + delivery_fee, all exact decimals.
"""

from dataclasses import dataclass
from decimal import Decimal

from app.models import DeliveryMethod
from app.schemas.delivery import DeliverySettings, DiscountSettings

CENT = Decimal("0.01")
ZERO = Decimal("0.00")


def line_total(unit_price: Decimal, quantity: int) -> Decimal:
    return (unit_price * quantity).quantize(CENT)


def discount_for(subtotal: Decimal, discounts: DiscountSettings) -> Decimal:
    """The biggest discount the subtotal reaches (they never add up), and
    never more than the subtotal itself."""
    best = max(
        (rule.amount_off for rule in discounts.rules if subtotal >= rule.min_subtotal),
        default=ZERO,
    )
    return min(best, subtotal)


def delivery_fee_for(
    method: DeliveryMethod, *, subtotal: Decimal, item_count: int, delivery: DeliverySettings
) -> Decimal:
    """The shop's one delivery fee, wherever the customer is and whoever
    delivers (decided 2026-10-03). Pickup is free, and so is delivery
    when the items come to enough (before any discount) or there are
    enough of them (units)."""
    if method is DeliveryMethod.PICKUP:
        return ZERO
    if delivery.free_from_amount is not None and subtotal >= delivery.free_from_amount:
        return ZERO
    if delivery.free_from_items is not None and item_count >= delivery.free_from_items:
        return ZERO
    return delivery.fee


@dataclass(frozen=True)
class Totals:
    subtotal: Decimal
    discount: Decimal
    delivery_fee: Decimal
    total: Decimal


def order_totals(
    line_totals: list[Decimal],
    *,
    item_count: int,
    method: DeliveryMethod,
    delivery: DeliverySettings,
    discounts: DiscountSettings,
) -> Totals:
    subtotal = sum(line_totals, ZERO)
    discount = discount_for(subtotal, discounts)
    fee = delivery_fee_for(method, subtotal=subtotal, item_count=item_count, delivery=delivery)
    return Totals(subtotal, discount, fee, subtotal - discount + fee)
