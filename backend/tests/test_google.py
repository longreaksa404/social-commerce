""" "Continue with Google" (founder's choice 2026-10-09): Google's ID token
checked for real (signature, audience, issuer, expiry) against a key made
here instead of Google's, then sign-in, sign-up with a checked phone, and
connecting Google to an existing account."""

import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core import google
from app.core.config import get_settings
from tests.helpers import session_of, verified_phone_check

CLIENT_ID = "1234-test.apps.googleusercontent.com"
GOOGLE = "/api/v1/auth/google"
SOCIAL_REGISTER = "/api/v1/auth/social/register"
_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(autouse=True)
def google_on(monkeypatch):
    """Our client ID set, and "Google's keys" being the one made above."""
    monkeypatch.setattr(get_settings(), "google_client_id", CLIENT_ID)
    monkeypatch.setattr(
        google._keys,
        "get_signing_key_from_jwt",
        lambda _token: SimpleNamespace(key=_KEY.public_key()),
    )


def id_token(sub: str | None = None, *, key=_KEY, **overrides) -> str:
    """An ID token like Google's button hands the page."""
    now = datetime.now(UTC)
    claims = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "sub": sub or str(uuid.uuid4().int)[:21],
        "email": "sokha@gmail.com",
        "email_verified": True,
        "name": "Sokha Chan",
        "iat": now,
        "exp": now + timedelta(hours=1),
        **overrides,
    }
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": "test"})


def bearer(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


async def sign_up(client, sub: str, **overrides) -> dict:
    """A new person through "Continue with Google": returns the finished
    sign-up's response json and their phone."""
    started = (await client.post(GOOGLE, json={"credential": id_token(sub)})).json()
    check_id, phone = await verified_phone_check()
    body = {
        "signup_token": started["signup"]["signup_token"],
        "full_name": "Sokha",
        "store_name": "Sokha Fashion",
        "phone_check": check_id,
        **overrides,
    }
    response = await client.post(SOCIAL_REGISTER, json=body)
    assert response.status_code == 201, response.text
    return {**response.json(), "phone": phone}


async def test_off_without_a_client_id(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "google_client_id", "")
    response = await client.post(GOOGLE, json={"credential": id_token()})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "GOOGLE_NOT_CONFIGURED"


async def test_someone_new_signs_up_with_a_checked_phone_then_logs_in(client):
    sub = str(uuid.uuid4().int)[:21]

    started = await client.post(GOOGLE, json={"credential": id_token(sub)})
    assert started.status_code == 200
    assert started.json()["access_token"] is None
    assert started.json()["signup"]["full_name"] == "Sokha Chan"
    assert started.json()["signup"]["email"] == "sokha@gmail.com"
    assert "refresh_token" not in started.cookies

    shop = await sign_up(client, sub)
    me = (await client.get("/api/v1/seller/account", headers=bearer(shop["access_token"]))).json()
    assert me == {
        "phone": shop["phone"],
        "email": None,
        "full_name": "Sokha",
        "role": "owner",
        "has_password": False,
        "google_connected": True,
        "google_email": "sokha@gmail.com",
    }

    again = await client.post(GOOGLE, json={"credential": id_token(sub)})
    assert again.json()["signup"] is None
    assert session_of(again)["refresh_token"]
    store = await client.get("/api/v1/seller/store", headers=bearer(again.json()["access_token"]))
    assert store.json()["name"] == "Sokha Fashion"


@pytest.mark.parametrize(
    "token",
    [
        pytest.param(lambda: id_token(key=_OTHER_KEY), id="not signed by google"),
        pytest.param(lambda: id_token(aud="someone-elses-app"), id="another app's"),
        pytest.param(lambda: id_token(iss="https://evil.example.com"), id="not from google"),
        pytest.param(lambda: id_token(exp=datetime.now(UTC) - timedelta(minutes=1)), id="expired"),
        pytest.param(lambda: "not-a-token", id="garbage"),
    ],
)
async def test_tokens_google_didnt_make_for_us_are_refused(client, token):
    response = await client.post(GOOGLE, json={"credential": token()})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "GOOGLE_SIGN_IN_FAILED"


async def test_an_unchecked_email_isnt_kept(client):
    started = await client.post(GOOGLE, json={"credential": id_token(email_verified=False)})
    assert started.json()["signup"]["email"] is None


async def test_a_google_account_signs_up_once(client):
    sub = str(uuid.uuid4().int)[:21]
    started = (await client.post(GOOGLE, json={"credential": id_token(sub)})).json()
    token = started["signup"]["signup_token"]
    await sign_up(client, sub)
    check_id, _ = await verified_phone_check()

    again = await client.post(
        SOCIAL_REGISTER,
        json={
            "signup_token": token,
            "full_name": "S",
            "store_name": "Two",
            "phone_check": check_id,
        },
    )

    assert again.status_code == 409
    assert again.json()["error"]["code"] == "GOOGLE_TAKEN"


async def test_bad_signup_tokens_are_refused(client, register):
    seller = await register()
    check_id, _ = await verified_phone_check()
    for token in ("nope", seller["access_token"]):
        response = await client.post(
            SOCIAL_REGISTER,
            json={
                "signup_token": token,
                "full_name": "S",
                "store_name": "S",
                "phone_check": check_id,
            },
        )
        assert response.status_code == 400, token
        assert response.json()["error"]["code"] == "SIGNUP_EXPIRED"


async def test_a_phone_with_a_shop_isnt_joined_to_a_new_google_account(client, register):
    """Someone with a phone shop who taps Google is told to log in (and
    connect Google in Settings), not given the shop."""
    seller = await register()
    started = (await client.post(GOOGLE, json={"credential": id_token()})).json()
    check_id, _ = await verified_phone_check(seller["phone"])

    response = await client.post(
        SOCIAL_REGISTER,
        json={
            "signup_token": started["signup"]["signup_token"],
            "full_name": "S",
            "store_name": "S",
            "phone_check": check_id,
        },
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PHONE_TAKEN"


async def test_without_a_password_until_one_is_added(client):
    shop = await sign_up(client, str(uuid.uuid4().int)[:21])
    login = {"login": shop["phone"], "password": "anything-at-all"}

    assert (await client.post("/api/v1/auth/login", json=login)).status_code == 401
    added = await client.post(
        "/api/v1/seller/account/password",
        headers=bearer(shop["access_token"]),
        json={"new_password": "anything-at-all"},
    )
    assert added.status_code == 200, added.text
    assert (await client.post("/api/v1/auth/login", json=login)).status_code == 200


async def test_closing_a_shop_made_with_google_needs_no_password(client):
    sub = str(uuid.uuid4().int)[:21]
    shop = await sign_up(client, sub)

    closed = await client.post(
        "/api/v1/seller/account/close-shop", headers=bearer(shop["access_token"]), json={}
    )
    login = await client.post(GOOGLE, json={"credential": id_token(sub)})

    assert closed.status_code == 204
    assert login.status_code == 403
    assert login.json()["error"]["code"] == "ACCOUNT_DISABLED"


async def test_a_phone_seller_connects_google_in_settings(client, register):
    seller = await register()
    sub = str(uuid.uuid4().int)[:21]

    connected = await client.post(
        "/api/v1/seller/account/google",
        headers=bearer(seller["access_token"]),
        json={"credential": id_token(sub, email="dara@gmail.com")},
    )
    login = await client.post(GOOGLE, json={"credential": id_token(sub)})

    assert connected.status_code == 200, connected.text
    assert (connected.json()["google_connected"], connected.json()["google_email"]) == (
        True,
        "dara@gmail.com",
    )
    me = await client.get("/api/v1/seller/account", headers=bearer(login.json()["access_token"]))
    assert me.json()["phone"] == seller["phone"]

    # Another Google account replaces it.
    other = str(uuid.uuid4().int)[:21]
    await client.post(
        "/api/v1/seller/account/google",
        headers=bearer(seller["access_token"]),
        json={"credential": id_token(other)},
    )
    old = await client.post(GOOGLE, json={"credential": id_token(sub)})
    assert old.json()["signup"] is not None


async def test_a_google_account_of_another_shop_cant_be_connected(client, register):
    sub = str(uuid.uuid4().int)[:21]
    await sign_up(client, sub)
    someone = await register()

    response = await client.post(
        "/api/v1/seller/account/google",
        headers=bearer(someone["access_token"]),
        json={"credential": id_token(sub)},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "GOOGLE_TAKEN"
