"""Settings → Orders → not taking orders for a while (e.g. Khmer New Year)."""

from datetime import date

import pytest

from app.core import clock
from tests.helpers import add_product, place_order, registered_seller

TODAY = date(2027, 4, 13)


@pytest.fixture(autouse=True)
def today(monkeypatch):
    """Phnom Penh's date, fixed: the eve of Khmer New Year 2027."""
    monkeypatch.setattr(clock, "today", lambda: TODAY)


async def _pause(client, headers, resume_on=None, paused=True):
    return await client.patch(
        "/api/v1/seller/store",
        headers=headers,
        json={"orders_paused": paused, "orders_resume_on": resume_on},
    )


async def test_paused_shop_can_be_browsed_but_refuses_orders(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=5)

    paused = await _pause(client, headers, "2027-04-17")
    shop = (await client.get(f"/api/v1/shop/{slug}")).json()
    products = await client.get(f"/api/v1/shop/{slug}/products")
    order = await place_order(client, slug, [(cap, None, 1)], total="10.00")

    assert paused.status_code == 200, paused.text
    assert paused.json()["orders_paused"] is True
    assert paused.json()["orders_resume_on"] == "2027-04-17"
    assert (shop["orders_paused"], shop["orders_resume_on"]) == (True, "2027-04-17")
    assert products.status_code == 200 and len(products.json()) == 1
    assert order.status_code == 409
    assert order.json()["error"]["code"] == "ORDERS_PAUSED"


async def test_it_reopens_by_itself_on_the_day_set(client, auth_headers, monkeypatch):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=5)
    await _pause(client, headers, "2027-04-17")

    monkeypatch.setattr(clock, "today", lambda: date(2027, 4, 16))
    still_closed = (await client.get(f"/api/v1/shop/{slug}")).json()["orders_paused"]
    monkeypatch.setattr(clock, "today", lambda: date(2027, 4, 17))
    shop = (await client.get(f"/api/v1/shop/{slug}")).json()
    settings = (await client.get("/api/v1/seller/store", headers=headers)).json()
    order = await place_order(client, slug, [(cap, None, 1)], total="10.00")

    assert still_closed is True
    assert (shop["orders_paused"], shop["orders_resume_on"]) == (False, None)
    assert (settings["orders_paused"], settings["orders_resume_on"]) == (False, None)
    assert order.status_code == 201, order.text


async def test_paused_without_a_date_stays_paused_until_turned_back_on(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=5)
    await _pause(client, headers)

    refused = await place_order(client, slug, [(cap, None, 1)], total="10.00")
    reopened = await _pause(client, headers, "2027-04-17", paused=False)
    order = await place_order(client, slug, [(cap, None, 1)], total="10.00")

    assert refused.status_code == 409
    # Turning it back on forgets the date.
    assert (reopened.json()["orders_paused"], reopened.json()["orders_resume_on"]) == (False, None)
    assert order.status_code == 201


@pytest.mark.parametrize("day", ["2027-04-13", "2027-04-01"])
async def test_reopening_day_must_be_after_today(client, auth_headers, day):
    headers, _, _ = await registered_seller(client, auth_headers)

    response = await _pause(client, headers, day)

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "INVALID_RESUME_DATE",
        "message": "Choose a day after today.",
        "field": "orders_resume_on",
    }


async def test_other_settings_leave_the_pause_alone(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)
    await _pause(client, headers, "2027-04-17")

    renamed = await client.patch("/api/v1/seller/store", headers=headers, json={"name": "New"})

    assert (renamed.json()["orders_paused"], renamed.json()["orders_resume_on"]) == (
        True,
        "2027-04-17",
    )


async def test_one_shop_pausing_leaves_other_shops_open(client, auth_headers):
    a_headers, _, a_slug = await registered_seller(client, auth_headers)
    _, b_id, b_slug = await registered_seller(client, auth_headers)
    cap = await add_product(b_id, "cap", stock=5)

    await _pause(client, a_headers)

    assert (await client.get(f"/api/v1/shop/{a_slug}")).json()["orders_paused"] is True
    assert (await client.get(f"/api/v1/shop/{b_slug}")).json()["orders_paused"] is False
    order = await place_order(client, b_slug, [(cap, None, 1)], total="10.00")
    assert order.status_code == 201
