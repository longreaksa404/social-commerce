"""The seller's customers: guest customers, one per phone per store
(02_TECHNICAL.md section 5.4), with what they've ordered.

Every query filters by store_id (layer 1) on a tenant session where RLS
enforces the same thing (layer 2).
"""

import uuid
from collections import defaultdict

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer, Order, OrderStatus
from app.schemas.customer import AmountOut, CustomerListOut, CustomerSummaryOut
from app.services.phone import phone_search_terms

# What a customer has spent leaves these out (decided 2026-10-03).
NOT_SPENT = (OrderStatus.REJECTED, OrderStatus.CANCELLED)


def _matches(search: str) -> ColumnElement[bool]:
    """Part of the name (any case), or part of the phone typed any way."""
    conditions = [Customer.name.icontains(search, autoescape=True)]
    conditions += [
        Customer.phone.contains(term, autoescape=True) for term in phone_search_terms(search)
    ]
    return or_(*conditions)


async def list_customers(
    db: AsyncSession,
    store_id: uuid.UUID,
    *,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> CustomerListOut:
    """Whoever ordered last first."""
    orders = (
        select(
            Order.customer_id,
            func.count().label("order_count"),
            func.max(Order.created_at).label("last_order_at"),
        )
        .where(Order.store_id == store_id)
        .group_by(Order.customer_id)
        .subquery()
    )
    filters = [Customer.store_id == store_id]
    if search and search.strip():
        filters.append(_matches(search.strip()))

    rows = (
        await db.execute(
            select(Customer, orders.c.order_count, orders.c.last_order_at)
            .outerjoin(orders, orders.c.customer_id == Customer.id)
            .where(*filters)
            .order_by(orders.c.last_order_at.desc().nulls_last(), Customer.id)
            .limit(limit + 1)  # one extra row tells whether there are more
            .offset(offset)
        )
    ).all()
    page = rows[:limit]
    spent = await _spent(db, store_id, [customer.id for customer, _, _ in page])
    total = await db.scalar(select(func.count()).select_from(Customer).where(*filters))
    return CustomerListOut(
        customers=[
            CustomerSummaryOut(
                id=customer.id,
                name=customer.name,
                phone=customer.phone,
                order_count=order_count or 0,
                last_order_at=last_order_at,
                spent=spent.get(customer.id, []),
            )
            for customer, order_count, last_order_at in page
        ],
        has_more=len(rows) > limit,
        total=total or 0,
    )


async def _spent(
    db: AsyncSession, store_id: uuid.UUID, customer_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[AmountOut]]:
    """Each customer's spending, per currency."""
    if not customer_ids:
        return {}
    rows = await db.execute(
        select(Order.customer_id, Order.currency, func.sum(Order.total))
        .where(
            Order.store_id == store_id,
            Order.customer_id.in_(customer_ids),
            Order.status.not_in(NOT_SPENT),
        )
        .group_by(Order.customer_id, Order.currency)
        .order_by(Order.currency)
    )
    spent: dict[uuid.UUID, list[AmountOut]] = defaultdict(list)
    for customer_id, currency, amount in rows:
        spent[customer_id].append(AmountOut(currency=currency, amount=amount))
    return spent
