"""Log in with Telegram (founder's test list #30, 2026-10-24): a shop
owner's number, shared with the bot, instead of the password. Staff keep
their password (#25)."""

from tests.helpers import random_phone, session_of, verified_phone_check

LOGIN = "/api/v1/auth/telegram"


async def test_an_owner_logs_in_with_the_number_shared_with_the_bot(client, register):
    owner = await register()
    check_id, _ = await verified_phone_check(owner["phone"])

    response = await client.post(LOGIN, json={"phone_check": check_id})

    assert response.status_code == 200, response.text
    headers = {"Authorization": f"Bearer {session_of(response)['access_token']}"}
    account = (await client.get("/api/v1/seller/account", headers=headers)).json()
    assert (account["phone"], account["role"]) == (owner["phone"], "owner")
    # The check works once.
    again = await client.post(LOGIN, json={"phone_check": check_id})
    assert again.json()["error"]["code"] == "PHONE_CHECK_EXPIRED"


async def test_a_number_without_a_shop_keeps_its_check_for_signing_up(client):
    check_id, _ = await verified_phone_check(random_phone())

    response = await client.post(LOGIN, json={"phone_check": check_id})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NO_SHOP_FOR_PHONE"
    signed_up = await client.post(
        "/api/v1/auth/register",
        json={"password": "correct-horse", "store_name": "New Shop", "phone_check": check_id},
    )
    assert signed_up.status_code == 201, signed_up.text


async def test_staff_log_in_with_their_password_instead(client, register):
    owner = await register()
    headers = {"Authorization": f"Bearer {owner['access_token']}"}
    phone = random_phone()
    added = await client.post(
        "/api/v1/seller/staff",
        headers=headers,
        json={"full_name": "Dara", "phone": phone, "password": "first-password"},
    )
    assert added.status_code == 201, added.text
    check_id, _ = await verified_phone_check(phone)

    response = await client.post(LOGIN, json={"phone_check": check_id})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "STAFF_USE_PASSWORD"


async def test_a_closed_shop_cant_log_in_with_telegram_either(client, register):
    owner = await register()
    headers = {"Authorization": f"Bearer {owner['access_token']}"}
    closed = await client.post(
        "/api/v1/seller/account/close-shop", headers=headers, json={"password": "correct-horse"}
    )
    assert closed.status_code in (200, 204), closed.text
    check_id, _ = await verified_phone_check(owner["phone"])

    response = await client.post(LOGIN, json={"phone_check": check_id})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ACCOUNT_DISABLED"
