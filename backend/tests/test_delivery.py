"""Delivery (02_TECHNICAL.md section 7.3) and the shop's delivery and
discount settings."""

from itertools import product

import pytest

from app.core.errors import AppError
from app.models import Delivery, DeliveryMethod, DeliveryStatus, Product
from app.services.delivery import check_transition, next_statuses
from tests.helpers import (
    AREAS,
    PICKUP,
    add_product,
    place_order,
    registered_seller,
    set_delivery,
    set_discounts,
    stock,
    track,
)


def _error(response):
    return response.status_code, response.json()["error"]["field"]


# --- Settings ----------------------------------------------------------------


async def test_a_new_shop_delivers_for_free_and_has_no_discounts(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)

    store = (await client.get("/api/v1/seller/store", headers=headers)).json()

    assert store["delivery_settings"] == {
        "seller_delivery": {
            "enabled": True,
            "areas": [],
            "free_from_amount": None,
            "free_from_items": None,
        },
        "pickup": {"enabled": False, "address": ""},
    }
    assert store["discount_settings"] == {"rules": []}


async def test_seller_sets_areas_pickup_and_discounts_and_the_shop_shows_them(client, auth_headers):
    headers, _, slug = await registered_seller(client, auth_headers)

    response = await set_delivery(client, headers, seller_delivery=AREAS, pickup=PICKUP)
    assert response.status_code == 200, response.text
    response = await set_discounts(client, headers, ("40", "5"), ("80", "12"))
    assert response.status_code == 200, response.text

    shop = (await client.get(f"/api/v1/shop/{slug}")).json()
    assert shop["delivery"] == {
        "seller_delivery": {
            "areas": AREAS["areas"],
            "free_from_amount": "30.00",
            "free_from_items": 3,
        },
        "pickup": {"address": "Shop 12, Orussey Market"},
    }
    assert shop["discounts"] == [
        {"min_subtotal": "40.00", "amount_off": "5.00"},
        {"min_subtotal": "80.00", "amount_off": "12.00"},
    ]


async def test_pickup_only_shop_offers_no_delivery(client, auth_headers):
    headers, _, slug = await registered_seller(client, auth_headers)

    await set_delivery(client, headers, seller_delivery={"enabled": False}, pickup=PICKUP)

    delivery = (await client.get(f"/api/v1/shop/{slug}")).json()["delivery"]
    assert delivery["seller_delivery"] is None
    assert delivery["pickup"] == {"address": "Shop 12, Orussey Market"}


async def test_turning_pickup_off_keeps_its_address(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)

    response = await set_delivery(client, headers, pickup={**PICKUP, "enabled": False})

    assert response.json()["delivery_settings"]["pickup"] == {
        "enabled": False,
        "address": "Shop 12, Orussey Market",
    }


async def test_delivery_settings_that_cannot_work_are_refused(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)

    no_address = await set_delivery(client, headers, pickup={"enabled": True})
    nothing_on = await set_delivery(client, headers, seller_delivery={"enabled": False})
    same_name = await set_delivery(
        client,
        headers,
        seller_delivery={
            "areas": [{"name": "Phnom Penh", "fee": "1"}, {"name": " phnom penh ", "fee": "2"}]
        },
    )
    no_name = await set_delivery(client, headers, seller_delivery={"areas": [{"name": " "}]})
    negative = await set_delivery(
        client, headers, seller_delivery={"areas": [{"name": "Phnom Penh", "fee": "-1"}]}
    )

    assert _error(no_address) == (422, "delivery_settings.pickup.address")
    assert _error(nothing_on) == (422, "delivery_settings")
    assert _error(same_name) == (422, "delivery_settings.seller_delivery.areas.1.name")
    assert no_name.status_code == 422
    assert negative.status_code == 422
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    assert store["delivery_settings"]["seller_delivery"]["areas"] == []  # nothing saved


async def test_discounts_that_cannot_work_are_refused(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)

    nothing_off = await set_discounts(client, headers, ("40", "0"))
    more_than_bill = await set_discounts(client, headers, ("10", "5"), ("4", "5"))

    assert _error(nothing_off) == (422, "discount_settings.rules.0.amount_off")
    assert _error(more_than_bill) == (422, "discount_settings.rules.1.amount_off")


# --- Checkout ----------------------------------------------------------------


async def _shop(client, auth_headers, *, stock=10):
    """Dara's shop: areas, free delivery from $30 or 3 items, pickup, and
    $5 off from $40. Products cost $10. (headers, slug, product id)"""
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await set_delivery(client, headers, seller_delivery=AREAS, pickup=PICKUP)
    await set_discounts(client, headers, ("40", "5"))
    return headers, slug, await add_product(store_id, "shirt", stock=stock)


async def test_delivery_to_an_area_adds_its_fee(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)

    response = await place_order(client, slug, [(shirt, None, 1)], total="12.50", area="Provinces")

    assert response.status_code == 201, response.text
    order = response.json()
    assert (order["subtotal"], order["discount"], order["delivery_fee"], order["total"]) == (
        "10.00",
        "0.00",
        "2.50",
        "12.50",
    )
    assert order["payment"]["amount"] == "12.50"
    assert order["delivery"] == {
        "method": "seller_delivery",
        "status": "not_assigned",
        "area_name": "Provinces",
        "pickup_address": None,
    }
    seller_view = (await client.get(f"/api/v1/seller/orders/{order['id']}", headers=headers)).json()
    assert seller_view["delivery_address"] == "St 271, Phnom Penh"
    assert seller_view["delivery"]["area_name"] == "Provinces"
    listed = (await client.get("/api/v1/seller/orders", headers=headers)).json()["orders"][0]
    assert (listed["delivery_method"], listed["delivery_status"]) == (
        "seller_delivery",
        "not_assigned",
    )


async def test_free_delivery_and_discount_at_checkout(client, auth_headers):
    _, slug, shirt = await _shop(client, auth_headers)

    # 4 shirts: $40 of items, $5 off, delivery free (from $30 / 3 items).
    response = await place_order(client, slug, [(shirt, None, 4)], total="35.00", area="Provinces")

    assert response.status_code == 201, response.text
    order = response.json()
    assert (order["discount"], order["delivery_fee"], order["total"]) == ("5.00", "0.00", "35.00")
    assert order["payment"]["amount"] == "35.00"


async def test_pickup_needs_no_address_and_shows_where_to_collect(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)
    await place_order(client, slug, [(shirt, None, 1)], total="11.50", area="Phnom Penh")

    response = await place_order(
        client, slug, [(shirt, None, 1)], total="10.00", delivery_method="pickup", address=None
    )

    assert response.status_code == 201, response.text
    order = response.json()
    assert order["delivery_fee"] == "0.00"
    assert order["delivery"]["pickup_address"] == "Shop 12, Orussey Market"
    seller_view = (await client.get(f"/api/v1/seller/orders/{order['id']}", headers=headers)).json()
    assert seller_view["delivery_address"] is None
    # The customer's saved address is the one from their last delivery.
    assert seller_view["customer"]["address"] == "St 271, Phnom Penh"

    await client.patch(
        f"/api/v1/seller/orders/{order['id']}/status", headers=headers, json={"status": "rejected"}
    )
    assert (await track(client, slug, order["id"])).json()["delivery"]["pickup_address"] is None


async def test_pickup_ignores_an_address_sent_with_it(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)

    order = (
        await place_order(client, slug, [(shirt, None, 1)], total="10.00", delivery_method="pickup")
    ).json()

    seller_view = (await client.get(f"/api/v1/seller/orders/{order['id']}", headers=headers)).json()
    assert seller_view["delivery_address"] is None


async def test_checkout_refuses_a_delivery_choice_that_does_not_work(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)
    line = [(shirt, None, 1)]

    no_address = await place_order(
        client, slug, line, total="11.50", area="Phnom Penh", address=None
    )
    no_area = await place_order(client, slug, line, total="10.00")
    old_area = await place_order(client, slug, line, total="11.50", area="Takeo")
    await set_delivery(client, headers, seller_delivery=AREAS)  # pickup off now
    pickup_off = await place_order(
        client, slug, line, total="10.00", delivery_method="pickup", address=None
    )

    assert _error(no_address) == (422, "delivery_address")
    assert _error(no_area) == (422, "delivery_area")
    assert _error(old_area) == (409, "delivery_area")
    assert old_area.json()["error"]["code"] == "DELIVERY_AREA_UNAVAILABLE"
    assert _error(pickup_off) == (409, "delivery_method")
    assert pickup_off.json()["error"]["code"] == "DELIVERY_METHOD_UNAVAILABLE"
    assert await stock(Product, shirt) == 10  # nothing taken


async def test_a_fee_changed_since_the_cart_was_opened_refuses_the_order(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)
    raised = {**AREAS, "areas": [{"name": "Phnom Penh", "fee": "2.00"}]}
    await set_delivery(client, headers, seller_delivery=raised)

    # The customer was shown $1.50 delivery.
    response = await place_order(client, slug, [(shirt, None, 1)], total="11.50", area="Phnom Penh")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORDER_TOTAL_CHANGED"
    assert await stock(Product, shirt) == 10


async def test_a_shop_without_areas_takes_orders_without_one(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    shirt = await add_product(store_id, "shirt")

    order = (await place_order(client, slug, [(shirt, None, 1)], total="10.00")).json()
    with_area = await place_order(client, slug, [(shirt, None, 1)], total="10.00", area="Takeo")

    assert (order["delivery_fee"], order["delivery"]["area_name"]) == ("0.00", None)
    assert with_area.json()["error"]["code"] == "DELIVERY_AREA_UNAVAILABLE"


# --- State machine (02 section 7.3) ------------------------------------------

D = DeliveryStatus

# Copied from 02_TECHNICAL.md section 7.3 on purpose, not imported: a
# change to the service's table has to be made here too, deliberately.
# failed -> assigned is the retry (decided 2026-10-03).
EXPECTED = {
    DeliveryMethod.SELLER_DELIVERY: {
        D.NOT_ASSIGNED: {D.ASSIGNED},
        D.ASSIGNED: {D.PICKED_UP},
        D.PICKED_UP: {D.IN_TRANSIT},
        D.IN_TRANSIT: {D.DELIVERED, D.FAILED},
        D.DELIVERED: set(),
        D.FAILED: {D.ASSIGNED},
    },
    DeliveryMethod.PICKUP: {
        D.NOT_ASSIGNED: {D.DELIVERED},
        D.ASSIGNED: set(),
        D.PICKED_UP: set(),
        D.IN_TRANSIT: set(),
        D.DELIVERED: set(),
        D.FAILED: set(),
    },
}


@pytest.mark.parametrize(("method", "current", "target"), list(product(DeliveryMethod, D, D)))
def test_every_delivery_transition_follows_the_state_machine(method, current, target):
    if target in EXPECTED[method][current]:
        check_transition(method, current, target)
    else:
        with pytest.raises(AppError) as error:
            check_transition(method, current, target)
        assert (error.value.status_code, error.value.code) == (409, "INVALID_DELIVERY_TRANSITION")


def test_next_delivery_statuses_are_what_the_seller_can_do():
    seller = DeliveryMethod.SELLER_DELIVERY
    assert next_statuses(Delivery(method=seller, status=D.IN_TRANSIT)) == [D.DELIVERED, D.FAILED]
    assert next_statuses(Delivery(method=seller, status=D.FAILED)) == [D.ASSIGNED]
    assert next_statuses(Delivery(method=DeliveryMethod.PICKUP, status=D.NOT_ASSIGNED)) == [
        D.DELIVERED
    ]


async def _deliver(client, headers, order_id, status, note=None):
    return await client.patch(
        f"/api/v1/seller/orders/{order_id}/delivery",
        headers=headers,
        json={"status": status, "assignee_note": note},
    )


async def test_seller_delivers_fails_and_tries_again(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)
    order = (
        await place_order(client, slug, [(shirt, None, 1)], total="11.50", area="Phnom Penh")
    ).json()

    assigned = await _deliver(client, headers, order["id"], "assigned", "Sokha, 012 999 888")
    assert assigned.status_code == 200, assigned.text
    assert assigned.json()["delivery"]["assignee_note"] == "Sokha, 012 999 888"
    assert assigned.json()["delivery"]["next_statuses"] == ["picked_up"]
    await _deliver(client, headers, order["id"], "picked_up")
    await _deliver(client, headers, order["id"], "in_transit")
    failed = (await _deliver(client, headers, order["id"], "failed")).json()
    assert failed["delivery"]["next_statuses"] == ["assigned"]
    assert failed["delivery"]["assignee_note"] == "Sokha, 012 999 888"  # kept

    retry = (await _deliver(client, headers, order["id"], "assigned", "Vibol tomorrow")).json()

    assert retry["delivery"]["status"] == "assigned"
    assert retry["delivery"]["assignee_note"] == "Vibol tomorrow"
    # The order and payment stay where they were (CLAUDE.md hard rule 2).
    assert (retry["status"], retry["payment"]["status"]) == ("pending", "pending")
    tracked = (await track(client, slug, order["id"])).json()["delivery"]
    assert tracked["status"] == "assigned"
    assert "assignee_note" not in tracked  # the seller's note stays theirs


async def test_pickup_goes_straight_to_delivered(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)
    order = (
        await place_order(
            client, slug, [(shirt, None, 1)], total="10.00", delivery_method="pickup", address=None
        )
    ).json()

    skipped = await _deliver(client, headers, order["id"], "assigned")
    collected = await _deliver(client, headers, order["id"], "delivered")

    assert skipped.status_code == 409
    assert skipped.json()["error"]["code"] == "INVALID_DELIVERY_TRANSITION"
    assert collected.status_code == 200
    assert collected.json()["delivery"]["status"] == "delivered"
    assert collected.json()["delivery"]["next_statuses"] == []


async def test_seller_cannot_move_another_stores_delivery(client, auth_headers):
    _, slug, shirt = await _shop(client, auth_headers)
    other_headers, _, _ = await registered_seller(client, auth_headers)
    order = (
        await place_order(client, slug, [(shirt, None, 1)], total="11.50", area="Phnom Penh")
    ).json()

    response = await _deliver(client, other_headers, order["id"], "assigned")

    assert response.status_code == 404
    assert (await track(client, slug, order["id"])).json()["delivery"]["status"] == "not_assigned"
