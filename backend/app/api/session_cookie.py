"""The refresh token travels in an httpOnly cookie, so page scripts never
see it; the body carries only the short-lived access token.

The app (order.oaksolve.com) and the API (api.oaksolve.com) are one site,
so a SameSite=Lax cookie goes with the app's requests and with nobody
else's POSTs. The cookie is sent only to /api/v1/auth (refresh, logout).
Secure always: browsers treat http://localhost as secure, so local dev
works too.
"""

from typing import Annotated

from fastapi import Cookie, Response

from app.core.security import refresh_token_lifetime
from app.schemas.auth import AccessOut, TokenPair

REFRESH_COOKIE = "refresh_token"
_PATH = "/api/v1/auth"

# Missing → "", which the service rejects like any invalid token (401).
RefreshCookie = Annotated[str, Cookie(alias=REFRESH_COOKIE, max_length=1000)]


def start_session(response: Response, tokens: TokenPair) -> AccessOut:
    response.set_cookie(
        REFRESH_COOKIE,
        tokens.refresh_token,
        max_age=int(refresh_token_lifetime().total_seconds()),
        path=_PATH,
        secure=True,
        httponly=True,
        samesite="lax",
    )
    return AccessOut(access_token=tokens.access_token)


def end_session(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path=_PATH, secure=True, httponly=True, samesite="lax")
