"""Orders, customers and products across every shop, for the admin
(01_PRODUCT.md §22.11, parts 19 to 22): find an order or a customer
someone is asking about (look only), remove a customer's details when they
ask (the Data deletion page), and the newest products of every shop with a
way to hide one. Reads across shops, so on the admin's unscoped session.
"""

import re
import uuid
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, NotFound
from app.models import Customer, Order, Product, ProductStatus, Seller, Store
from app.schemas.admin import (
    AdminCustomerOut,
    AdminCustomerShopOut,
    AdminForgetIn,
    AdminForgetOut,
    AdminOrderOut,
    AdminProductOut,
)
from app.services import admin_auth, admin_log
from app.services import customer as customer_service
from app.services.order import SUMMARY_LOADS
from app.services.phone import normalize_phone, phone_search_terms

FOUND = 20  # orders or customers shown for a search
PRODUCTS_PAGE = 40

_PHONE = re.compile(r"[\d\s+\-().]{6,}")


def _is_phone(q: str) -> bool:
    return bool(_PHONE.fullmatch(q)) and len(re.sub(r"\D", "", q)) >= 6


async def find_orders(db: AsyncSession, q: str) -> list[AdminOrderOut]:
    """Part 19: "sokha 1043" (a shop's name or link and the order's
    number), "1043" (that number in any shop), or the customer's phone."""
    q = q.strip()
    query = (
        select(Order, Store, Seller)
        .join(Store, Store.id == Order.store_id)
        .join(Seller, Seller.id == Store.seller_id)
        .options(*SUMMARY_LOADS)
        .order_by(Order.created_at.desc())
        .limit(FOUND)
    )
    if _is_phone(q):
        query = query.join(Customer, Customer.id == Order.customer_id).where(
            or_(*(Customer.phone.contains(t, autoescape=True) for t in phone_search_terms(q)))
        )
    else:
        words = [w.lstrip("#") for w in q.split()]
        numbers = [w for w in words if w.isdigit()]
        if not numbers:
            return []
        query = query.where(Order.number == int(numbers[-1]))
        shop = " ".join(w for w in words if not w.isdigit())
        if shop:
            query = query.where(
                or_(
                    Store.name.icontains(shop, autoescape=True),
                    Store.slug.icontains(shop, autoescape=True),
                )
            )
    return [_order(order, store, owner) for order, store, owner in (await db.execute(query)).all()]


def _order(order: Order, store: Store, owner: Seller) -> AdminOrderOut:
    return AdminOrderOut(
        id=order.id,
        store_id=store.id,
        shop=store.name,
        number=order.number,
        created_at=order.created_at,
        customer_name=order.customer.name,
        customer_phone=order.customer.phone,
        items=[
            f"{item.product_name_snapshot}"
            + (f" ({item.variant_name_snapshot})" if item.variant_name_snapshot else "")
            + f" × {item.quantity}"
            for item in order.items
        ],
        currency=order.currency.value,
        delivery_fee=order.delivery_fee,
        total=order.total,
        status=order.status.value,
        payment_method=order.payment.method.value,
        payment_status=order.payment.status.value,
        delivery_method=order.delivery.method.value,
        delivery_status=order.delivery.status.value,
        seller=owner.full_name,
        seller_phone=owner.phone,
    )


async def find_customers(db: AsyncSession, q: str) -> list[AdminCustomerOut]:
    """Part 20: by phone (typed any way) or name, in every shop, one entry
    per phone number with the shops it ordered from."""
    q = q.strip()
    if len(q) < 2:
        return []
    counts = (
        select(
            Order.customer_id,
            func.count().label("orders"),
            func.max(Order.created_at).label("last"),
        )
        .group_by(Order.customer_id)
        .subquery()
    )
    rows = (
        await db.execute(
            select(Customer, Store.name, counts.c.orders, counts.c.last)
            .join(Store, Store.id == Customer.store_id)
            .outerjoin(counts, counts.c.customer_id == Customer.id)
            .where(customer_service.matches(q), Customer.name != customer_service.REMOVED)
            .order_by(counts.c.last.desc().nulls_last())
            .limit(FOUND * 3)
        )
    ).all()
    found: dict[str, AdminCustomerOut] = {}
    for customer, shop, orders, last in rows:
        entry = found.get(customer.phone)
        if entry is None:
            if len(found) == FOUND:
                continue
            entry = found[customer.phone] = AdminCustomerOut(
                phone=customer.phone, name=customer.name, shops=[]
            )
        entry.shops.append(
            AdminCustomerShopOut(
                store_id=customer.store_id,
                shop=shop,
                customer_id=customer.id,
                orders=orders or 0,
                last_order_at=last,
                telegram=customer.telegram_user_id is not None,
            )
        )
    return list(found.values())


async def forget_customer(
    db: AsyncSession, admin_id: uuid.UUID, data: AdminForgetIn
) -> tuple[AdminForgetOut, list[str]]:
    """Part 21: the customer's name becomes "(removed)" and their phone,
    addresses, map pins and notes go, in one shop or every shop; orders
    and money stay. The admin's password every time. A log line per shop,
    without the name or phone. Answers what was done and the Telegram
    photos to delete from storage."""
    await admin_auth.check_password(db, admin_id, data.password)
    try:
        phone = normalize_phone(data.phone)
    except ValueError as exc:
        raise AppError(422, "INVALID_PHONE", "Enter a valid phone number.", "phone") from exc
    query = (
        select(Customer, Store)
        .join(Store, Store.id == Customer.store_id)
        .where(Customer.phone == phone)
    )
    if data.store_id is not None:
        query = query.where(Customer.store_id == data.store_id)
    rows = (await db.execute(query.with_for_update(of=Customer))).all()
    if not rows:
        raise NotFound("CUSTOMER_NOT_FOUND", "No customer with that phone.")
    orders, photos = 0, []
    for customer, store in rows:
        count, photo = await customer_service.forget(db, customer)
        orders += count
        if photo:
            photos.append(photo)
        admin_log.record(db, admin_id, "forget_customer", store=store, orders=count)
    await db.commit()
    return AdminForgetOut(shops=len(rows), orders=orders), photos


async def products(
    db: AsyncSession, q: str | None, before: datetime | None
) -> list[AdminProductOut]:
    """Part 22 (pick 14A): the newest products of every shop, hidden ones
    too; a name or a shop's name with `q`; older with `before`."""
    query = (
        select(Product, Store)
        .join(Store, Store.id == Product.store_id)
        .order_by(Product.created_at.desc(), Product.id)
        .limit(PRODUCTS_PAGE)
    )
    if q and q.strip():
        query = query.where(
            or_(
                Product.name.icontains(q.strip(), autoescape=True),
                Store.name.icontains(q.strip(), autoescape=True),
            )
        )
    if before is not None:
        query = query.where(Product.created_at < before)
    return [_product(p, s) for p, s in (await db.execute(query)).all()]


def _product(product: Product, store: Store) -> AdminProductOut:
    return AdminProductOut(
        id=product.id,
        store_id=store.id,
        shop=store.name,
        name=product.name,
        price=product.price,
        currency=store.currency.value,
        image_url=product.image_urls[0] if product.image_urls else None,
        status=product.status.value,
        created_at=product.created_at,
    )


async def hide_product(
    db: AsyncSession, admin_id: uuid.UUID, product_id: uuid.UUID, reason: str | None
) -> AdminProductOut:
    """Part 22: hidden from the shop, as the seller's own Hide does; the
    seller can show it again. Logged."""
    product = await db.scalar(select(Product).where(Product.id == product_id).with_for_update())
    if product is None:
        raise NotFound("PRODUCT_NOT_FOUND", "Product not found.")
    if product.status is ProductStatus.INACTIVE:
        raise AppError(409, "PRODUCT_ALREADY_HIDDEN", "This product is hidden already.")
    store = await db.get(Store, product.store_id)
    product.status = ProductStatus.INACTIVE
    admin_log.record(
        db,
        admin_id,
        "hide_product",
        store=store,
        reason=(reason or "").strip() or None,
        product=product.name,
    )
    await db.commit()
    return _product(product, store)
