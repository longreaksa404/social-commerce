"""A shop switching between dollars and riel (founder's test list #15,
2026-10-24: "convert currency not just switch the sign"). Its product and
option prices, its delivery fee and free-delivery amount, its discounts
and its sales' amounts off are converted at the riel rate set in the admin
(services/platform.py; the KHR_PER_USD variable until then); riel rounds
to the nearest 100, dollars to the cent. Orders already placed keep their
own currency and amounts.
"""

from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Currency, Product, ProductVariant, Sale, Store
from app.services import platform
from app.services.delivery import follow_currency

CENT = Decimal("0.01")
HUNDRED = Decimal(100)


def convert(amount: Decimal, to: Currency, khr_per_usd: int) -> Decimal:
    """`amount` in the other currency, in `to`: $12.50 → 51,300៛ at 4,100
    (51,250 rounded to the nearest 100), 51,300៛ → $12.51."""
    rate = Decimal(khr_per_usd)
    if to is Currency.KHR:
        return ((amount * rate) / HUNDRED).quantize(Decimal(1), ROUND_HALF_UP) * HUNDRED
    return (amount / rate).quantize(CENT, ROUND_HALF_UP)


def _money(value: str | None, to: Currency, rate: int) -> str | None:
    """A JSON settings amount ("12.50"), converted; None stays None."""
    return None if value is None else str(convert(Decimal(value), to, rate).quantize(CENT))


async def switch(db: AsyncSession, store: Store) -> None:
    """Convert the shop's amounts into `store.currency`, just set. The
    caller commits."""
    to = store.currency
    rate = (await platform.load(db)).khr_per_usd
    for product in await db.scalars(select(Product).where(Product.store_id == store.id)):
        product.price = convert(product.price, to, rate)
    for variant in await db.scalars(
        select(ProductVariant).where(
            ProductVariant.store_id == store.id, ProductVariant.price_override.is_not(None)
        )
    ):
        variant.price_override = convert(variant.price_override, to, rate)
    # A sale's amount off too (a percentage needs nothing), never to 0.
    smallest = HUNDRED if to is Currency.KHR else CENT
    for sale in await db.scalars(
        select(Sale).where(Sale.store_id == store.id, Sale.amount_off.is_not(None))
    ):
        sale.amount_off = max(convert(sale.amount_off, to, rate), smallest)

    if store.delivery_set_up:
        delivery = dict(store.delivery_config)
        for field in ("fee", "free_from_amount"):
            if field in delivery:
                delivery[field] = _money(delivery[field], to, rate)
        store.delivery_config = delivery
    else:
        # Not saved yet: the new currency's starting fee, as before.
        follow_currency(store)

    rules = store.discount_config.get("rules", [])
    if rules:
        store.discount_config = {
            **store.discount_config,
            "rules": [
                {
                    **rule,
                    "min_subtotal": _money(rule["min_subtotal"], to, rate),
                    "amount_off": _money(rule["amount_off"], to, rate),
                }
                for rule in rules
            ],
        }
