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
    DeliveryMethod,
    Order,
    OrderConfirmationMode,
    OrderItem,
    OrderStatus,
    Product,
    ProductStatus,
    ProductVariant,
    Store,
)
from app.schemas.order import OrderCreate, OrderLineIn
from app.services import order as order_service
from app.services.phone import normalize_phone

FIRST_ORDER_NUMBER = 1001
CENT = Decimal("0.01")


def line_total(unit_price: Decimal, quantity: int) -> Decimal:
    return (unit_price * quantity).quantize(CENT)


def order_totals(line_totals: list[Decimal], delivery_fee: Decimal) -> tuple[Decimal, Decimal]:
    """(subtotal, total)."""
    subtotal = sum(line_totals, Decimal("0.00"))
    return subtotal, subtotal + delivery_fee


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


async def place_order(db: AsyncSession, store_id: uuid.UUID, data: OrderCreate) -> Order:
    # Locks the store row until commit, so checkouts in one store run one
    # at a time: order numbers stay unique, and one phone can't become two
    # customers. Fine at MVP volume.
    store = await db.scalar(select(Store).where(Store.id == store_id).with_for_update())
    assert store is not None  # the shop was found by slug moments ago

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
    # Delivery fees are an open decision (01_PRODUCT.md section 46), for Phase 5.
    delivery_fee = Decimal("0.00")
    subtotal, total = order_totals([item.line_total for item in items], delivery_fee)
    if total != data.expected_total:
        raise AppError(
            409,
            "ORDER_TOTAL_CHANGED",
            "Prices changed since you opened your cart. Check your order and place it again.",
        )

    for line in lines:
        await _take_stock(db, store_id, line)

    order = Order(
        store_id=store_id,
        number=await _next_number(db, store_id),
        customer=await _customer(db, store_id, data),
        status=OrderStatus.PENDING,
        currency=store.currency,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total=total,
        # Pickup becomes a choice at checkout in Phase 5.
        delivery_method=DeliveryMethod.SELLER_DELIVERY,
        delivery_address=data.delivery_address,
        notes=data.notes or None,
        items=sorted(items, key=lambda i: (i.product_name_snapshot, i.variant_name_snapshot or "")),
    )
    db.add(order)
    if store.order_confirmation_mode is OrderConfirmationMode.AUTOMATIC:
        # Same path as the seller tapping "Accept" (02 section 7.1).
        await order_service.transition(db, order, OrderStatus.ACCEPTED)
    await db.commit()
    return order


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
            .options(selectinload(Order.items))
        )
    if order is None:
        # The same answer for a wrong phone as for no such order.
        raise NotFound("ORDER_NOT_FOUND", "No order matches this link and phone number.")
    return order


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


async def _take_stock(db: AsyncSession, store_id: uuid.UUID, line: _Line) -> None:
    model = ProductVariant if line.variant is not None else Product
    row_id = line.variant.id if line.variant is not None else line.product.id
    # Checked and taken in one statement: a seller saving new stock between
    # the check above and here can't make it go negative.
    result = await db.execute(
        update(model)
        .where(
            model.id == row_id,
            model.store_id == store_id,
            model.stock_quantity >= line.quantity,
        )
        .values(stock_quantity=model.stock_quantity - line.quantity)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        raise _out_of_stock(line)


def _out_of_stock(line: _Line) -> AppError:
    message = (
        f"{line.name} is sold out."
        if line.stock <= 0
        else f"Only {line.stock} of {line.name} left."
    )
    return AppError(409, "PRODUCT_OUT_OF_STOCK", message, f"items.{line.index}")


async def _customer(db: AsyncSession, store_id: uuid.UUID, data: OrderCreate) -> Customer:
    """This store's customer with this phone, updated to the name and
    address from this order, or a new one."""
    customer = await db.scalar(
        select(Customer).where(Customer.store_id == store_id, Customer.phone == data.phone)
    )
    if customer is None:
        customer = Customer(store_id=store_id, phone=data.phone)
        db.add(customer)
    customer.name = data.name
    customer.address = data.delivery_address
    return customer


async def _next_number(db: AsyncSession, store_id: uuid.UUID) -> int:
    last = await db.scalar(select(func.max(Order.number)).where(Order.store_id == store_id))
    return FIRST_ORDER_NUMBER if last is None else last + 1
