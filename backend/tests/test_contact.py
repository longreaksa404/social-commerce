"""Settings → Contact: Telegram, a phone to call and a Facebook page for
Messenger, shown to customers as buttons."""

import pytest

from tests.helpers import registered_seller


async def _contact(client, headers, **fields):
    return await client.patch("/api/v1/seller/store", headers=headers, json=fields)


@pytest.mark.parametrize(
    ("typed", "saved"),
    [
        ("sokhafashion", "sokhafashion"),
        ("Sokha.Fashion", "Sokha.Fashion"),
        ("m.me/sokhafashion", "sokhafashion"),
        ("https://m.me/sokhafashion?ref=post", "sokhafashion"),
        ("https://www.facebook.com/sokhafashion/", "sokhafashion"),
        ("https://m.facebook.com/sokhafashion", "sokhafashion"),
        ("https://www.facebook.com/profile.php?id=100012345678901", "100012345678901"),
        ("@sokhafashion", "sokhafashion"),
        ("", None),
    ],
)
async def test_messenger_page_is_saved_as_its_username(client, auth_headers, typed, saved):
    headers, _, _ = await registered_seller(client, auth_headers)

    response = await _contact(client, headers, messenger_username=typed)

    assert response.status_code == 200, response.text
    assert response.json()["messenger_username"] == saved


@pytest.mark.parametrize("typed", ["sok", "sokha fashion", "facebook.com/sokha/posts/123"])
async def test_not_a_page_username_is_refused_by_its_field(client, auth_headers, typed):
    headers, _, _ = await registered_seller(client, auth_headers)

    response = await _contact(client, headers, messenger_username=typed)

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "VALIDATION_ERROR",
        "message": "Enter your Facebook page's username, e.g. sokhafashion, or its m.me link.",
        "field": "messenger_username",
    }


async def test_phone_is_stored_in_one_form_and_bad_ones_refused(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)

    saved = await _contact(client, headers, contact_phone="+855 12 345 678")
    bad = await _contact(client, headers, contact_phone="call me")
    cleared = await _contact(client, headers, contact_phone="")

    assert saved.json()["contact_phone"] == "012345678"
    assert bad.status_code == 422
    assert bad.json()["error"]["field"] == "contact_phone"
    assert bad.json()["error"]["message"] == "Enter a valid phone number."
    assert cleared.json()["contact_phone"] is None


async def test_customers_see_each_way_to_reach_the_shop_and_only_its_own(client, auth_headers):
    a_headers, _, a_slug = await registered_seller(client, auth_headers)
    _, _, b_slug = await registered_seller(client, auth_headers)

    await _contact(
        client,
        a_headers,
        telegram_username="sokha_shop",
        contact_phone="012 345 678",
        messenger_username="sokhafashion",
    )
    a = (await client.get(f"/api/v1/shop/{a_slug}")).json()
    b = (await client.get(f"/api/v1/shop/{b_slug}")).json()

    assert (a["telegram_username"], a["contact_phone"], a["messenger_username"]) == (
        "sokha_shop",
        "012345678",
        "sokhafashion",
    )
    assert (b["telegram_username"], b["contact_phone"], b["messenger_username"]) == (
        None,
        None,
        None,
    )


async def test_bad_telegram_username_message_has_no_prefix(client, auth_headers):
    # The app looks the English message up for its Khmer: it must be exact.
    headers, _, _ = await registered_seller(client, auth_headers)

    response = await _contact(client, headers, telegram_username="sokha shop!")

    assert response.json()["error"]["message"] == (
        "Enter your Telegram username, e.g. @your_shop: letters, numbers and _."
    )
