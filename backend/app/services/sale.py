"""Sales on chosen products (founder's test list #21, 2026-10-24).

A sale takes a percentage or an amount off each of its products' prices,
every option of a product included, until the end of its last day in
Phnom Penh. A product in two sales gets the lower price; sales never add
up. Checkout, the shop and the seller's chat orders all price with
`best_price`, so the totals agree; the bill discounts (02 section 7,
pricing.discount_for) then count on the sale prices.

Every query filters by store_id (layer 1) on a tenant session where RLS
enforces the same thing (layer 2).
"""

import uuid
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.errors import AppError, NotFound
from app.models import Currency, Product, Sale
from app.schemas.sale import SaleIn, SaleOut

CENT = Decimal("0.01")
HUNDRED = Decimal(100)


def sale_price(price: Decimal, sale: Sale, currency: Currency) -> Decimal:
    """`price` in this sale: 20% off $12.50 is $10.00; riel rounds to the
    nearest 100 (KHQR can't take part of a riel), never below 0."""
    if sale.percent_off is not None:
        cut = price * (HUNDRED - sale.percent_off) / HUNDRED
        if currency is Currency.KHR:
            cut = (cut / HUNDRED).quantize(Decimal(1), ROUND_HALF_UP) * HUNDRED
        return cut.quantize(CENT, ROUND_HALF_UP)
    return max(Decimal(0), price - (sale.amount_off or Decimal(0))).quantize(CENT)


def best_price(
    price: Decimal, product_id: uuid.UUID, sales: list[Sale], currency: Currency
) -> Decimal:
    """The lowest of `price` and its sale prices; `price` when on no sale."""
    prices = [sale_price(price, s, currency) for s in sales if str(product_id) in s.product_ids]
    return min([price, *prices])


async def active_sales(db: AsyncSession, store_id: uuid.UUID) -> list[Sale]:
    """The shop's sales on today."""
    return list(
        await db.scalars(
            select(Sale).where(
                Sale.store_id == store_id,
                or_(Sale.ends_on.is_(None), Sale.ends_on >= clock.today()),
            )
        )
    )


def sale_out(sale: Sale) -> SaleOut:
    return SaleOut.model_validate(
        {
            **{f: getattr(sale, f) for f in ("id", "name", "percent_off", "amount_off")},
            "product_ids": sale.product_ids,
            "ends_on": sale.ends_on,
            "created_at": sale.created_at,
            "active": sale.ends_on is None or sale.ends_on >= clock.today(),
        }
    )


async def list_sales(db: AsyncSession, store_id: uuid.UUID) -> list[SaleOut]:
    """Newest first; ended ones too, until removed."""
    sales = await db.scalars(
        select(Sale).where(Sale.store_id == store_id).order_by(Sale.created_at.desc())
    )
    return [sale_out(s) for s in sales]


async def _checked_products(db: AsyncSession, store_id: uuid.UUID, data: SaleIn) -> list[str]:
    """Only this shop's products (a sale can't name another's)."""
    wanted = list(dict.fromkeys(data.product_ids))
    found = set(
        await db.scalars(
            select(Product.id).where(Product.store_id == store_id, Product.id.in_(wanted))
        )
    )
    if len(found) != len(wanted):
        raise AppError(422, "VALIDATION_ERROR", "Choose products from your shop.", "product_ids")
    if data.ends_on is not None and data.ends_on < clock.today():
        raise AppError(422, "VALIDATION_ERROR", "Choose today or a day after.", "ends_on")
    return [str(product_id) for product_id in wanted]


async def _get(db: AsyncSession, store_id: uuid.UUID, sale_id: uuid.UUID) -> Sale:
    sale = await db.scalar(select(Sale).where(Sale.id == sale_id, Sale.store_id == store_id))
    if sale is None:
        raise NotFound("SALE_NOT_FOUND", "Sale not found.")
    return sale


async def create_sale(db: AsyncSession, store_id: uuid.UUID, data: SaleIn) -> SaleOut:
    sale = Sale(
        store_id=store_id,
        name=data.name or None,
        percent_off=data.percent_off,
        amount_off=data.amount_off,
        product_ids=await _checked_products(db, store_id, data),
        ends_on=data.ends_on,
    )
    db.add(sale)
    await db.commit()
    await db.refresh(sale)
    return sale_out(sale)


async def update_sale(
    db: AsyncSession, store_id: uuid.UUID, sale_id: uuid.UUID, data: SaleIn
) -> SaleOut:
    sale = await _get(db, store_id, sale_id)
    sale.product_ids = await _checked_products(db, store_id, data)
    sale.name = data.name or None
    sale.percent_off = data.percent_off
    sale.amount_off = data.amount_off
    sale.ends_on = data.ends_on
    await db.commit()
    await db.refresh(sale)
    return sale_out(sale)


async def delete_sale(db: AsyncSession, store_id: uuid.UUID, sale_id: uuid.UUID) -> None:
    await db.delete(await _get(db, store_id, sale_id))
    await db.commit()
