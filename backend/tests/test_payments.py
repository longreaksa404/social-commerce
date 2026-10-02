"""Payments (02_TECHNICAL.md sections 7.2 and 10): the seller's payment
settings, choosing a method at checkout, and what the customer is shown."""

import uuid

from tests.helpers import add_product, place_order, variant_ids

BANK = {
    "enabled": True,
    "bank_name": "ABA",
    "account_name": "SOK DARA",
    "account_number": "000 123 456",
}
KHQR = {"enabled": True, "bakong_account_id": "dara@aclb", "merchant_name": "SOK DARA"}


async def _seller(client, auth_headers):
    """A registered seller: (headers, store_id, shop slug)."""
    headers = await auth_headers()
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    return headers, uuid.UUID(store["id"]), store["slug"]


async def _set_payments(client, headers, **settings):
    return await client.patch(
        "/api/v1/seller/store", headers=headers, json={"payment_settings": settings}
    )


async def _track(client, slug, order_id, phone="012345678"):
    return await client.get(f"/api/v1/shop/{slug}/orders/{order_id}?phone={phone}")


# --- Settings ----------------------------------------------------------------


async def test_a_new_shop_takes_cash_on_delivery_only(client, auth_headers):
    headers, _, slug = await _seller(client, auth_headers)

    settings = (await client.get("/api/v1/seller/store", headers=headers)).json()[
        "payment_settings"
    ]
    assert settings["cod"] == {"enabled": True}
    assert settings["bank_transfer"]["enabled"] is False
    assert settings["khqr"]["enabled"] is False
    assert (await client.get(f"/api/v1/shop/{slug}")).json()["payment_methods"] == ["cod"]


async def test_seller_turns_on_bank_transfer_and_khqr(client, auth_headers):
    headers, _, slug = await _seller(client, auth_headers)

    response = await _set_payments(
        client, headers, cod={"enabled": False}, bank_transfer=BANK, khqr=KHQR
    )

    assert response.status_code == 200, response.text
    assert response.json()["payment_settings"]["bank_transfer"] == BANK
    shop = (await client.get(f"/api/v1/shop/{slug}")).json()
    assert shop["payment_methods"] == ["bank_transfer", "khqr"]
    assert "000 123 456" not in str(shop)  # account details only come with an order


async def test_turning_a_method_off_keeps_its_details(client, auth_headers):
    headers, _, _ = await _seller(client, auth_headers)
    await _set_payments(client, headers, bank_transfer=BANK)

    response = await _set_payments(client, headers, bank_transfer={**BANK, "enabled": False})

    assert response.json()["payment_settings"]["bank_transfer"]["account_number"] == "000 123 456"


async def test_payment_settings_must_be_usable(client, auth_headers):
    headers, _, _ = await _seller(client, auth_headers)
    cases = [
        (
            {"bank_transfer": {**BANK, "account_number": " "}},
            "payment_settings.bank_transfer.account_number",
        ),
        ({"khqr": {**KHQR, "bakong_account_id": ""}}, "payment_settings.khqr.bakong_account_id"),
        (
            {"khqr": {**KHQR, "bakong_account_id": "dara"}},
            "payment_settings.khqr.bakong_account_id",
        ),
        ({"khqr": {**KHQR, "merchant_name": "សុខ ដារ៉ា"}}, "payment_settings.khqr.merchant_name"),
        (
            {"khqr": {**KHQR, "merchant_name": "A name far too long for KHQR"}},
            "payment_settings.khqr.merchant_name",
        ),
        ({"cod": {"enabled": False}}, "payment_settings"),  # nothing left to pay with
    ]
    for settings, field in cases:
        response = await _set_payments(client, headers, **settings)
        assert response.status_code == 422, settings
        assert response.json()["error"]["field"] == field, settings

    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    assert store["payment_settings"]["cod"]["enabled"] is True  # nothing was saved


# --- Checkout ----------------------------------------------------------------


async def test_the_order_gets_a_pending_payment_for_its_total(client, auth_headers):
    headers, store_id, slug = await _seller(client, auth_headers)
    await _set_payments(client, headers, bank_transfer=BANK)
    cap = await add_product(store_id, "cap", stock=5)
    dress = await add_product(store_id, "dress", variants=[("XL", "12.35", 4)])
    xl = (await variant_ids(dress))["XL"]

    response = await place_order(
        client,
        slug,
        [(cap, None, 3), (dress, xl, 3)],
        total="67.05",  # 3 x 10.00 + 3 x 12.35
        payment_method="bank_transfer",
    )

    assert response.status_code == 201, response.text
    payment = response.json()["payment"]
    assert (payment["method"], payment["status"], payment["amount"]) == (
        "bank_transfer",
        "pending",
        "67.05",
    )
    seller_view = (
        await client.get(f"/api/v1/seller/orders/{response.json()['id']}", headers=headers)
    ).json()["payment"]
    assert (seller_view["amount"], seller_view["paid_at"]) == ("67.05", None)


async def test_checkout_refuses_a_method_the_shop_does_not_take(client, auth_headers):
    _, store_id, slug = await _seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=5)

    response = await place_order(
        client, slug, [(cap, None, 1)], total="10.00", payment_method="khqr"
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PAYMENT_METHOD_UNAVAILABLE"
    assert response.json()["error"]["field"] == "payment_method"


async def test_the_customer_sees_the_bank_account_until_there_is_nothing_to_pay(
    client, auth_headers
):
    headers, store_id, slug = await _seller(client, auth_headers)
    await _set_payments(client, headers, bank_transfer=BANK)
    cap = await add_product(store_id, "cap", stock=5)
    transfer = await place_order(
        client, slug, [(cap, None, 1)], total="10.00", payment_method="bank_transfer"
    )
    cash = await place_order(client, slug, [(cap, None, 1)], total="10.00")

    assert transfer.json()["payment"]["bank_account"] == {
        "bank_name": "ABA",
        "account_name": "SOK DARA",
        "account_number": "000 123 456",
    }
    assert cash.json()["payment"]["bank_account"] is None

    order_id = transfer.json()["id"]
    await client.patch(
        f"/api/v1/seller/orders/{order_id}/status", headers=headers, json={"status": "rejected"}
    )
    assert (await _track(client, slug, order_id)).json()["payment"]["bank_account"] is None


async def test_order_list_shows_how_each_order_is_paid(client, auth_headers):
    headers, store_id, slug = await _seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=5)
    await place_order(client, slug, [(cap, None, 1)], total="10.00")

    [row] = (await client.get("/api/v1/seller/orders", headers=headers)).json()["orders"]

    assert (row["payment_method"], row["payment_status"]) == ("cod", "pending")
