"""The dashboard's notification list (Phase 7): what an order saves, the
unread count on the bell, and marking them read."""

from datetime import datetime

import pytest
from sqlalchemy import select

from app.db.session import tenant_session
from app.models import NotificationLog
from app.services import notifications
from tests.helpers import add_product, place_order, registered_seller, variant_ids

URL = "/api/v1/seller/notifications"


async def listed(client, headers, **params) -> dict:
    response = await client.get(URL, headers=headers, params=params)
    assert response.status_code == 200, response.text
    return response.json()


async def unread(client, headers) -> int:
    return (await client.get(f"{URL}/unread", headers=headers)).json()["unread"]


@pytest.mark.parametrize("mode", ["manual", "automatic"])
async def test_an_order_is_a_notification_without_telegram(client, auth_headers, mode):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await client.patch(
        "/api/v1/seller/store", headers=headers, json={"order_confirmation_mode": mode}
    )
    cap = await add_product(store_id, "cap", stock=20)
    placed = await place_order(client, slug, [(cap, None, 2)], total="20.00", name="Dara")
    assert placed.status_code == 201, placed.text

    body = await listed(client, headers)
    [notification] = body["notifications"]
    assert notification["event_type"] == "new_order"
    assert notification["read"] is False
    assert notification["order"] == {
        "id": placed.json()["id"],
        "number": 1001,
        "customer_name": "Dara",
        "item_count": 2,
        "total": "20.00",
        "currency": "USD",
        "accepted_automatically": mode == "automatic",
    }
    assert notification["items"] == []
    assert body["unread"] == 1
    assert await unread(client, headers) == 1


async def test_low_stock_comes_after_its_order_and_names_the_products(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt", variants=[("XL", None, 6), ("S", None, 1)])
    ids = await variant_ids(shirt)
    placed = await place_order(
        client, slug, [(shirt, ids["XL"], 1), (shirt, ids["S"], 1)], total="20.00"
    )
    assert placed.status_code == 201, placed.text

    order, stock = (await listed(client, headers))["notifications"]
    assert order["event_type"] == "new_order"
    assert stock["event_type"] == "low_stock"
    assert stock["order"] is None
    assert sorted((i["name"], i["left"]) for i in stock["items"]) == [
        ("Shirt (S)", 0),
        ("Shirt (XL)", 5),
    ]
    assert {i["product_id"] for i in stock["items"]} == {str(shirt)}
    assert await unread(client, headers) == 2


async def test_newest_first_a_page_at_a_time(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    for _ in range(3):
        await place_order(client, slug, [(cap, None, 1)], total="10.00")

    first = await listed(client, headers, limit=2)
    assert [n["order"]["number"] for n in first["notifications"]] == [1003, 1002]
    assert first["has_more"] is True
    rest = await listed(client, headers, limit=2, offset=2)
    assert [n["order"]["number"] for n in rest["notifications"]] == [1001]
    assert rest["has_more"] is False


async def test_reading_marks_only_what_was_shown(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    await place_order(client, slug, [(cap, None, 1)], total="10.00")
    await place_order(client, slug, [(cap, None, 1)], total="10.00")
    shown = (await listed(client, headers))["notifications"]
    # An order arrives while the seller is looking at the list.
    await place_order(client, slug, [(cap, None, 1)], total="10.00")

    response = await client.post(
        f"{URL}/read", headers=headers, json={"up_to": shown[0]["created_at"]}
    )
    assert response.status_code == 200, response.text
    assert response.json() == {"unread": 1}
    after = (await listed(client, headers))["notifications"]
    assert [(n["order"]["number"], n["read"]) for n in after] == [
        (1003, False),
        (1002, True),
        (1001, True),
    ]
    # On another device too: the count is the server's.
    assert await unread(client, headers) == 1


async def test_notifications_stay_in_their_store(client, auth_headers):
    a_headers, a_store, a_slug = await registered_seller(client, auth_headers)
    b_headers, b_store, _ = await registered_seller(client, auth_headers)
    cap = await add_product(a_store, "cap", stock=20)
    await place_order(client, a_slug, [(cap, None, 1)], total="10.00")
    shown = (await listed(client, a_headers))["notifications"]

    assert (await listed(client, b_headers))["notifications"] == []
    assert await unread(client, b_headers) == 0
    await client.post(f"{URL}/read", headers=b_headers, json={"up_to": shown[0]["created_at"]})
    assert await unread(client, a_headers) == 1

    # RLS alone: B's session can neither see nor mark A's, even when asked
    # for A's store directly.
    async with tenant_session(b_store) as db:
        assert list(await db.scalars(select(NotificationLog))) == []
        up_to = datetime.fromisoformat(shown[0]["created_at"])
        assert await notifications.mark_read(db, a_store, up_to) == 0
    assert await unread(client, a_headers) == 1


async def test_reading_needs_a_time_with_its_zone(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)
    response = await client.post(f"{URL}/read", headers=headers, json={"up_to": "2026-10-03T10:00"})
    assert response.status_code == 422
