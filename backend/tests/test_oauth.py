""" "Continue with Facebook" (founder's choice 2026-10-09): the code the
browser came back with, traded for the account with the app's secret.
Facebook's answers are played here by an httpx MockTransport. TikTok's
login went on 2026-10-27 (TikTok turned the app down): the last tests
check it's gone."""

import uuid

import httpx
import pytest
from sqlalchemy import select

from app.core import oauth, security
from app.core.config import get_settings
from app.db.session import unscoped_session
from app.models import LoginProvider, Seller, SellerLogin
from tests.helpers import session_of, verified_phone_check

APP = "https://app.example.com"
FACEBOOK_BACK = f"{APP}/auth/facebook/callback"


class Providers:
    """Facebook, as far as these tests need it: a code is good for one
    account; anything else is refused."""

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
        return httpx.Response(404)


@pytest.fixture
def providers(monkeypatch) -> Providers:
    settings = get_settings()
    for name, value in {
        "facebook_app_id": "fb-app",
        "facebook_app_secret": "fb-secret",
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


async def finish_sign_up(client, signup_token: str, phone: str | None = None):
    check_id, phone = await verified_phone_check(phone)
    response = await client.post(
        "/api/v1/auth/social/register",
        json={
            "signup_token": signup_token,
            "full_name": "Sokha",
            "store_name": "Sokha Fashion",
            "phone_check": check_id,
        },
    )
    return response, phone


async def sign_up(client, code: str) -> dict:
    started = await client.post(
        "/api/v1/auth/oauth/facebook", json={"code": code, "redirect_uri": FACEBOOK_BACK}
    )
    assert started.status_code == 200, started.text
    finished, phone = await finish_sign_up(client, started.json()["signup"]["signup_token"])
    assert finished.status_code == 201, finished.text
    return {"started": started.json(), **finished.json(), "phone": phone}


async def test_facebook_sign_up_then_log_in(client, providers):
    first = providers.code_for(name="Sokha Chan", email="Sokha@Example.com")

    shop = await sign_up(client, first)

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
    shop = await sign_up(client, providers.code_for(name="Dara"))

    me = await client.get("/api/v1/seller/account", headers=bearer(shop["access_token"]))
    assert me.json()["logins"] == [{"provider": "facebook", "label": "Dara"}]


async def test_a_bad_code_is_refused(client, providers):
    response = await client.post(
        "/api/v1/auth/oauth/facebook", json={"code": "made-up", "redirect_uri": FACEBOOK_BACK}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "SOCIAL_SIGN_IN_FAILED"


@pytest.mark.parametrize(
    "redirect_uri",
    [
        "https://evil.example.com/auth/facebook/callback",
        f"{APP}/auth/google/callback",  # not Facebook's page
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
    monkeypatch.setattr(get_settings(), "facebook_app_secret", "")
    response = await client.post(
        "/api/v1/auth/oauth/facebook", json={"code": "x", "redirect_uri": FACEBOOK_BACK}
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SOCIAL_NOT_CONFIGURED"


@pytest.mark.parametrize("provider", ["tiktok", "instagram"])
async def test_only_facebook_takes_codes(client, providers, register, provider):
    seller = await register()
    body = {"code": "x", "redirect_uri": f"{APP}/auth/{provider}/callback"}

    signing_in = await client.post(f"/api/v1/auth/oauth/{provider}", json=body)
    connecting = await client.post(
        f"/api/v1/seller/account/oauth/{provider}",
        headers=bearer(seller["access_token"]),
        json=body,
    )

    assert (signing_in.status_code, connecting.status_code) == (422, 422)
    assert providers.requests == []


async def test_a_phone_seller_connects_facebook(client, providers, register):
    seller = await register()
    facebook = providers.code_for(name="Dara", email="dara@example.com")

    connected = await client.post(
        "/api/v1/seller/account/oauth/facebook",
        headers=bearer(seller["access_token"]),
        json={"code": facebook, "redirect_uri": FACEBOOK_BACK},
    )

    assert connected.status_code == 200, connected.text
    assert connected.json()["logins"] == [{"provider": "facebook", "label": "dara@example.com"}]
    # And it logs in to this shop now.
    providers.accounts["again"] = providers.accounts[facebook]
    login = await client.post(
        "/api/v1/auth/oauth/facebook", json={"code": "again", "redirect_uri": FACEBOOK_BACK}
    )
    me = await client.get("/api/v1/seller/account", headers=bearer(login.json()["access_token"]))
    assert me.json()["phone"] == seller["phone"]


async def test_an_account_of_another_shop_cant_be_connected(client, providers, register):
    code = providers.code_for(name="Sokha")
    await sign_up(client, code)
    providers.accounts["same-person"] = providers.accounts[code]
    someone = await register()

    response = await client.post(
        "/api/v1/seller/account/oauth/facebook",
        headers=bearer(someone["access_token"]),
        json={"code": "same-person", "redirect_uri": FACEBOOK_BACK},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SOCIAL_TAKEN"


async def test_the_same_phone_cant_sign_up_twice(client, providers):
    """Sokha has a shop from one Facebook account and signs up again with
    another: the phone check says so (taken), and signing up is refused."""
    shop = await sign_up(client, providers.code_for(name="sokha"))
    started = await client.post(
        "/api/v1/auth/oauth/facebook",
        json={"code": providers.code_for(name="Sokha"), "redirect_uri": FACEBOOK_BACK},
    )

    response, _ = await finish_sign_up(
        client, started.json()["signup"]["signup_token"], shop["phone"]
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PHONE_TAKEN"


async def test_a_tiktok_login_saved_before_is_left_out(client, register):
    """A shop that connected TikTok before 2026-10-27 keeps its row (the
    founder decides about deleting it) but Settings doesn't list it, and
    the shop still logs in with its phone."""
    seller = await register()
    async with unscoped_session() as db:
        seller_id = await db.scalar(select(Seller.id).where(Seller.phone == seller["phone"]))
        db.add(
            SellerLogin(
                seller_id=seller_id,
                provider=LoginProvider.TIKTOK,
                provider_user_id="tt-open-id",
                name="dara.tt",
            )
        )
        await db.commit()

    me = await client.get("/api/v1/seller/account", headers=bearer(seller["access_token"]))

    assert me.status_code == 200, me.text
    assert me.json()["logins"] == []
    assert me.json()["phone"] == seller["phone"]


async def test_a_tiktok_sign_up_started_before_cant_finish(client):
    token = security.create_signup_token("tiktok", "tt-open-id", None, "sokha.shop")

    response, _ = await finish_sign_up(client, token)

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SIGNUP_EXPIRED"
