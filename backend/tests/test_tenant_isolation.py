"""Postgres RLS is the second line of tenant isolation (02_TECHNICAL.md 4.2).

These go straight to the database, without the service layer's filters,
to prove RLS alone keeps stores apart.
"""

from decimal import Decimal

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import DBAPIError

from app.db.session import tenant_session, unscoped_session
from app.models import (
    Category,
    Customer,
    Delivery,
    DeliveryMethod,
    Order,
    OrderItem,
    Payment,
    PaymentMethod,
    Product,
    ProductVariant,
    Store,
)


async def _add_product(store_id, name="Shirt"):
    async with unscoped_session() as db:
        product = Product(store_id=store_id, name=name, slug=name.lower(), price=Decimal("10.00"))
        db.add(product)
        await db.flush()
        db.add(
            ProductVariant(store_id=store_id, product_id=product.id, name="Red", stock_quantity=1)
        )
        db.add(Category(store_id=store_id, name="Tops", slug="tops"))
        await db.commit()
        return product.id


async def test_store_only_sees_its_own_rows(two_stores):
    a, b = two_stores
    await _add_product(a.store_id)
    await _add_product(b.store_id)

    async with tenant_session(a.store_id) as db:
        stores = (await db.scalars(select(Store.id))).all()
        products = (await db.scalars(select(Product.store_id))).all()
        variants = (await db.scalars(select(ProductVariant.store_id))).all()
        categories = (await db.scalars(select(Category.store_id))).all()

    assert stores == [a.store_id]
    assert set(products) == set(variants) == set(categories) == {a.store_id}


async def _add_order(store_id, product_id):
    async with unscoped_session() as db:
        customer = Customer(store_id=store_id, name="Dara", phone="012345678")
        db.add(customer)
        await db.flush()
        db.add(
            Order(
                store_id=store_id,
                number=1001,
                customer_id=customer.id,
                currency="USD",
                subtotal=Decimal("10.00"),
                total=Decimal("10.00"),
                delivery_method=DeliveryMethod.SELLER_DELIVERY,
                items=[
                    OrderItem(
                        store_id=store_id,
                        product_id=product_id,
                        product_name_snapshot="Shirt",
                        unit_price_snapshot=Decimal("10.00"),
                        quantity=1,
                        line_total=Decimal("10.00"),
                    )
                ],
                payment=Payment(
                    store_id=store_id, method=PaymentMethod.COD, amount=Decimal("10.00")
                ),
                delivery=Delivery(store_id=store_id, method=DeliveryMethod.SELLER_DELIVERY),
            )
        )
        await db.commit()


async def test_store_only_sees_its_own_orders(two_stores):
    a, b = two_stores
    await _add_order(a.store_id, await _add_product(a.store_id))
    await _add_order(b.store_id, await _add_product(b.store_id))

    async with tenant_session(a.store_id) as db:
        customers = (await db.scalars(select(Customer.store_id))).all()
        orders = (await db.scalars(select(Order.store_id))).all()
        items = (await db.scalars(select(OrderItem.store_id))).all()
        payments = (await db.scalars(select(Payment.store_id))).all()
        deliveries = (await db.scalars(select(Delivery.store_id))).all()

    assert customers == orders == items == payments == deliveries == [a.store_id]


async def test_store_cannot_change_another_stores_rows(two_stores):
    a, b = two_stores
    b_product = await _add_product(b.store_id)

    async with tenant_session(a.store_id) as db:
        result = await db.execute(
            update(Product).where(Product.id == b_product).values(name="Hijacked")
        )
        await db.commit()

    assert result.rowcount == 0
    async with unscoped_session() as db:
        assert (await db.get(Product, b_product)).name == "Shirt"


async def test_store_cannot_create_rows_for_another_store(two_stores):
    a, b = two_stores

    with pytest.raises(DBAPIError, match="row-level security"):
        async with tenant_session(a.store_id) as db:
            db.add(Category(store_id=b.store_id, name="Sneaky", slug="sneaky"))
            await db.commit()


async def test_no_tenant_means_no_rows(two_stores):
    a, _ = two_stores
    await _add_product(a.store_id)

    # As app_user with the tenant setting cleared: nothing, not everything.
    async with tenant_session(a.store_id) as db:
        await db.execute(text("SELECT set_config('app.tenant_id', '', true)"))
        count = len((await db.scalars(select(Product.id))).all())

    assert count == 0
