"""Placing an order from the public shop (guest checkout, 02_TECHNICAL.md
section 5.4) and finding it again to track it (section 8).

Runs on a tenant session for the shop in the URL: every query filters by
store_id (layer 1) and RLS enforces the same thing (layer 2). Prices and
stock come from the database, never from the request.
"""

import uuid
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError, NotFound
from app.models import (
    Customer,
    Delivery,
    DeliveryMethod,
    Order,
    OrderConfirmationMode,
    OrderItem,
    OrderStatus,
    Payment,
    Product,
    ProductStatus,
    ProductVariant,
    Store,
)
from app.schemas.order import OrderCreate, OrderLineIn, ShopOrderOut
from app.services import delivery as delivery_service
from app.services import link as link_service
from app.services import notifications
from app.services import order as order_service
from app.services import payment as payment_service
from app.services.phone import normalize_phone
from app.services.pricing import line_total, order_totals

FIRST_ORDER_NUMBER = 1001


@dataclass(frozen=True)
class _Line:
    index: int  # where it was in the request, for the error's `field`
    product: Product
    variant: ProductVariant | None
    quantity: int

    @property
    def unit_price(self) -> Decimal:
        if self.variant is None or self.variant.price_override is None:
            return self.product.price
        return self.variant.price_override

    @property
    def stock(self) -> int:
        if self.variant is not None:
            return self.variant.stock_quantity
        return self.product.stock_quantity or 0

    @property
    def name(self) -> str:
        return f"{self.product.name} ({self.variant.name})" if self.variant else self.product.name


async def place_order(
    db: AsyncSession, store_id: uuid.UUID, data: OrderCreate
) -> tuple[Order, list[notifications.StockAlert]]:
    """The placed order, and the products it took down to low or out of
    stock (for the seller's alert)."""
    # Locks the store row until commit, so checkouts in one store run one
    # at a time: order numbers stay unique, and one phone can't become two
    # customers. Fine at MVP volume.
    store = await db.scalar(select(Store).where(Store.id == store_id).with_for_update())
    assert store is not None  # the shop was found by slug moments ago
    if store.orders_paused_now:
        raise AppError(409, "ORDERS_PAUSED", "This shop isn't taking orders right now.")
    payment_service.check_method_available(store, data.payment_method)
    delivery_settings = delivery_service.delivery_settings(store)
    courier = delivery_service.check_checkout_choice(
        delivery_settings, data.delivery_method, data.courier
    )
    location = _delivery_location(data)

    lines = await _resolve_lines(db, store_id, data.items)
    items = [
        OrderItem(
            store_id=store_id,
            product_id=line.product.id,
            variant_id=line.variant.id if line.variant else None,
            product_name_snapshot=line.product.name,
            variant_name_snapshot=line.variant.name if line.variant else None,
            unit_price_snapshot=line.unit_price,
            quantity=line.quantity,
            line_total=line_total(line.unit_price, line.quantity),
        )
        for line in lines
    ]
    totals = order_totals(
        [item.line_total for item in items],
        item_count=sum(line.quantity for line in lines),
        method=data.delivery_method,
        delivery=delivery_settings,
        discounts=delivery_service.discount_settings(store),
    )
    if totals.total != data.expected_total:
        raise AppError(
            409,
            "ORDER_TOTAL_CHANGED",
            "Prices or delivery fees changed since you opened your cart. "
            "Check your order and place it again.",
        )

    stock_alerts = []
    for line in lines:
        left = await _take_stock(db, store_id, line)
        alert = notifications.stock_alert(line.product.id, line.name, left + line.quantity, left)
        if alert is not None:
            stock_alerts.append(alert)

    # The link the customer came through counts the order (02 section 9.2).
    link = await link_service.find(db, store_id, data.link) if data.link else None
    order = Order(
        store_id=store_id,
        number=await _next_number(db, store_id),
        customer=await _customer(db, store_id, data, location.address),
        status=OrderStatus.PENDING,
        currency=store.currency,
        subtotal=totals.subtotal,
        discount=totals.discount,
        delivery_fee=totals.delivery_fee,
        total=totals.total,
        delivery_method=data.delivery_method,
        delivery_address=location.address,
        delivery_lat=location.lat,
        delivery_lng=location.lng,
        delivery_address_note=location.note,
        notes=data.notes or None,
        source=link.source if link else None,
        items=sorted(items, key=lambda i: (i.product_name_snapshot, i.variant_name_snapshot or "")),
        # Paid or not is its own state machine, starting at pending for
        # every method (02 section 7.2).
        payment=Payment(store_id=store_id, method=data.payment_method, amount=totals.total),
        # Likewise its own state machine, starting at not_assigned (section 7.3).
        delivery=Delivery(
            store_id=store_id,
            method=data.delivery_method,
            courier=courier,
        ),
    )
    db.add(order)
    if store.order_confirmation_mode is OrderConfirmationMode.AUTOMATIC:
        # Same path as the seller tapping "Accept" (02 section 7.1).
        await order_service.transition(db, order, OrderStatus.ACCEPTED)
    await db.flush()  # gives the order its id, for the notification's link
    db.add_all(notifications.web_notifications(order, stock_alerts))
    if link is not None:
        db.add(link_service.order_event(link, order))
    await db.commit()
    return order, stock_alerts


async def track_order(
    db: AsyncSession, store_id: uuid.UUID, order_id: uuid.UUID, phone: str
) -> Order:
    """The order, if `phone` is the one it was placed with (any spelling)."""
    try:
        phone = normalize_phone(phone)
    except ValueError:
        phone = None
    order = None
    if phone is not None:
        order = await db.scalar(
            select(Order)
            .join(Customer, Customer.id == Order.customer_id)
            .where(
                Order.id == order_id,
                Order.store_id == store_id,
                Customer.store_id == store_id,
                Customer.phone == phone,
            )
            .options(
                selectinload(Order.items),
                selectinload(Order.payment),
                selectinload(Order.delivery),
            )
        )
    if order is None:
        # The same answer for a wrong phone as for no such order.
        raise NotFound("ORDER_NOT_FOUND", "No order matches this link and phone number.")
    return order


async def shop_order_out(db: AsyncSession, store: Store, order: Order) -> ShopOrderOut:
    """The order as its customer sees it, with how to pay for it, where to
    collect it, and each item's photo."""
    out = ShopOrderOut.model_validate(order)
    photos = await order_service.product_photos(
        db, store.id, {item.product_id for item in out.items}
    )
    return out.model_copy(
        update={
            "items": [
                item.model_copy(update={"image_url": photos.get(item.product_id)})
                for item in out.items
            ],
            "payment": payment_service.shop_payment_out(store, order),
            "delivery": delivery_service.shop_delivery_out(store, order),
        }
    )


@dataclass(frozen=True)
class _Location:
    address: str | None = None
    lat: Decimal | None = None
    lng: Decimal | None = None
    note: str | None = None


def _delivery_location(data: OrderCreate) -> _Location:
    """Where to deliver: the typed address, the GPS location, or both, plus
    a note for the driver. Nothing for pickup."""
    if data.delivery_method is DeliveryMethod.PICKUP:
        return _Location()
    has_gps = data.delivery_lat is not None and data.delivery_lng is not None
    if (data.delivery_lat is None) != (data.delivery_lng is None):
        raise AppError(422, "VALIDATION_ERROR", "Share your location again.", "delivery_lat")
    if data.delivery_address is None and not has_gps:
        raise AppError(
            422,
            "VALIDATION_ERROR",
            "Enter your address or share your location.",
            "delivery_address",
        )
    return _Location(
        data.delivery_address,
        data.delivery_lat,
        data.delivery_lng,
        data.delivery_address_note or None,
    )


async def _resolve_lines(
    db: AsyncSession, store_id: uuid.UUID, requested: list[OrderLineIn]
) -> list[_Line]:
    """Each requested line with its product/variant, after checking it can
    be bought and enough is in stock. The same product and variant twice
    count as one line."""
    merged: dict[tuple[uuid.UUID, uuid.UUID | None], tuple[int, int]] = {}
    for index, line in enumerate(requested):
        key = (line.product_id, line.variant_id)
        first_index, quantity = merged.get(key, (index, 0))
        merged[key] = (first_index, quantity + line.quantity)

    products = {
        product.id: product
        for product in await db.scalars(
            select(Product)
            .where(
                Product.store_id == store_id,
                Product.id.in_({product_id for product_id, _ in merged}),
                Product.status == ProductStatus.ACTIVE,
            )
            .options(selectinload(Product.variants))
        )
    }

    lines = []
    for (product_id, variant_id), (index, quantity) in merged.items():
        product = products.get(product_id)
        variant = None
        if product is not None and product.has_variants:
            variant = next((v for v in product.variants if v.id == variant_id), None)
        # Gone, hidden, or the cart is older than the seller's last change
        # to the product's variants.
        if (
            product is None
            or (product.has_variants and variant is None)
            or (not product.has_variants and variant_id is not None)
        ):
            raise AppError(
                409,
                "PRODUCT_UNAVAILABLE",
                "An item in your cart is no longer available.",
                f"items.{index}",
            )
        line = _Line(index, product, variant, quantity)
        if line.quantity > line.stock:
            raise _out_of_stock(line)
        lines.append(line)
    return lines


async def _take_stock(db: AsyncSession, store_id: uuid.UUID, line: _Line) -> int:
    """Takes the line's quantity from stock; returns how many are left."""
    model = ProductVariant if line.variant is not None else Product
    row_id = line.variant.id if line.variant is not None else line.product.id
    # Checked and taken in one statement: a seller saving new stock between
    # the check above and here can't make it go negative.
    left = await db.scalar(
        update(model)
        .where(
            model.id == row_id,
            model.store_id == store_id,
            model.stock_quantity >= line.quantity,
        )
        .values(stock_quantity=model.stock_quantity - line.quantity)
        .returning(model.stock_quantity)
        .execution_options(synchronize_session=False)
    )
    if left is None:
        raise _out_of_stock(line)
    return left


def _out_of_stock(line: _Line) -> AppError:
    message = (
        f"{line.name} is sold out."
        if line.stock <= 0
        else f"Only {line.stock} of {line.name} left."
    )
    return AppError(409, "PRODUCT_OUT_OF_STOCK", message, f"items.{line.index}")


async def _customer(
    db: AsyncSession, store_id: uuid.UUID, data: OrderCreate, address: str | None
) -> Customer:
    """This store's customer with this phone, updated to the name and
    address from this order (a pickup keeps the last address), or a new
    one."""
    customer = await db.scalar(
        select(Customer).where(Customer.store_id == store_id, Customer.phone == data.phone)
    )
    if customer is None:
        customer = Customer(store_id=store_id, phone=data.phone)
        db.add(customer)
    customer.name = data.name
    if address is not None:
        customer.address = address
    return customer


async def _next_number(db: AsyncSession, store_id: uuid.UUID) -> int:
    last = await db.scalar(select(func.max(Order.number)).where(Order.store_id == store_id))
    return FIRST_ORDER_NUMBER if last is None else last + 1
