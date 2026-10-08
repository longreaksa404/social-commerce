"""Settings → Alerts: the seller's own low-stock alert level."""

import uuid

import pytest

from app.services import notifications
from tests.helpers import add_product, place_order, registered_seller


@pytest.mark.parametrize(
    ("before", "after", "left"),
    [
        (25, 21, None),  # still above 20
        (22, 20, 20),  # reaches the line
        (30, 3, 3),  # jumps past it
        (20, 19, None),  # already low
        (2, 0, 0),  # sells out
    ],
)
def test_alert_at_the_shops_own_level(before, after, left):
    alert = notifications.stock_alert(uuid.uuid4(), "Phone case", before, after, level=20)
    assert (alert.left if alert else None) == left


async def _low_stock_rows(client, headers) -> list[dict]:
    rows = (await client.get("/api/v1/seller/notifications", headers=headers)).json()
    return [row for row in rows["notifications"] if row["event_type"] == "low_stock"]


async def test_an_order_alerts_at_the_level_the_seller_set(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    saved = await client.patch(
        "/api/v1/seller/store", headers=headers, json={"low_stock_alert": 20}
    )
    case = await add_product(store_id, "case", stock=22)

    placed = await place_order(client, slug, [(case, None, 3)], total="30.00")

    assert saved.json()["low_stock_alert"] == 20
    assert placed.status_code == 201, placed.text
    assert len(await _low_stock_rows(client, headers)) == 1


async def test_a_new_shop_alerts_at_five(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    case = await add_product(store_id, "case", stock=22)

    await place_order(client, slug, [(case, None, 3)], total="30.00")

    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    assert store["low_stock_alert"] == 5
    assert await _low_stock_rows(client, headers) == []


@pytest.mark.parametrize("level", [0, -1, 1000])
async def test_level_out_of_range_is_refused(client, auth_headers, level):
    headers, _, _ = await registered_seller(client, auth_headers)

    response = await client.patch(
        "/api/v1/seller/store", headers=headers, json={"low_stock_alert": level}
    )

    assert response.status_code == 422
    assert response.json()["error"]["field"] == "low_stock_alert"


async def test_one_shops_level_doesnt_change_anothers(client, auth_headers):
    a_headers, _, _ = await registered_seller(client, auth_headers)
    b_headers, b_id, b_slug = await registered_seller(client, auth_headers)
    await client.patch("/api/v1/seller/store", headers=a_headers, json={"low_stock_alert": 50})
    case = await add_product(b_id, "case", stock=22)

    await place_order(client, b_slug, [(case, None, 3)], total="30.00")

    assert await _low_stock_rows(client, b_headers) == []
