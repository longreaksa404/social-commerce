""" "Continue with Facebook" and "Continue with TikTok" (founder's choice
2026-10-09): the code the browser came back with, traded for the account
with the app's secret. Facebook's and TikTok's answers are played here by
an httpx MockTransport."""

import uuid
from urllib.parse import parse_qs

import httpx
import pytest

from app.core import oauth
from app.core.config import get_settings
from tests.helpers import session_of, verified_phone_check

APP = "https://app.example.com"
FACEBOOK_BACK = f"{APP}/auth/facebook/callback"
TIKTOK_BACK = f"{APP}/auth/tiktok/callback"


class Providers:
    """Facebook and TikTok, as far as these tests need them: a code is
    good for one account; anything else is refused."""

    def __init__(self) -> None:
        self.accounts: dict[str, dict] = {}  # code -> account
        self.requests: list[httpx.Request] = []

    def code_for(self, **account) -> str:
        code = uuid.uuid4().hex
        self.accounts[code] = {"id": str(uuid.uuid4().int)[:16], "name": "Sokha", **account}
        return code

    def handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        url = str(request.url)
        if url.startswith(f"{oauth.FACEBOOK_GRAPH}/oauth/access_token"):
            account = self.accounts.get(request.url.params["code"])
            if account is None or request.url.params["client_secret"] != "fb-secret":
                return httpx.Response(400, json={"error": {"message": "bad code"}})
            return httpx.Response(200, json={"access_token": f"fb-{account['id']}"})
        if url.startswith(f"{oauth.FACEBOOK_GRAPH}/me"):
            token = request.url.params["access_token"]
            account = next(a for a in self.accounts.values() if f"fb-{a['id']}" == token)
            body = {"id": account["id"], "name": account["name"]}
            if account.get("email"):
                body["email"] = account["email"]
            return httpx.Response(200, json=body)
        if url == oauth.TIKTOK_TOKEN:
            form = parse_qs(request.content.decode())
            account = self.accounts.get(form["code"][0])
            if account is None or form["client_secret"] != ["tt-secret"]:
                return httpx.Response(
                    200, json={"error": "invalid_grant", "error_description": "bad code"}
                )
            return httpx.Response(
                200, json={"access_token": f"tt-{account['id']}", "open_id": account["id"]}
            )
        if url.startswith(oauth.TIKTOK_USER):
            token = request.headers["Authorization"].removeprefix("Bearer ")
            account = next(a for a in self.accounts.values() if f"tt-{a['id']}" == token)
            return httpx.Response(
                200,
                json={
                    "data": {"user": {"open_id": account["id"], "display_name": account["name"]}},
                    "error": {"code": "ok"},
                },
            )
        return httpx.Response(404)


@pytest.fixture
def providers(monkeypatch) -> Providers:
    settings = get_settings()
    for name, value in {
        "facebook_app_id": "fb-app",
        "facebook_app_secret": "fb-secret",
        "tiktok_client_key": "tt-key",
        "tiktok_client_secret": "tt-secret",
        "public_app_url": APP,
    }.items():
        monkeypatch.setattr(settings, name, value)
    fake = Providers()
    monkeypatch.setattr(
        oauth, "_http", lambda: httpx.AsyncClient(transport=httpx.MockTransport(fake.handle))
    )
    return fake


def bearer(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


async def sign_up(client, provider: str, code: str, redirect_uri: str) -> dict:
    started = await client.post(
        f"/api/v1/auth/oauth/{provider}", json={"code": code, "redirect_uri": redirect_uri}
    )
    assert started.status_code == 200, started.text
    check_id, phone = await verified_phone_check()
    finished = await client.post(
        "/api/v1/auth/social/register",
        json={
            "signup_token": started.json()["signup"]["signup_token"],
            "full_name": "Sokha",
            "store_name": "Sokha Fashion",
            "phone_check": check_id,
        },
    )
    assert finished.status_code == 201, finished.text
    return {"started": started.json(), **finished.json(), "phone": phone}


async def test_facebook_sign_up_then_log_in(client, providers):
    first = providers.code_for(name="Sokha Chan", email="Sokha@Example.com")

    shop = await sign_up(client, "facebook", first, FACEBOOK_BACK)

    signup = shop["started"]["signup"]
    assert (signup["provider"], signup["full_name"], signup["email"]) == (
        "facebook",
        "Sokha Chan",
        "sokha@example.com",
    )
    me = await client.get("/api/v1/seller/account", headers=bearer(shop["access_token"]))
    assert me.json()["logins"] == [{"provider": "facebook", "label": "sokha@example.com"}]
    assert me.json()["has_password"] is False
    # The call for the person carried proof it came from our server.
    me_call = next(r for r in providers.requests if "/me" in str(r.url))
    assert me_call.url.params["appsecret_proof"]

    # Next time: the same Facebook account, a new code, logged straight in.
    again_code = uuid.uuid4().hex
    providers.accounts[again_code] = providers.accounts[first]
    again = await client.post(
        "/api/v1/auth/oauth/facebook", json={"code": again_code, "redirect_uri": FACEBOOK_BACK}
    )
    assert again.json()["signup"] is None
    assert session_of(again)["refresh_token"]


async def test_facebook_account_without_an_email(client, providers):
    """Accounts made with a phone number have no email on Facebook."""
    shop = await sign_up(client, "facebook", providers.code_for(name="Dara"), FACEBOOK_BACK)

    me = await client.get("/api/v1/seller/account", headers=bearer(shop["access_token"]))
    assert me.json()["logins"] == [{"provider": "facebook", "label": "Dara"}]


async def test_tiktok_sign_up_shows_the_tiktok_name(client, providers):
    shop = await sign_up(client, "tiktok", providers.code_for(name="sokha.shop"), TIKTOK_BACK)

    assert shop["started"]["signup"]["email"] is None
    me = await client.get("/api/v1/seller/account", headers=bearer(shop["access_token"]))
    assert me.json()["logins"] == [{"provider": "tiktok", "label": "sokha.shop"}]
    token_call = next(r for r in providers.requests if str(r.url) == oauth.TIKTOK_TOKEN)
    form = parse_qs(token_call.content.decode())
    assert form["redirect_uri"] == [TIKTOK_BACK]
    assert form["grant_type"] == ["authorization_code"]


@pytest.mark.parametrize("provider", ["facebook", "tiktok"])
async def test_a_bad_code_is_refused(client, providers, provider):
    response = await client.post(
        f"/api/v1/auth/oauth/{provider}",
        json={"code": "made-up", "redirect_uri": f"{APP}/auth/{provider}/callback"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "SOCIAL_SIGN_IN_FAILED"


@pytest.mark.parametrize(
    "redirect_uri",
    [
        "https://evil.example.com/auth/facebook/callback",
        f"{APP}/auth/tiktok/callback",  # another provider's page
        f"{APP}/somewhere-else",
    ],
)
async def test_codes_only_come_back_to_our_own_pages(client, providers, redirect_uri):
    response = await client.post(
        "/api/v1/auth/oauth/facebook",
        json={"code": providers.code_for(), "redirect_uri": redirect_uri},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_REDIRECT"
    assert providers.requests == []  # Facebook wasn't even asked


async def test_off_until_the_app_is_set_up(client, providers, monkeypatch):
    monkeypatch.setattr(get_settings(), "tiktok_client_secret", "")
    response = await client.post(
        "/api/v1/auth/oauth/tiktok", json={"code": "x", "redirect_uri": TIKTOK_BACK}
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SOCIAL_NOT_CONFIGURED"


async def test_only_facebook_and_tiktok_take_codes(client, providers):
    response = await client.post(
        "/api/v1/auth/oauth/instagram", json={"code": "x", "redirect_uri": APP}
    )
    assert response.status_code == 422


async def test_a_phone_seller_connects_facebook_and_tiktok(client, providers, register):
    seller = await register()
    headers = bearer(seller["access_token"])
    facebook = providers.code_for(name="Dara", email="dara@example.com")
    tiktok = providers.code_for(name="dara.tt")

    await client.post(
        "/api/v1/seller/account/oauth/tiktok",
        headers=headers,
        json={"code": tiktok, "redirect_uri": TIKTOK_BACK},
    )
    connected = await client.post(
        "/api/v1/seller/account/oauth/facebook",
        headers=headers,
        json={"code": facebook, "redirect_uri": FACEBOOK_BACK},
    )

    assert connected.status_code == 200, connected.text
    assert connected.json()["logins"] == [
        {"provider": "facebook", "label": "dara@example.com"},
        {"provider": "tiktok", "label": "dara.tt"},
    ]
    # And either one logs in to this shop now.
    providers.accounts["again"] = providers.accounts[tiktok]
    login = await client.post(
        "/api/v1/auth/oauth/tiktok", json={"code": "again", "redirect_uri": TIKTOK_BACK}
    )
    me = await client.get("/api/v1/seller/account", headers=bearer(login.json()["access_token"]))
    assert me.json()["phone"] == seller["phone"]


async def test_an_account_of_another_shop_cant_be_connected(client, providers, register):
    code = providers.code_for(name="Sokha")
    await sign_up(client, "facebook", code, FACEBOOK_BACK)
    providers.accounts["same-person"] = providers.accounts[code]
    someone = await register()

    response = await client.post(
        "/api/v1/seller/account/oauth/facebook",
        headers=bearer(someone["access_token"]),
        json={"code": "same-person", "redirect_uri": FACEBOOK_BACK},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SOCIAL_TAKEN"


async def test_the_same_phone_cant_sign_up_twice_with_two_providers(client, providers):
    """Sokha has a TikTok shop and taps Facebook by mistake: the phone
    check says so (taken), and signing up is refused."""
    shop = await sign_up(client, "tiktok", providers.code_for(name="sokha"), TIKTOK_BACK)
    started = await client.post(
        "/api/v1/auth/oauth/facebook",
        json={"code": providers.code_for(name="Sokha"), "redirect_uri": FACEBOOK_BACK},
    )
    check_id, _ = await verified_phone_check(shop["phone"])

    response = await client.post(
        "/api/v1/auth/social/register",
        json={
            "signup_token": started.json()["signup"]["signup_token"],
            "full_name": "Sokha",
            "store_name": "Second",
            "phone_check": check_id,
        },
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PHONE_TAKEN"
