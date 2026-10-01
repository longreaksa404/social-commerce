async def test_login_with_wrong_password_uses_error_envelope(client, register):
    seller = await register()

    response = await client.post(
        "/api/v1/auth/login", json={"email": seller["email"], "password": "wrong-password"}
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


async def test_email_is_case_insensitive_and_unique(client, register):
    seller = await register()

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": seller["email"].upper(), "password": "correct-horse"},
    )
    duplicate = await client.post(
        "/api/v1/auth/register",
        json={
            "email": seller["email"].upper(),
            "password": "correct-horse",
            "full_name": "Someone",
            "phone": "012345678",
            "store_name": "Other",
        },
    )

    assert login.status_code == 200
    assert duplicate.status_code == 409
    assert duplicate.json()["error"] == {
        "code": "EMAIL_TAKEN",
        "message": "An account with this email already exists.",
        "field": "email",
    }


async def test_refresh_token_works_once_and_reuse_ends_all_sessions(client, register):
    seller = await register()
    first = seller["refresh_token"]

    rotated = await client.post("/api/v1/auth/refresh", json={"refresh_token": first})
    assert rotated.status_code == 200
    second = rotated.json()["refresh_token"]

    # Reusing the old token is treated as theft...
    reused = await client.post("/api/v1/auth/refresh", json={"refresh_token": first})
    assert reused.status_code == 401
    # ...and also kills the token the legitimate client holds.
    after = await client.post("/api/v1/auth/refresh", json={"refresh_token": second})
    assert after.status_code == 401


async def test_logout_revokes_the_refresh_token(client, register):
    seller = await register()

    logout = await client.post(
        "/api/v1/auth/logout", json={"refresh_token": seller["refresh_token"]}
    )
    refresh = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": seller["refresh_token"]}
    )

    assert logout.status_code == 204
    assert refresh.status_code == 401


async def test_access_token_is_not_accepted_as_refresh_token(client, register):
    seller = await register()

    response = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": seller["access_token"]}
    )

    assert response.status_code == 401
