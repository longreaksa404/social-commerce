"""Settings → Your account: the seller's own details and password."""


def _bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def test_seller_sees_and_edits_only_their_own_account(client, register):
    a, b = await register(full_name="Sokha"), await register(full_name="Dara")

    edit = await client.patch(
        "/api/v1/seller/account",
        headers=_bearer(a),
        json={"full_name": "Sokha Chan", "phone": "+855 12 345 678", "email": "NEW@Example.com"},
    )
    other = await client.get("/api/v1/seller/account", headers=_bearer(b))

    assert edit.status_code == 200, edit.text
    assert edit.json() == {
        "email": "new@example.com",
        "full_name": "Sokha Chan",
        "phone": "+855 12 345 678",
    }
    assert other.json()["full_name"] == "Dara"
    # The new email is the login now.
    login = await client.post(
        "/api/v1/auth/login", json={"email": "new@example.com", "password": "correct-horse"}
    )
    assert login.status_code == 200


async def test_email_of_another_account_is_refused(client, register):
    a, b = await register(), await register()

    response = await client.patch(
        "/api/v1/seller/account", headers=_bearer(a), json={"email": b["email"].upper()}
    )

    assert response.status_code == 409
    assert response.json()["error"]["field"] == "email"


async def test_keeping_your_own_email_is_fine(client, register):
    a = await register()

    response = await client.patch(
        "/api/v1/seller/account", headers=_bearer(a), json={"email": a["email"]}
    )

    assert response.status_code == 200


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
        "/api/v1/auth/login", json={"email": a["email"], "password": "correct-horse"}
    )

    change = await client.post(
        "/api/v1/seller/account/password",
        headers=_bearer(a),
        json={"current_password": "correct-horse", "new_password": "a-new-password"},
    )

    assert change.status_code == 200, change.text
    this_phone = change.json()
    refresh_other = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": other_phone.json()["refresh_token"]}
    )
    refresh_this = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": this_phone["refresh_token"]}
    )
    old_login = await client.post(
        "/api/v1/auth/login", json={"email": a["email"], "password": "correct-horse"}
    )
    new_login = await client.post(
        "/api/v1/auth/login", json={"email": a["email"], "password": "a-new-password"}
    )
    assert refresh_other.status_code == 401
    assert refresh_this.status_code == 200
    assert old_login.status_code == 401
    assert new_login.status_code == 200
