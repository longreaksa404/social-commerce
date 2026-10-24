"""The order state machine (02_TECHNICAL.md section 7.1) and the seller's
order endpoints."""

import uuid
from itertools import product

import pytest

from app.core.errors import AppError
from app.db.session import unscoped_session
from app.models import (
    Delivery,
    DeliveryMethod,
    DeliveryStatus,
    Order,
    OrderStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
    Product,
    ProductVariant,
)
from app.services.order import can_complete, check_transition, next_statuses, transition
from tests.helpers import add_product, place_order, stock, variant_ids

S = OrderStatus

# Copied from 02_TECHNICAL.md section 7.1 on purpose, not imported: a
# change to the service's table has to be made here too, deliberately.
# Accept, then complete (the completion rule is checked separately); Ready
# only for pickup, checked separately too. Preparing, Shipped and Delivered
# are retired (founder's test list #1, 2026-10-24): nothing enters them,
# and an order left there can still close.
EXPECTED = {
    S.PENDING: {S.ACCEPTED, S.REJECTED},
    S.ACCEPTED: {S.READY, S.COMPLETED, S.CANCELLED},
    S.READY: {S.COMPLETED, S.CANCELLED},
    S.PROCESSING: {S.COMPLETED, S.CANCELLED},
    S.SHIPPED: {S.COMPLETED},
    S.DELIVERED: {S.COMPLETED},
    S.COMPLETED: set(),
    S.REJECTED: set(),
    S.CANCELLED: set(),
}


@pytest.mark.parametrize(("current", "target"), list(product(S, S)))
def test_every_transition_follows_the_state_machine(current, target):
    if target in EXPECTED[current]:
        check_transition(current, target)
    else:
        with pytest.raises(AppError) as error:
            check_transition(current, target)
        assert (error.value.status_code, error.value.code) == (409, "INVALID_STATUS_TRANSITION")


def _order(
    status,
    method=PaymentMethod.BANK_TRANSFER,
    paid=PaymentStatus.PENDING,
    delivered=DeliveryStatus.DELIVERED,
    delivery_method=DeliveryMethod.SELLER_DELIVERY,
):
    return Order(
        status=status,
        items=[],
        payment=Payment(method=method, status=paid),
        delivery=Delivery(method=delivery_method, status=delivered),
    )


def test_next_statuses_offer_the_allowed_moves_in_order():
    assert next_statuses(_order(S.PENDING)) == [S.ACCEPTED, S.REJECTED]
    # Not paid yet: completing isn't offered; a delivery isn't "ready".
    assert next_statuses(_order(S.ACCEPTED)) == [S.CANCELLED]
    pickup = _order(S.ACCEPTED, delivery_method=DeliveryMethod.PICKUP)
    assert next_statuses(pickup) == [S.READY, S.CANCELLED]
    assert next_statuses(_order(S.CANCELLED)) == []


async def test_only_a_pickup_order_is_ready_to_collect():
    order = _order(S.ACCEPTED, delivered=DeliveryStatus.NOT_ASSIGNED)
    with pytest.raises(AppError) as error:
        await transition(None, order, S.READY)
    assert error.value.code == "INVALID_STATUS_TRANSITION"
    assert order.status is S.ACCEPTED

    pickup = _order(
        S.ACCEPTED, delivered=DeliveryStatus.NOT_ASSIGNED, delivery_method=DeliveryMethod.PICKUP
    )
    await transition(None, pickup, S.READY)
    assert pickup.status is S.READY


def test_complete_is_offered_from_any_step_once_delivered_and_paid():
    for status in (S.ACCEPTED, S.READY, S.PROCESSING, S.SHIPPED, S.DELIVERED):
        order = _order(status, paid=PaymentStatus.PAID)
        assert S.COMPLETED in next_statuses(order), status


async def test_an_accepted_order_completes_straight_away_once_delivered_and_paid():
    order = _order(S.ACCEPTED, PaymentMethod.COD, delivered=DeliveryStatus.NOT_ASSIGNED)
    with pytest.raises(AppError) as error:
        await transition(None, order, S.COMPLETED)
    assert error.value.code == "ORDER_NOT_DELIVERED"

    order.delivery.status = DeliveryStatus.DELIVERED
    await transition(None, order, S.COMPLETED)
    assert order.status is S.COMPLETED


# 02 section 7.4, copied on purpose: complete only once the delivery is
# delivered, and the payment is paid or cash on delivery (whatever its
# status).
@pytest.mark.parametrize(
    ("method", "paid", "delivered"), list(product(PaymentMethod, PaymentStatus, DeliveryStatus))
)
def test_the_completion_rule(method, paid, delivered):
    expected = delivered is DeliveryStatus.DELIVERED and (
        paid is PaymentStatus.PAID or method is PaymentMethod.COD
    )
    assert can_complete(_order(S.ACCEPTED, method, paid, delivered)) is expected


async def test_an_order_cannot_complete_before_its_payment_is_settled():
    order = _order(S.ACCEPTED, PaymentMethod.KHQR, PaymentStatus.PENDING)

    assert next_statuses(order) == [S.CANCELLED]
    with pytest.raises(AppError) as error:
        await transition(None, order, S.COMPLETED)
    assert error.value.code == "ORDER_NOT_PAID"
    assert order.status is S.ACCEPTED

    order.payment.status = PaymentStatus.PAID
    assert next_statuses(order) == [S.COMPLETED, S.CANCELLED]
    await transition(None, order, S.COMPLETED)
    assert order.status is S.COMPLETED


async def test_an_order_cannot_complete_before_its_delivery_is_delivered():
    order = _order(S.ACCEPTED, PaymentMethod.COD, delivered=DeliveryStatus.IN_TRANSIT)

    assert next_statuses(order) == [S.CANCELLED]
    with pytest.raises(AppError) as error:
        await transition(None, order, S.COMPLETED)
    assert error.value.code == "ORDER_NOT_DELIVERED"
    assert order.status is S.ACCEPTED


# --- Seller endpoints ------------------------------------------------------


async def _seller(client, auth_headers):
    """A registered seller: (headers, store_id, shop slug)."""
    headers = await auth_headers()
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    return headers, uuid.UUID(store["id"]), store["slug"]


async def _move(client, headers, order_id, status):
    return await client.patch(
        f"/api/v1/seller/orders/{order_id}/status", headers=headers, json={"status": status}
    )


async def test_seller_moves_an_order_along_and_sees_what_comes_next(client, auth_headers):
    headers, store_id, slug = await _seller(client, auth_headers)
    cap = await add_product(store_id, "cap")
    placed = (await place_order(client, slug, [(cap, None, 1)], total="10.00")).json()

    detail = await client.get(f"/api/v1/seller/orders/{placed['id']}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["customer"]["phone"] == "012345678"
    assert detail.json()["delivery_address"] == "St 271, Phnom Penh"
    assert detail.json()["next_statuses"] == ["accepted", "rejected"]

    response = await _move(client, headers, placed["id"], "accepted")
    assert response.status_code == 200, response.text
    assert response.json()["delivery"]["status"] == "not_assigned"  # untouched by the order
    # The delivery isn't delivered yet; a delivery isn't "ready to collect".
    assert response.json()["next_statuses"] == ["cancelled"]
    for retired in ("processing", "ready", "shipped", "delivered"):
        refused = await _move(client, headers, placed["id"], retired)
        assert refused.status_code == 409, retired
    for status in ("assigned", "picked_up", "in_transit", "delivered"):
        response = await client.patch(
            f"/api/v1/seller/orders/{placed['id']}/delivery",
            headers=headers,
            json={"status": status},
        )
        assert response.status_code == 200, response.text
    assert (response.json()["status"], response.json()["delivery"]["status"]) == (
        "accepted",  # untouched by the delivery
        "delivered",
    )
    # Cash on delivery: completing doesn't wait for the cash to be recorded.
    assert response.json()["next_statuses"] == ["completed", "cancelled"]
    response = await _move(client, headers, placed["id"], "completed")
    assert response.json()["status"] == "completed"
    assert response.json()["payment"]["status"] == "pending"  # untouched by the order

    response = await _move(client, headers, placed["id"], "pending")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "INVALID_STATUS_TRANSITION"


async def test_reject_and_cancel_put_the_stock_back_once(client, auth_headers):
    headers, store_id, slug = await _seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=5)
    dress = await add_product(store_id, "dress", variants=[("XL", None, 4)])
    xl = (await variant_ids(dress))["XL"]
    rejected = (await place_order(client, slug, [(cap, None, 2)], total="20.00")).json()
    cancelled = (await place_order(client, slug, [(dress, xl, 3)], total="30.00")).json()
    assert (await stock(Product, cap), await stock(ProductVariant, xl)) == (3, 1)

    assert (await _move(client, headers, rejected["id"], "rejected")).status_code == 200
    assert (await _move(client, headers, cancelled["id"], "accepted")).status_code == 200
    assert (await _move(client, headers, cancelled["id"], "cancelled")).status_code == 200
    assert (await stock(Product, cap), await stock(ProductVariant, xl)) == (5, 4)

    # A second tap is refused and returns nothing more.
    assert (await _move(client, headers, cancelled["id"], "cancelled")).status_code == 409
    assert await stock(ProductVariant, xl) == 4


async def test_an_order_survives_its_variant_being_deleted(client, auth_headers):
    headers, store_id, slug = await _seller(client, auth_headers)
    dress = await add_product(store_id, "dress", variants=[("S", None, 2), ("XL", None, 4)])
    variants = await variant_ids(dress)
    order = (await place_order(client, slug, [(dress, variants["XL"], 1)], total="10.00")).json()

    # The seller drops XL from the product.
    response = await client.patch(
        f"/api/v1/seller/products/{dress}",
        headers=headers,
        json={"variants": [{"id": str(variants["S"]), "name": "S", "stock_quantity": 2}]},
    )
    assert response.status_code == 200, response.text

    detail = (await client.get(f"/api/v1/seller/orders/{order['id']}", headers=headers)).json()
    [item] = detail["items"]
    assert (item["variant_id"], item["variant_name"], item["unit_price"]) == (None, "XL", "10.00")
    # Rejecting still works; there is no XL stock left to return it to.
    assert (await _move(client, headers, order["id"], "rejected")).status_code == 200
    assert await stock(ProductVariant, variants["S"]) == 2


async def test_order_list_is_newest_first_with_counts_and_filters(client, auth_headers):
    headers, store_id, slug = await _seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=10)
    ids = [
        (await place_order(client, slug, [(cap, None, n)], total=f"{10 * n}.00")).json()["id"]
        for n in (1, 2, 3)
    ]
    await _move(client, headers, ids[0], "accepted")

    body = (await client.get("/api/v1/seller/orders", headers=headers)).json()
    assert [(o["number"], o["status"], o["item_count"]) for o in body["orders"]] == [
        (1003, "pending", 3),
        (1002, "pending", 2),
        (1001, "accepted", 1),
    ]
    assert body["orders"][0]["customer_name"] == "Dara"
    assert (body["counts"]["pending"], body["counts"]["accepted"]) == (2, 1)
    assert body["has_more"] is False

    page = (
        await client.get("/api/v1/seller/orders?status=pending&limit=1", headers=headers)
    ).json()
    assert [o["number"] for o in page["orders"]] == [1003]
    assert page["has_more"] is True
    assert page["counts"]["accepted"] == 1  # counts ignore the status filter


async def test_order_rows_lead_with_the_biggest_line_and_its_photo(client, auth_headers):
    headers, store_id, slug = await _seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=10)
    bag = await add_product(store_id, "bag", stock=10)
    async with unscoped_session() as db:
        (await db.get(Product, bag)).image_urls = ["https://img/bag.jpg"]
        await db.commit()
    # 1 bag ($10) and 3 caps ($30): the caps lead, and caps have no photo.
    await place_order(client, slug, [(bag, None, 1), (cap, None, 3)], total="40.00")
    await place_order(client, slug, [(bag, None, 1)], total="10.00")

    rows = (await client.get("/api/v1/seller/orders", headers=headers)).json()["orders"]
    assert [(o["first_item_name"], o["line_count"], o["first_item_image_url"]) for o in rows] == [
        ("Bag", 1, "https://img/bag.jpg"),
        ("Cap", 2, None),
    ]


async def test_order_detail_items_carry_each_products_photo(client, auth_headers):
    headers, store_id, slug = await _seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=10)
    bag = await add_product(store_id, "bag", stock=10)
    async with unscoped_session() as db:
        (await db.get(Product, bag)).image_urls = ["https://img/bag-1.jpg", "https://img/bag-2.jpg"]
        await db.commit()
    order = (
        await place_order(client, slug, [(bag, None, 1), (cap, None, 1)], total="20.00")
    ).json()

    detail = (await client.get(f"/api/v1/seller/orders/{order['id']}", headers=headers)).json()
    photos = {i["product_id"]: i["image_url"] for i in detail["items"]}
    assert photos == {str(bag): "https://img/bag-1.jpg", str(cap): None}

    # A status change answers with the whole order, photos included.
    moved = (await _move(client, headers, order["id"], "accepted")).json()
    assert {i["product_id"]: i["image_url"] for i in moved["items"]} == photos


async def test_seller_cannot_see_or_change_another_stores_orders(client, auth_headers):
    a_headers, a_store, a_slug = await _seller(client, auth_headers)
    b_headers, _, _ = await _seller(client, auth_headers)
    cap = await add_product(a_store, "cap")
    order = (await place_order(client, a_slug, [(cap, None, 1)], total="10.00")).json()

    assert (await client.get("/api/v1/seller/orders", headers=b_headers)).json()["orders"] == []
    response = await client.get(f"/api/v1/seller/orders/{order['id']}", headers=b_headers)
    assert response.status_code == 404
    assert (await _move(client, b_headers, order["id"], "rejected")).status_code == 404

    detail = await client.get(f"/api/v1/seller/orders/{order['id']}", headers=a_headers)
    assert detail.json()["status"] == "pending"
    assert await stock(Product, cap) == 2


async def test_seller_turns_on_automatic_confirmation(client, auth_headers):
    headers, store_id, slug = await _seller(client, auth_headers)
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    assert store["order_confirmation_mode"] == "manual"

    response = await client.patch(
        "/api/v1/seller/store", headers=headers, json={"order_confirmation_mode": "automatic"}
    )
    assert response.json()["order_confirmation_mode"] == "automatic"

    cap = await add_product(store_id, "cap")
    placed = await place_order(client, slug, [(cap, None, 1)], total="10.00")
    assert placed.json()["status"] == "accepted"
