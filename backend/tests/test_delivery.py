"""Delivery (02_TECHNICAL.md section 7.3) and the shop's delivery and
discount settings."""

from itertools import product

import pytest

from app.core.errors import AppError
from app.models import Delivery, DeliveryMethod, DeliveryStatus, Product
from app.services.delivery import check_transition, next_statuses
from tests.helpers import (
    DELIVERY,
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


async def test_a_new_shop_delivers_itself_for_free_and_has_no_discounts(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)

    store = (await client.get("/api/v1/seller/store", headers=headers)).json()

    assert store["delivery_settings"] == {
        "fee": "0.00",
        "free_from_amount": None,
        "free_from_items": None,
        "own_delivery": {"enabled": True},
        "couriers": [],
        "pickup": {"enabled": False, "address": ""},
    }
    assert store["discount_settings"] == {"rules": []}
    # So the dashboard reminds the seller that delivery is free until set.
    assert store["delivery_set_up"] is False


async def test_delivery_is_set_up_once_saved_even_if_kept_free(client, auth_headers):
    """A seller who saves free delivery on purpose isn't reminded again."""
    headers, _, _ = await registered_seller(client, auth_headers)

    saved = await set_delivery(client, headers, fee="0")
    # Saving another part of the settings doesn't count.
    other = await client.patch("/api/v1/seller/store", headers=headers, json={"name": "Renamed"})

    assert saved.json()["delivery_set_up"] is True
    assert other.json()["delivery_set_up"] is True


async def test_saving_other_settings_leaves_delivery_not_set_up(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)

    response = await client.patch(
        "/api/v1/seller/store",
        headers=headers,
        json={"payment_settings": {"cod": {"enabled": True}}, "name": "Renamed"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["delivery_set_up"] is False


async def test_seller_sets_fee_couriers_pickup_and_discounts_and_the_shop_shows_them(
    client, auth_headers
):
    headers, _, slug = await registered_seller(client, auth_headers)

    response = await set_delivery(client, headers, **DELIVERY, pickup=PICKUP)
    assert response.status_code == 200, response.text
    response = await set_discounts(client, headers, ("40", "5"), ("80", "12"))
    assert response.status_code == 200, response.text

    shop = (await client.get(f"/api/v1/shop/{slug}")).json()
    assert shop["delivery"] == {
        "fee": "1.50",
        "free_from_amount": "30.00",
        "free_from_items": 3,
        "own_delivery": True,
        "couriers": ["J&T Express", "VET Express"],
        "pickup": {"address": "Shop 12, Orussey Market"},
    }
    assert shop["discounts"] == [
        {"min_subtotal": "40.00", "amount_off": "5.00"},
        {"min_subtotal": "80.00", "amount_off": "12.00"},
    ]


async def test_couriers_only_shop_has_no_own_delivery(client, auth_headers):
    headers, _, slug = await registered_seller(client, auth_headers)

    await set_delivery(client, headers, own_delivery={"enabled": False}, couriers=["VET Express"])

    delivery = (await client.get(f"/api/v1/shop/{slug}")).json()["delivery"]
    assert (delivery["own_delivery"], delivery["couriers"]) == (False, ["VET Express"])


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
    nothing_on = await set_delivery(client, headers, own_delivery={"enabled": False})
    same_courier = await set_delivery(client, headers, couriers=["VET Express", " vet express "])
    no_name = await set_delivery(client, headers, couriers=[" "])
    negative = await set_delivery(client, headers, fee="-1")

    assert _error(no_address) == (422, "delivery_settings.pickup.address")
    assert _error(nothing_on) == (422, "delivery_settings")
    assert _error(same_courier) == (422, "delivery_settings.couriers.1")
    assert no_name.status_code == 422
    assert negative.status_code == 422
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    assert store["delivery_settings"]["couriers"] == []  # nothing saved


async def test_discounts_that_cannot_work_are_refused(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)

    nothing_off = await set_discounts(client, headers, ("40", "0"))
    more_than_bill = await set_discounts(client, headers, ("10", "5"), ("4", "5"))

    assert _error(nothing_off) == (422, "discount_settings.rules.0.amount_off")
    assert _error(more_than_bill) == (422, "discount_settings.rules.1.amount_off")


# --- Checkout ----------------------------------------------------------------


async def _shop(client, auth_headers, *, stock=10):
    """Dara's shop: $1.50 delivery (own or J&T / VET), free from $30 or 3
    items, pickup, and $5 off from $40. Products cost $10.
    (headers, slug, product id)"""
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await set_delivery(client, headers, **DELIVERY, pickup=PICKUP)
    await set_discounts(client, headers, ("40", "5"))
    return headers, slug, await add_product(store_id, "shirt", stock=stock)


async def test_delivery_adds_the_shops_fee(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)

    response = await place_order(client, slug, [(shirt, None, 1)], total="11.50")

    assert response.status_code == 201, response.text
    order = response.json()
    assert (order["subtotal"], order["discount"], order["delivery_fee"], order["total"]) == (
        "10.00",
        "0.00",
        "1.50",
        "11.50",
    )
    assert order["payment"]["amount"] == "11.50"
    assert order["delivery"] == {
        "method": "seller_delivery",
        "status": "not_assigned",
        "courier": None,
        "pickup_address": None,
    }
    listed = (await client.get("/api/v1/seller/orders", headers=headers)).json()["orders"][0]
    assert (listed["delivery_method"], listed["delivery_status"]) == (
        "seller_delivery",
        "not_assigned",
    )


async def test_customer_picks_a_courier_and_shares_their_location(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)

    response = await place_order(
        client,
        slug,
        [(shirt, None, 1)],
        total="11.50",
        courier="VET Express",
        address=None,
        lat="10.9908321",
        lng="104.7849",
        address_note="Blue gate, next to the pagoda",
    )

    assert response.status_code == 201, response.text
    assert response.json()["delivery"]["courier"] == "VET Express"
    seller_view = (
        await client.get(f"/api/v1/seller/orders/{response.json()['id']}", headers=headers)
    ).json()
    assert seller_view["delivery"]["courier"] == "VET Express"
    assert (seller_view["delivery_lat"], seller_view["delivery_lng"]) == ("10.990832", "104.784900")
    assert seller_view["delivery_address"] is None
    assert seller_view["delivery_address_note"] == "Blue gate, next to the pagoda"


async def test_free_delivery_and_discount_at_checkout(client, auth_headers):
    _, slug, shirt = await _shop(client, auth_headers)

    # 4 shirts: $40 of items, $5 off, delivery free (from $30 / 3 items).
    response = await place_order(client, slug, [(shirt, None, 4)], total="35.00")

    assert response.status_code == 201, response.text
    order = response.json()
    assert (order["discount"], order["delivery_fee"], order["total"]) == ("5.00", "0.00", "35.00")
    assert order["payment"]["amount"] == "35.00"


async def test_pickup_needs_no_address_and_shows_where_to_collect(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)
    await place_order(client, slug, [(shirt, None, 1)], total="11.50")

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


async def test_pickup_ignores_delivery_details_sent_with_it(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)

    order = (
        await place_order(
            client,
            slug,
            [(shirt, None, 1)],
            total="10.00",
            delivery_method="pickup",
            courier="VET Express",
            lat="11.5",
            lng="104.9",
        )
    ).json()

    seller_view = (await client.get(f"/api/v1/seller/orders/{order['id']}", headers=headers)).json()
    assert seller_view["delivery_address"] is None
    assert seller_view["delivery_lat"] is None
    assert seller_view["delivery"]["courier"] is None


async def test_checkout_refuses_a_delivery_choice_that_does_not_work(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)
    line = [(shirt, None, 1)]

    nowhere = await place_order(client, slug, line, total="11.50", address=None)
    half_gps = await place_order(client, slug, line, total="11.50", address=None, lat="11.5")
    unknown_courier = await place_order(client, slug, line, total="11.50", courier="Grab")
    await set_delivery(
        client, headers, **{**DELIVERY, "own_delivery": {"enabled": False}}
    )  # couriers only, pickup off now
    own_gone = await place_order(client, slug, line, total="11.50")
    pickup_off = await place_order(
        client, slug, line, total="10.00", delivery_method="pickup", address=None
    )

    assert _error(nowhere) == (422, "delivery_address")
    assert _error(half_gps) == (422, "delivery_lat")
    assert _error(unknown_courier) == (409, "courier")
    assert unknown_courier.json()["error"]["code"] == "DELIVERY_OPTION_UNAVAILABLE"
    assert _error(own_gone) == (409, "courier")
    assert _error(pickup_off) == (409, "delivery_method")
    assert pickup_off.json()["error"]["code"] == "DELIVERY_METHOD_UNAVAILABLE"
    assert await stock(Product, shirt) == 10  # nothing taken


async def test_a_fee_changed_since_the_cart_was_opened_refuses_the_order(client, auth_headers):
    headers, slug, shirt = await _shop(client, auth_headers)
    await set_delivery(client, headers, **{**DELIVERY, "fee": "2.00"})

    # The customer was shown $1.50 delivery.
    response = await place_order(client, slug, [(shirt, None, 1)], total="11.50")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORDER_TOTAL_CHANGED"
    assert await stock(Product, shirt) == 10


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
    order = (await place_order(client, slug, [(shirt, None, 1)], total="11.50")).json()

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
    order = (await place_order(client, slug, [(shirt, None, 1)], total="11.50")).json()

    response = await _deliver(client, other_headers, order["id"], "assigned")

    assert response.status_code == 404
    assert (await track(client, slug, order["id"])).json()["delivery"]["status"] == "not_assigned"
