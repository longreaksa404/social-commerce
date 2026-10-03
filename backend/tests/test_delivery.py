"""Delivery (02_TECHNICAL.md section 7.3) and the shop's delivery and
discount settings."""

from tests.helpers import AREAS, PICKUP, registered_seller, set_delivery, set_discounts


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
