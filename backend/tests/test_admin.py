"""The founder's command-line tools (app/admin.py)."""

import pytest

from app import admin


async def test_reset_password_gives_a_working_password_and_logs_out_every_phone(client, register):
    seller = await register()

    password = await admin.reset_password(seller["email"].upper())

    old = await client.post(
        "/api/v1/auth/login", json={"email": seller["email"], "password": "correct-horse"}
    )
    new = await client.post(
        "/api/v1/auth/login", json={"email": seller["email"], "password": password}
    )
    phone = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": seller["refresh_token"]}
    )
    assert old.status_code == 401
    assert new.status_code == 200
    assert phone.status_code == 401


async def test_reset_password_for_an_unknown_email_says_so():
    with pytest.raises(admin.AdminError, match="No account"):
        await admin.reset_password("nobody@example.com")


def test_temporary_passwords_are_long_enough_and_easy_to_read():
    password = admin.temporary_password()
    assert len(password.replace("-", "")) == 12
    assert not set(password) & set("0o1li")
