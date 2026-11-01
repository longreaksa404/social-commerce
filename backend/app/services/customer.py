"""The seller's customers: guest customers, one per phone per store
(02_TECHNICAL.md section 5.4), with what they've ordered.

Every query filters by store_id (layer 1) on a tenant session where RLS
enforces the same thing (layer 2).
"""

import uuid
from collections import defaultdict

from sqlalchemy import ColumnElement, func, or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFound
from app.models import Customer, Order, OrderStatus
from app.schemas.customer import (
    AmountOut,
    CustomerDetailOut,
    CustomerListOut,
    CustomerSummaryOut,
)
from app.services import order as order_service
from app.services.phone import phone_search_terms

# What a customer has spent leaves these out (decided 2026-10-03).
NOT_SPENT = (OrderStatus.REJECTED, OrderStatus.CANCELLED)
# A customer's page lists this many of their orders at most, newest first;
# the rest are still in the Orders tab.
MAX_HISTORY = 100


# A forgotten customer's name (the Data deletion page).
REMOVED = "(removed)"


def matches(search: str) -> ColumnElement[bool]:
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
        filters.append(matches(search.strip()))

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
                photo_url=customer.photo_url,
                order_count=order_count or 0,
                last_order_at=last_order_at,
                spent=spent.get(customer.id, []),
            )
            for customer, order_count, last_order_at in page
        ],
        has_more=len(rows) > limit,
        total=total or 0,
    )


async def get_customer(
    db: AsyncSession, store_id: uuid.UUID, customer_id: uuid.UUID
) -> CustomerDetailOut:
    customer = await db.scalar(
        select(Customer).where(Customer.id == customer_id, Customer.store_id == store_id)
    )
    if customer is None:
        raise NotFound("CUSTOMER_NOT_FOUND", "Customer not found.")
    of_customer = (Order.store_id == store_id, Order.customer_id == customer.id)
    orders = await db.scalars(
        select(Order)
        .where(*of_customer)
        .options(*order_service.SUMMARY_LOADS)
        .order_by(Order.number.desc())
        .limit(MAX_HISTORY)
    )
    order_count = await db.scalar(select(func.count()).select_from(Order).where(*of_customer))
    spent = await _spent(db, store_id, [customer.id])
    return CustomerDetailOut(
        id=customer.id,
        name=customer.name,
        phone=customer.phone,
        address=customer.address,
        photo_url=customer.photo_url,
        on_telegram=customer.on_telegram,
        created_at=customer.created_at,
        order_count=order_count or 0,
        spent=spent.get(customer.id, []),
        orders=await order_service.order_summaries(db, store_id, list(orders)),
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


async def forget(db: AsyncSession, customer: Customer) -> tuple[int, str | None]:
    """A customer who asked to be forgotten (the Data deletion page): their
    name, phone number, addresses, map pins and notes go from that shop's
    customer list, orders and alerts. The orders stay, with their items and
    money, for the seller's records. Not committed; returns how many
    orders, and the Telegram photo to delete from storage once committed
    (`python -m app.admin forget-customer`, the admin's Remove)."""
    order_ids = list(await db.scalars(select(Order.id).where(Order.customer_id == customer.id)))
    customer.name = REMOVED
    # Unique per shop, and no longer anyone's number.
    customer.phone = f"removed-{customer.id.hex[:8]}"
    customer.address = None
    customer.telegram_user_id = None
    customer.telegram_phone = None
    photo, customer.photo_url = customer.photo_url, None
    await db.execute(
        update(Order)
        .where(Order.customer_id == customer.id)
        .values(
            delivery_address=None,
            delivery_lat=None,
            delivery_lng=None,
            delivery_address_note=None,
            notes=None,
        )
    )
    # The bell's alerts keep the name the order had.
    await db.execute(
        text(
            "UPDATE notification_log SET payload = jsonb_set(payload,"
            " '{order,customer_name}', to_jsonb(CAST(:removed AS text)))"
            " WHERE store_id = :store_id"
            " AND payload->'order'->>'id' = ANY(CAST(:ids AS text[]))"
        ),
        {"removed": REMOVED, "store_id": customer.store_id, "ids": [str(i) for i in order_ids]},
    )
    return len(order_ids), photo
