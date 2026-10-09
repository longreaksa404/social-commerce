"""Orders that came by chat, added by the seller (founder's pick 3A,
2026-10-09): checkout's prices, stock and totals, starting accepted."""

from sqlalchemy import select

from app.db.session import tenant_session
from app.models import NotificationChannel, NotificationLog, Product
from tests.helpers import DELIVERY, add_product, registered_seller, set_delivery, stock

ORDERS = "/api/v1/seller/orders"


def _chat_order(items, total, **overrides) -> dict:
    """items: (product_id, variant_id, quantity) tuples."""
    return {
        "name": "Sokha",
        "phone": "098 765 432",
        "items": [
            {"product_id": str(p), "variant_id": v and str(v), "quantity": q} for p, v, q in items
        ],
        "payment_method": "cod",
        "delivery_method": "seller_delivery",
        "delivery_address": "Toul Kork",
        "expected_total": total,
        **overrides,
    }


async def _web_events(store_id) -> list[str]:
    async with tenant_session(store_id) as db:
        rows = await db.scalars(
            select(NotificationLog.event_type).where(
                NotificationLog.store_id == store_id,
                NotificationLog.channel == NotificationChannel.WEB,
            )
        )
        return list(rows)


async def test_seller_adds_an_order_from_a_chat(client, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    await set_delivery(client, headers, **DELIVERY)
    shirt = await add_product(store_id, "shirt", stock=10)  # $10.00

    response = await client.post(
        ORDERS, headers=headers, json=_chat_order([(shirt, None, 2)], "21.50")
    )

    assert response.status_code == 201, response.text
    order = response.json()
    # The shop's own prices and delivery fee, like checkout.
    assert (order["subtotal"], order["delivery_fee"], order["total"]) == ("20.00", "1.50", "21.50")
    # Agreed in the chat: accepted already, and marked as from a chat.
    assert (order["status"], order["source"]) == ("accepted", "chat")
    assert (order["payment"]["status"], order["delivery"]["status"]) == ("pending", "not_assigned")
    assert order["customer"]["phone"] == "098765432"
    assert order["delivery_address"] == "Toul Kork"
    assert await stock(Product, shirt) == 8
    # The seller did it: nothing new on the bell.
    assert await _web_events(store_id) == []


async def test_a_chat_order_finds_the_customer_by_phone(client, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt", stock=10)
    first = (
        await client.post(ORDERS, headers=headers, json=_chat_order([(shirt, None, 1)], "10.00"))
    ).json()

    second = (
        await client.post(
            ORDERS,
            headers=headers,
            json=_chat_order([(shirt, None, 1)], "10.00", phone="+855 98 765 432"),
        )
    ).json()

    assert second["customer"]["id"] == first["customer"]["id"]
    assert second["number"] == first["number"] + 1


async def test_a_chat_order_is_taken_while_the_shop_is_paused(client, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt", stock=10)
    await client.patch("/api/v1/seller/store", headers=headers, json={"orders_paused": True})

    response = await client.post(
        ORDERS, headers=headers, json=_chat_order([(shirt, None, 1)], "10.00")
    )

    assert response.status_code == 201, response.text


async def test_a_chat_order_checks_stock_and_the_total_like_checkout(client, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt", stock=1)

    too_many = await client.post(
        ORDERS, headers=headers, json=_chat_order([(shirt, None, 2)], "20.00")
    )
    wrong_total = await client.post(
        ORDERS, headers=headers, json=_chat_order([(shirt, None, 1)], "9.00")
    )

    assert too_many.status_code == 409
    assert too_many.json()["error"]["code"] == "PRODUCT_OUT_OF_STOCK"
    assert wrong_total.status_code == 409
    assert wrong_total.json()["error"]["code"] == "ORDER_TOTAL_CHANGED"
    assert await stock(Product, shirt) == 1


async def test_a_chat_order_that_sells_out_puts_low_stock_on_the_bell(client, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt", stock=1)

    await client.post(ORDERS, headers=headers, json=_chat_order([(shirt, None, 1)], "10.00"))

    assert await _web_events(store_id) == ["low_stock"]


async def test_a_chat_order_cannot_take_another_shops_product(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)
    _, other_store, _ = await registered_seller(client, auth_headers)
    theirs = await add_product(other_store, "shirt", stock=5)

    response = await client.post(
        ORDERS, headers=headers, json=_chat_order([(theirs, None, 1)], "10.00")
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PRODUCT_UNAVAILABLE"
    assert await stock(Product, theirs) == 5


async def test_a_chat_order_lands_only_in_the_sellers_own_shop(client, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    other_headers, _, _ = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt", stock=5)

    order = (
        await client.post(ORDERS, headers=headers, json=_chat_order([(shirt, None, 1)], "10.00"))
    ).json()

    assert (await client.get(f"{ORDERS}/{order['id']}", headers=other_headers)).status_code == 404
    listed = (await client.get(ORDERS, headers=other_headers)).json()["orders"]
    assert listed == []


async def test_a_link_cannot_be_named_chat(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)

    response = await client.post(
        "/api/v1/seller/links", headers=headers, json={"target_type": "store", "source": "Chat"}
    )

    assert response.status_code == 422
