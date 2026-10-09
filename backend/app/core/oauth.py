"""Who a Google, Facebook or TikTok account is (founder's choice
2026-10-09), as the rest of the app sees it.

Google hands the page a signed ID token (app/core/google.py). Facebook and
TikTok send the browser back to /auth/<provider>/callback with a one-time
code; the API trades it for the account here, with the app's secret, so
the secret never leaves the server.
"""

import hashlib
import hmac
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import AppError
from app.models import LoginProvider

FACEBOOK_GRAPH = "https://graph.facebook.com/v26.0"
TIKTOK_TOKEN = "https://open.tiktokapis.com/v2/oauth/token/"
TIKTOK_USER = "https://open.tiktokapis.com/v2/user/info/"


@dataclass(frozen=True)
class SocialAccount:
    provider: LoginProvider
    # The provider's id for the account, for this app: it stays when the
    # person changes their email or name.
    user_id: str
    # Only when the provider says it's checked; TikTok gives none.
    email: str | None
    name: str


def sign_in_failed() -> AppError:
    return AppError(401, "SOCIAL_SIGN_IN_FAILED", "That sign-in didn't work. Please try again.")


def not_configured() -> AppError:
    return AppError(503, "SOCIAL_NOT_CONFIGURED", "This way of logging in is off.")


def check_redirect_uri(provider: LoginProvider, redirect_uri: str) -> None:
    """The callback page the code came back to: one of the app's own
    addresses. The provider checks it too (it must be registered there and
    match the one the code was made for)."""
    settings = get_settings()
    origins = {o.rstrip("/") for o in [*settings.cors_origins, settings.public_app_url] if o}
    if redirect_uri not in {f"{o}/auth/{provider.value}/callback" for o in origins}:
        raise AppError(422, "INVALID_REDIRECT", "That sign-in came back to the wrong page.")


def _http() -> httpx.AsyncClient:
    """Separate so tests can answer for Facebook and TikTok."""
    return httpx.AsyncClient(timeout=10)


def _json(response: httpx.Response) -> dict[str, Any]:
    try:
        body = response.json()
    except ValueError as exc:
        raise sign_in_failed() from exc
    if not isinstance(body, dict):
        raise sign_in_failed()
    return body


async def facebook(code: str, redirect_uri: str) -> SocialAccount:
    settings = get_settings()
    if not settings.facebook_configured:
        raise not_configured()
    check_redirect_uri(LoginProvider.FACEBOOK, redirect_uri)
    try:
        async with _http() as client:
            token = _json(
                await client.get(
                    f"{FACEBOOK_GRAPH}/oauth/access_token",
                    params={
                        "client_id": settings.facebook_app_id,
                        "client_secret": settings.facebook_app_secret,
                        "redirect_uri": redirect_uri,
                        "code": code,
                    },
                )
            )
            access_token = token.get("access_token")
            if not isinstance(access_token, str):
                raise sign_in_failed()
            # Proves the call comes from this app's server, not from
            # someone holding a copy of the token.
            proof = hmac.new(
                settings.facebook_app_secret.encode(), access_token.encode(), hashlib.sha256
            ).hexdigest()
            me = _json(
                await client.get(
                    f"{FACEBOOK_GRAPH}/me",
                    params={
                        "fields": "id,name,email",
                        "access_token": access_token,
                        "appsecret_proof": proof,
                    },
                )
            )
    except httpx.HTTPError as exc:
        raise sign_in_failed() from exc
    if not me.get("id"):
        raise sign_in_failed()
    # Facebook only gives an email that the person confirmed (and none for
    # accounts made with a phone number).
    email = me.get("email")
    return SocialAccount(
        provider=LoginProvider.FACEBOOK,
        user_id=str(me["id"]),
        email=email.lower() if isinstance(email, str) else None,
        name=str(me.get("name") or "").strip()[:100],
    )


async def tiktok(code: str, redirect_uri: str) -> SocialAccount:
    settings = get_settings()
    if not settings.tiktok_configured:
        raise not_configured()
    check_redirect_uri(LoginProvider.TIKTOK, redirect_uri)
    try:
        async with _http() as client:
            token = _json(
                await client.post(
                    TIKTOK_TOKEN,
                    data={
                        "client_key": settings.tiktok_client_key,
                        "client_secret": settings.tiktok_client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    },
                )
            )
            access_token, open_id = token.get("access_token"), token.get("open_id")
            if not isinstance(access_token, str) or not open_id:
                raise sign_in_failed()
            info = _json(
                await client.get(
                    TIKTOK_USER,
                    params={"fields": "open_id,display_name"},
                    headers={"Authorization": f"Bearer {access_token}"},
                )
            )
    except httpx.HTTPError as exc:
        raise sign_in_failed() from exc
    user = (info.get("data") or {}).get("user") or {}
    return SocialAccount(
        provider=LoginProvider.TIKTOK,
        # open_id: this person, for this app.
        user_id=str(open_id),
        email=None,
        name=str(user.get("display_name") or "").strip()[:100],
    )
