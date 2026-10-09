"""Orders after they're placed: the order state machine (02_TECHNICAL.md
section 7.1) and the seller's order list and detail.

Order, payment, and delivery are independent state machines (CLAUDE.md
hard rule 2). The order's status follows only the table below, the
payment's and the delivery's only their own (app/services/payment.py,
app/services/delivery.py); none is ever set from another. The one rule
that couples them is completion (section 7.4).

Every query filters by store_id (layer 1) on a tenant session where RLS
enforces the same thing (layer 2).
"""

import uuid
from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError, NotFound
from app.models import (
    DeliveryStatus,
    Order,
    OrderItem,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    Product,
    ProductVariant,
)
from app.schemas.delivery import DeliveryUpdate
from app.schemas.order import OrderListOut, OrderOut, OrderSummaryOut
from app.schemas.payment import PaymentUpdate
from app.services import delivery as delivery_service
from app.services import payment as payment_service

S = OrderStatus

# The short path (founder's pick 1C, 2026-10-09): after Accept, preparing,
# ready, shipped and delivered are optional steps for customers who follow
# along, and an order can complete from any of them once the completion
# rule holds (can_complete, checked in transition()).
ALLOWED_ORDER_TRANSITIONS: dict[OrderStatus, frozenset[OrderStatus]] = {
    S.PENDING: frozenset({S.ACCEPTED, S.REJECTED}),
    S.ACCEPTED: frozenset({S.PROCESSING, S.READY, S.SHIPPED, S.COMPLETED, S.CANCELLED}),
    S.PROCESSING: frozenset({S.READY, S.SHIPPED, S.COMPLETED, S.CANCELLED}),
    S.READY: frozenset({S.SHIPPED, S.COMPLETED, S.CANCELLED}),
    S.SHIPPED: frozenset({S.DELIVERED, S.COMPLETED}),
    S.DELIVERED: frozenset({S.COMPLETED}),
    S.COMPLETED: frozenset(),
    S.REJECTED: frozenset(),
    S.CANCELLED: frozenset(),
}

# Placing an order takes its stock (decided 2026-10-02); these give it back.
RETURNS_STOCK = frozenset({S.REJECTED, S.CANCELLED})


def is_settled(order: Order) -> bool:
    """Paid, or cash on delivery (whenever the cash changes hands)."""
    payment = order.payment
    return payment.status is PaymentStatus.PAID or payment.method is PaymentMethod.COD


def can_complete(order: Order) -> bool:
    """02 section 7.4: an order may complete only once its delivery is
    delivered (or the pickup collected) and its payment is settled."""
    return order.delivery.status is DeliveryStatus.DELIVERED and is_settled(order)


def check_transition(current: OrderStatus, target: OrderStatus) -> None:
    if target not in ALLOWED_ORDER_TRANSITIONS[current]:
        raise AppError(
            409,
            "INVALID_STATUS_TRANSITION",
            f"This order is {current.value}, so it can't be marked {target.value}.",
            "status",
        )


def next_statuses(order: Order) -> list[OrderStatus]:
    """Where the seller can move this order now, in state-machine order."""
    allowed = ALLOWED_ORDER_TRANSITIONS[order.status]
    return [s for s in S if s in allowed and (s is not S.COMPLETED or can_complete(order))]


async def transition(db: AsyncSession, order: Order, target: OrderStatus) -> None:
    """The one place an order's status changes. The caller commits."""
    check_transition(order.status, target)
    if target is S.COMPLETED and order.delivery.status is not DeliveryStatus.DELIVERED:
        raise AppError(
            409,
            "ORDER_NOT_DELIVERED",
            "Mark the delivery delivered before completing this order.",
            "status",
        )
    if target is S.COMPLETED and not is_settled(order):
        raise AppError(
            409, "ORDER_NOT_PAID", "Record the payment before completing this order.", "status"
        )
    if target in RETURNS_STOCK:
        await _return_stock(db, order)
    order.status = target


async def _return_stock(db: AsyncSession, order: Order) -> None:
    for item in order.items:
        if item.variant_id is not None:
            model, row_id = ProductVariant, item.variant_id
        elif item.variant_name_snapshot is None:
            model, row_id = Product, item.product_id
        else:
            continue  # the variant has been deleted: nothing to return it to
        # One statement per row (stock = stock + n), so a checkout running
        # at the same time can't overwrite it. A product that has switched
        # to variants since keeps its stock there, so it is skipped.
        statement = (
            update(model)
            .where(model.id == row_id, model.store_id == order.store_id)
            .values(stock_quantity=model.stock_quantity + item.quantity)
            .execution_options(synchronize_session=False)
        )
        if model is Product:
            statement = statement.where(Product.has_variants.is_(False))
        await db.execute(statement)


async def get_order(
    db: AsyncSession, store_id: uuid.UUID, order_id: uuid.UUID, *, for_update: bool = False
) -> Order:
    query = (
        select(Order)
        .where(Order.id == order_id, Order.store_id == store_id)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items),
            selectinload(Order.payment),
            selectinload(Order.delivery),
        )
    )
    if for_update:
        query = query.with_for_update()
    order = await db.scalar(query)
    if order is None:
        raise NotFound("ORDER_NOT_FOUND", "Order not found.")
    return order


async def product_photos(
    db: AsyncSession, store_id: uuid.UUID, product_ids: set[uuid.UUID]
) -> dict[uuid.UUID, str]:
    """Each product's first photo now (not a snapshot), in one query.
    Products without photos, or since deleted, are left out."""
    if not product_ids:
        return {}
    rows = await db.execute(
        select(Product.id, Product.image_urls).where(
            Product.store_id == store_id, Product.id.in_(product_ids)
        )
    )
    return {product_id: urls[0] for product_id, urls in rows if urls}


async def order_out(db: AsyncSession, store_id: uuid.UUID, order: Order) -> OrderOut:
    """The seller's view of the order, with each item's photo."""
    out = OrderOut.model_validate(order)
    photos = await product_photos(db, store_id, {item.product_id for item in out.items})
    for item in out.items:
        item.image_url = photos.get(item.product_id)
    out.next_statuses = next_statuses(order)
    out.payment.next_statuses = payment_service.next_statuses(order.payment)
    out.delivery.next_statuses = delivery_service.next_statuses(order.delivery)
    return out


async def change_status(
    db: AsyncSession, store_id: uuid.UUID, order_id: uuid.UUID, target: OrderStatus
) -> Order:
    # Locked until commit, so a double tap on "Cancel" can't return the
    # stock twice: the second request waits, then sees the new status.
    order = await get_order(db, store_id, order_id, for_update=True)
    await transition(db, order, target)
    await db.commit()
    return order


async def record_payment(
    db: AsyncSession, store_id: uuid.UUID, order_id: uuid.UUID, data: PaymentUpdate
) -> Order:
    """The seller records the order's payment as paid or failed (02
    section 10). Locked like a status change, so a double tap can't record
    it twice."""
    order = await get_order(db, store_id, order_id, for_update=True)
    payment_service.record(order.payment, data.status, data.reference)
    await db.commit()
    return order


async def record_delivery(
    db: AsyncSession, store_id: uuid.UUID, order_id: uuid.UUID, data: DeliveryUpdate
) -> Order:
    """The seller moves the order's delivery along (02 section 7.3).
    Locked like a status change, so a double tap can't move it twice."""
    order = await get_order(db, store_id, order_id, for_update=True)
    delivery_service.record(order.delivery, data.status, data.assignee_note)
    await db.commit()
    return order


async def record_cash_handover(db: AsyncSession, store_id: uuid.UUID, order_id: uuid.UUID) -> Order:
    """ "Delivered, cash received" on a cash-on-delivery order (founder's
    pick 1C, 2026-10-09): the seller's one tap records two things they
    saw, the delivery delivered (or collected) and the cash in hand, each
    through its own state machine. The order's status is left alone."""
    order = await get_order(db, store_id, order_id, for_update=True)
    if order.payment.method is not PaymentMethod.COD:
        raise AppError(
            409, "NOT_CASH_ON_DELIVERY", "This order isn't paid in cash on delivery.", "payment"
        )
    # Both checked before either changes, so it's both or neither.
    delivery_service.check_transition(
        order.delivery.method, order.delivery.status, DeliveryStatus.DELIVERED
    )
    payment_service.check_transition(order.payment.status, PaymentStatus.PAID)
    delivery_service.record(order.delivery, DeliveryStatus.DELIVERED, None)
    payment_service.record(order.payment, PaymentStatus.PAID, None)
    await db.commit()
    return order


# What order_summary reads; load them with the orders.
SUMMARY_LOADS = (
    selectinload(Order.customer),
    selectinload(Order.items),
    selectinload(Order.payment),
    selectinload(Order.delivery),
)


def _main_item(order: Order) -> OrderItem:
    """The line a row leads with: the biggest by total (then by name, so
    it's always the same one)."""
    return min(order.items, key=lambda item: (-item.line_total, item.product_name_snapshot))


def order_summary(order: Order, photos: dict[uuid.UUID, str] | None = None) -> OrderSummaryOut:
    """A row in an order list (the Orders tab, a customer's orders).
    `photos`: each product's first photo, from order_summaries."""
    main = _main_item(order)
    return OrderSummaryOut(
        id=order.id,
        number=order.number,
        status=order.status,
        created_at=order.created_at,
        currency=order.currency,
        total=order.total,
        customer_name=order.customer.name,
        item_count=sum(item.quantity for item in order.items),
        first_item_name=main.product_name_snapshot,
        line_count=len(order.items),
        first_item_image_url=(photos or {}).get(main.product_id),
        payment_method=order.payment.method,
        payment_status=order.payment.status,
        delivery_method=order.delivery.method,
        delivery_status=order.delivery.status,
    )


async def order_summaries(
    db: AsyncSession, store_id: uuid.UUID, orders: list[Order]
) -> list[OrderSummaryOut]:
    """Rows for `orders` (loaded with SUMMARY_LOADS), each with its main
    item's photo, in one query for the whole list."""
    photos = await product_photos(db, store_id, {_main_item(order).product_id for order in orders})
    return [order_summary(order, photos) for order in orders]


async def list_orders(
    db: AsyncSession,
    store_id: uuid.UUID,
    *,
    statuses: list[OrderStatus] | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> OrderListOut:
    """Newest first. `created_to` is exclusive."""
    filters = [Order.store_id == store_id]
    if created_from is not None:
        filters.append(Order.created_at >= created_from)
    if created_to is not None:
        filters.append(Order.created_at < created_to)

    query = (
        select(Order)
        .where(*filters)
        .options(*SUMMARY_LOADS)
        .order_by(Order.number.desc())
        .limit(limit + 1)  # one extra row tells whether there are more
        .offset(offset)
    )
    if statuses:
        query = query.where(Order.status.in_(statuses))
    orders = list(await db.scalars(query))

    count_rows = await db.execute(
        select(Order.status, func.count()).where(*filters).group_by(Order.status)
    )
    counts = dict(count_rows.all())
    return OrderListOut(
        orders=await order_summaries(db, store_id, orders[:limit]),
        has_more=len(orders) > limit,
        counts={status: counts.get(status, 0) for status in S},
    )
