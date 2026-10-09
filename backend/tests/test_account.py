"""Settings → Your account: the seller's own details, phone number and
password."""

from app.core.config import get_settings
from tests.helpers import refresh, verified_phone_check


def _bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def test_seller_sees_and_edits_only_their_own_account(client, register):
    a, b = await register(full_name="Sokha"), await register(full_name="Dara")

    edit = await client.patch(
        "/api/v1/seller/account",
        headers=_bearer(a),
        # The phone changes only through a phone check, the email not at all.
        json={"full_name": "Sokha Chan", "phone": "012 999 999", "email": "new@example.com"},
    )
    other = await client.get("/api/v1/seller/account", headers=_bearer(b))

    assert edit.status_code == 200, edit.text
    assert edit.json() == {
        "phone": a["phone"],
        "email": None,
        "full_name": "Sokha Chan",
        "role": "owner",
        "has_password": True,
        "google_connected": False,
        "google_email": None,
    }
    assert other.json()["full_name"] == "Dara"


async def test_new_phone_number_through_a_check_is_the_login_now(client, register):
    a = await register()
    check_id, new_phone = await verified_phone_check()

    changed = await client.post(
        "/api/v1/seller/account/phone", headers=_bearer(a), json={"phone_check": check_id}
    )
    again = await client.post(
        "/api/v1/seller/account/phone", headers=_bearer(a), json={"phone_check": check_id}
    )

    assert changed.status_code == 200, changed.text
    assert changed.json()["phone"] == new_phone
    assert again.status_code == 422  # a check works once
    old = await client.post(
        "/api/v1/auth/login", json={"login": a["phone"], "password": "correct-horse"}
    )
    new = await client.post(
        "/api/v1/auth/login", json={"login": new_phone, "password": "correct-horse"}
    )
    assert (old.status_code, new.status_code) == (401, 200)


async def test_phone_number_of_another_account_is_refused(client, register):
    a, b = await register(), await register()
    check_id, _ = await verified_phone_check(b["phone"])

    response = await client.post(
        "/api/v1/seller/account/phone", headers=_bearer(a), json={"phone_check": check_id}
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PHONE_TAKEN"


async def test_unfinished_phone_check_is_refused(client, register, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_token", "123:abc")
    monkeypatch.setattr(settings, "telegram_bot_username", "TestShopBot")
    monkeypatch.setattr(settings, "telegram_webhook_secret", "secret")
    a = await register()
    check = (await client.post("/api/v1/auth/phone-checks")).json()

    response = await client.post(
        "/api/v1/seller/account/phone", headers=_bearer(a), json={"phone_check": check["id"]}
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "PHONE_NOT_VERIFIED"


async def test_password_change_needs_the_current_password(client, register):
    a = await register()

    response = await client.post(
        "/api/v1/seller/account/password",
        headers=_bearer(a),
        json={"current_password": "wrong-one", "new_password": "a-new-password"},
    )

    # Not 401, which the app would read as "logged out".
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "WRONG_PASSWORD"
    assert response.json()["error"]["field"] == "current_password"


async def test_password_change_logs_out_other_phones_and_keeps_this_one(client, register):
    a = await register()
    other_phone = await client.post(
        "/api/v1/auth/login", json={"login": a["phone"], "password": "correct-horse"}
    )

    change = await client.post(
        "/api/v1/seller/account/password",
        headers=_bearer(a),
        json={"current_password": "correct-horse", "new_password": "a-new-password"},
    )

    assert change.status_code == 200, change.text
    refresh_other = await refresh(client, other_phone.cookies["refresh_token"])
    refresh_this = await refresh(client, change.cookies["refresh_token"])
    old_login = await client.post(
        "/api/v1/auth/login", json={"login": a["phone"], "password": "correct-horse"}
    )
    new_login = await client.post(
        "/api/v1/auth/login", json={"login": a["phone"], "password": "a-new-password"}
    )
    assert refresh_other.status_code == 401
    assert refresh_this.status_code == 200
    assert old_login.status_code == 401
    assert new_login.status_code == 200


async def test_closing_the_shop_needs_the_password(client, register):
    a = await register()

    response = await client.post(
        "/api/v1/seller/account/close-shop", headers=_bearer(a), json={"password": "nope"}
    )

    assert response.status_code == 422
    assert response.json()["error"]["field"] == "password"


async def test_a_closed_shop_is_gone_and_nobody_can_log_in(client, register):
    a = await register()
    slug = (await client.get("/api/v1/seller/store", headers=_bearer(a))).json()["slug"]

    closed = await client.post(
        "/api/v1/seller/account/close-shop",
        headers=_bearer(a),
        json={"password": "correct-horse"},
    )

    assert closed.status_code == 204
    assert (await client.get(f"/api/v1/shop/{slug}")).status_code == 404
    login = await client.post(
        "/api/v1/auth/login", json={"login": a["phone"], "password": "correct-horse"}
    )
    assert login.status_code == 403
    assert login.json()["error"]["message"] == (
        "This shop is closed. Message Oak Order to open it again."
    )
    assert (await refresh(client, a["refresh_token"])).status_code == 401
