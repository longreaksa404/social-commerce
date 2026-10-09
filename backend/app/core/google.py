"""Checking a "Continue with Google" sign-in (founder's choice 2026-10-09).

The browser gets an ID token from Google's button (Google Identity
Services) and sends it here. It's a JWT signed by Google: we check the
signature against Google's public keys, that it was made for our client
ID, by Google, and hasn't expired. No secret is involved, and nothing is
stored but the account's id (`sub`).
"""

import asyncio
from dataclasses import dataclass

import jwt

from app.core.config import get_settings
from app.core.errors import AppError

CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
ISSUERS = ("accounts.google.com", "https://accounts.google.com")

# Fetches Google's keys once and keeps them (they change every few weeks;
# a token signed with a new key makes it fetch again).
_keys = jwt.PyJWKClient(CERTS_URL, cache_keys=True, lifespan=6 * 3600, timeout=10)


@dataclass(frozen=True)
class GoogleAccount:
    # Google's id for the account: it stays when the email changes.
    sub: str
    # Only when Google says it's checked.
    email: str | None
    name: str


def _failed() -> AppError:
    return AppError(401, "GOOGLE_SIGN_IN_FAILED", "Google sign-in didn't work. Please try again.")


def _verify(credential: str, client_id: str) -> GoogleAccount:
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
        raise _failed() from exc
    email = claims.get("email") if claims.get("email_verified") is True else None
    return GoogleAccount(
        sub=str(claims["sub"]),
        email=email.lower() if isinstance(email, str) else None,
        name=str(claims.get("name") or "").strip()[:100],
    )


async def verify(credential: str) -> GoogleAccount:
    client_id = get_settings().google_client_id
    if not client_id:
        raise AppError(503, "GOOGLE_NOT_CONFIGURED", "Google sign-in is off.")
    # The key fetch is a blocking HTTP call: keep it off the event loop.
    return await asyncio.to_thread(_verify, credential, client_id)
