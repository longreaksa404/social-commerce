"""Checking a "Continue with Google" sign-in (founder's choice 2026-10-09).

The browser gets an ID token from Google's button (Google Identity
Services) and sends it here. It's a JWT signed by Google: we check the
signature against Google's public keys, that it was made for our client
ID, by Google, and hasn't expired. No secret is involved, and nothing is
stored but the account's id (`sub`).
"""

import asyncio

import jwt

from app.core.config import get_settings
from app.core.oauth import SocialAccount, not_configured, sign_in_failed
from app.models import LoginProvider

CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
ISSUERS = ("accounts.google.com", "https://accounts.google.com")

# Fetches Google's keys once and keeps them (they change every few weeks;
# a token signed with a new key makes it fetch again).
_keys = jwt.PyJWKClient(CERTS_URL, cache_keys=True, lifespan=6 * 3600, timeout=10)


def _verify(credential: str, client_id: str) -> SocialAccount:
    try:
        key = _keys.get_signing_key_from_jwt(credential)
        claims = jwt.decode(
            credential,
            key.key,
            algorithms=["RS256"],
            audience=client_id,
            issuer=ISSUERS,
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
    except jwt.PyJWTError as exc:  # includes failing to fetch the keys
        raise sign_in_failed() from exc
    email = claims.get("email") if claims.get("email_verified") is True else None
    return SocialAccount(
        provider=LoginProvider.GOOGLE,
        user_id=str(claims["sub"]),
        email=email.lower() if isinstance(email, str) else None,
        name=str(claims.get("name") or "").strip()[:100],
    )


async def verify(credential: str) -> SocialAccount:
    client_id = get_settings().google_client_id
    if not client_id:
        raise not_configured()
    # The key fetch is a blocking HTTP call: keep it off the event loop.
    return await asyncio.to_thread(_verify, credential, client_id)
