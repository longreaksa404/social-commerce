"""Payments (02_TECHNICAL.md sections 7.2 and 10): the seller's payment
settings, choosing a method at checkout, and what the customer is shown."""

from itertools import product

import pytest

from app.core.errors import AppError
from app.models import Payment, PaymentStatus
from app.services.payment import check_transition, next_statuses
from tests.helpers import (
    BANK,
    KHQR,
    add_product,
    place_order,
    registered_seller,
    set_payments,
    track,
    variant_ids,
)

P = PaymentStatus

# Copied from 02_TECHNICAL.md section 7.2 on purpose, not imported: a
# change to the service's table has to be made here too, deliberately.
# paid -> refunded is in the schema but not allowed in the MVP. Paid or
# failed go back to pending ("Not paid after all", founder's pick 2C,
# 2026-10-09).
EXPECTED = {
    P.PENDING: {P.PAID, P.FAILED},
    P.PAID: {P.PENDING},
    P.FAILED: {P.PENDING},
    P.REFUNDED: set(),
}


@pytest.mark.parametrize(("current", "target"), list(product(P, P)))
def test_every_payment_transition_follows_the_state_machine(current, target):
    if target in EXPECTED[current]:
        check_transition(current, target)
    else:
        with pytest.raises(AppError) as error:
            check_transition(current, target)
        assert (error.value.status_code, error.value.code) == (409, "INVALID_PAYMENT_TRANSITION")


def test_next_payment_statuses_are_what_the_seller_can_record():
    assert next_statuses(Payment(status=P.PENDING)) == [P.PAID, P.FAILED]
    assert next_statuses(Payment(status=P.PAID)) == [P.PENDING]
    assert next_statuses(Payment(status=P.FAILED)) == [P.PENDING]


# --- Settings ----------------------------------------------------------------


async def test_a_new_shop_takes_cash_on_delivery_only(client, auth_headers):
    headers, _, slug = await registered_seller(client, auth_headers)

    settings = (await client.get("/api/v1/seller/store", headers=headers)).json()[
        "payment_settings"
    ]
    assert settings["cod"] == {"enabled": True}
    assert settings["bank_transfer"]["enabled"] is False
    assert settings["khqr"]["enabled"] is False
    assert (await client.get(f"/api/v1/shop/{slug}")).json()["payment_methods"] == ["cod"]


async def test_payments_are_set_up_once_saved(client, auth_headers):
    """For the setup checklist: a new shop hasn't looked at its ways to
    pay; saving them, even cash on delivery only, counts."""
    headers, _, _ = await registered_seller(client, auth_headers)
    before = (await client.get("/api/v1/seller/store", headers=headers)).json()

    saved = await set_payments(client, headers, cod={"enabled": True})

    assert before["payment_set_up"] is False
    assert saved.json()["payment_set_up"] is True


async def test_seller_turns_on_bank_transfer_and_khqr(client, auth_headers):
    headers, _, slug = await registered_seller(client, auth_headers)

    response = await set_payments(
        client, headers, cod={"enabled": False}, bank_transfer=BANK, khqr=KHQR
    )

    assert response.status_code == 200, response.text
    assert response.json()["payment_settings"]["bank_transfer"] == BANK
    shop = (await client.get(f"/api/v1/shop/{slug}")).json()
    assert shop["payment_methods"] == ["bank_transfer", "khqr"]
    assert "000 123 456" not in str(shop)  # account details only come with an order


async def test_turning_a_method_off_keeps_its_details(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)
    await set_payments(client, headers, bank_transfer=BANK)

    response = await set_payments(client, headers, bank_transfer={**BANK, "enabled": False})

    assert response.json()["payment_settings"]["bank_transfer"]["account_number"] == "000 123 456"


async def test_payment_settings_must_be_usable(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)
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
        response = await set_payments(client, headers, **settings)
        assert response.status_code == 422, settings
        assert response.json()["error"]["field"] == field, settings

    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    assert store["payment_settings"]["cod"]["enabled"] is True  # nothing was saved


# --- Checkout ----------------------------------------------------------------


async def test_the_order_gets_a_pending_payment_for_its_total(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await set_payments(client, headers, bank_transfer=BANK)
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
    _, store_id, slug = await registered_seller(client, auth_headers)
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
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await set_payments(client, headers, bank_transfer=BANK)
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
    assert (await track(client, slug, order_id)).json()["payment"]["bank_account"] is None


async def test_order_list_shows_how_each_order_is_paid(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=5)
    await place_order(client, slug, [(cap, None, 1)], total="10.00")

    [row] = (await client.get("/api/v1/seller/orders", headers=headers)).json()["orders"]

    assert (row["payment_method"], row["payment_status"]) == ("cod", "pending")


# --- Recording a payment -----------------------------------------------------


async def _record(client, headers, order_id, status, reference=None):
    return await client.patch(
        f"/api/v1/seller/orders/{order_id}/payment",
        headers=headers,
        json={"status": status, "reference": reference},
    )


async def test_seller_marks_a_transfer_paid_and_can_then_complete(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await set_payments(client, headers, bank_transfer=BANK)
    cap = await add_product(store_id, "cap", stock=5)
    order = (
        await place_order(
            client, slug, [(cap, None, 1)], total="10.00", payment_method="bank_transfer"
        )
    ).json()
    for status in ("accepted", "processing", "ready", "shipped", "delivered"):
        await client.patch(
            f"/api/v1/seller/orders/{order['id']}/status", headers=headers, json={"status": status}
        )
    for status in ("assigned", "picked_up", "in_transit", "delivered"):
        await client.patch(
            f"/api/v1/seller/orders/{order['id']}/delivery",
            headers=headers,
            json={"status": status},
        )
    detail = (await client.get(f"/api/v1/seller/orders/{order['id']}", headers=headers)).json()
    assert detail["next_statuses"] == []  # not paid yet
    assert detail["payment"]["next_statuses"] == ["paid", "failed"]

    response = await _record(client, headers, order["id"], "paid", "ABA 14:05, ...123")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["payment"]["status"] == "paid"
    assert body["payment"]["reference"] == "ABA 14:05, ...123"
    assert body["payment"]["paid_at"] is not None
    assert body["payment"]["next_statuses"] == ["pending"]  # "Not paid after all"
    assert (body["status"], body["next_statuses"]) == ("delivered", ["completed"])
    # The customer sees it's paid, and no longer gets the account to pay to.
    tracked = (await track(client, slug, order["id"])).json()["payment"]
    assert (tracked["status"], tracked["bank_account"]) == ("paid", None)

    again = await _record(client, headers, order["id"], "failed")
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "INVALID_PAYMENT_TRANSITION"


async def test_not_paid_after_all_puts_it_back_and_the_customer_can_pay(client, auth_headers):
    """The seller tapped Paid on the wrong order, or the transfer never
    arrived: the payment goes back to pending, at any time."""
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await set_payments(client, headers, bank_transfer=BANK)
    cap = await add_product(store_id, "cap", stock=5)
    order = (
        await place_order(
            client, slug, [(cap, None, 1)], total="10.00", payment_method="bank_transfer"
        )
    ).json()
    await _record(client, headers, order["id"], "paid", "ABA 14:05")

    undone = await _record(client, headers, order["id"], "pending")

    assert undone.status_code == 200, undone.text
    payment = undone.json()["payment"]
    assert (payment["status"], payment["paid_at"], payment["reference"]) == ("pending", None, None)
    assert payment["next_statuses"] == ["paid", "failed"]
    assert undone.json()["status"] == "pending"  # the order is left alone
    # The customer is shown how to pay again.
    tracked = (await track(client, slug, order["id"])).json()["payment"]
    assert tracked["bank_account"] is not None
    # A failed one goes back too.
    await _record(client, headers, order["id"], "failed")
    assert (await _record(client, headers, order["id"], "pending")).status_code == 200


async def test_not_paid_after_all_needs_a_recorded_payment(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=5)
    order = (await place_order(client, slug, [(cap, None, 1)], total="10.00")).json()

    response = await _record(client, headers, order["id"], "pending")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "INVALID_PAYMENT_TRANSITION"


async def test_recording_a_payment_leaves_the_order_status_alone(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=5)
    order = (await place_order(client, slug, [(cap, None, 1)], total="10.00")).json()

    body = (await _record(client, headers, order["id"], "failed")).json()

    assert (body["status"], body["payment"]["status"]) == ("pending", "failed")
    assert body["payment"]["paid_at"] is None


async def test_seller_cannot_record_another_stores_payment(client, auth_headers):
    a_headers, a_store, a_slug = await registered_seller(client, auth_headers)
    b_headers, _, _ = await registered_seller(client, auth_headers)
    cap = await add_product(a_store, "cap", stock=5)
    order = (await place_order(client, a_slug, [(cap, None, 1)], total="10.00")).json()

    assert (await _record(client, b_headers, order["id"], "paid")).status_code == 404

    detail = (await client.get(f"/api/v1/seller/orders/{order['id']}", headers=a_headers)).json()
    assert detail["payment"]["status"] == "pending"
