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
# The admin's own session (01_PRODUCT.md §22.11): its own cookie and path,
# so it lives beside a shop's login in the same browser.
ADMIN_REFRESH_COOKIE = "admin_refresh"
_ADMIN_PATH = "/api/v1/admin/auth"

# Missing → "", which the service rejects like any invalid token (401).
RefreshCookie = Annotated[str, Cookie(alias=REFRESH_COOKIE, max_length=1000)]
AdminRefreshCookie = Annotated[str, Cookie(alias=ADMIN_REFRESH_COOKIE, max_length=1000)]


def _set(response: Response, name: str, path: str, tokens: TokenPair) -> AccessOut:
    response.set_cookie(
        name,
        tokens.refresh_token,
        max_age=int(refresh_token_lifetime().total_seconds()),
        path=path,
        secure=True,
        httponly=True,
        samesite="lax",
    )
    return AccessOut(access_token=tokens.access_token)


def start_session(response: Response, tokens: TokenPair) -> AccessOut:
    return _set(response, REFRESH_COOKIE, _PATH, tokens)


def end_session(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path=_PATH, secure=True, httponly=True, samesite="lax")


def start_admin_session(response: Response, tokens: TokenPair) -> AccessOut:
    return _set(response, ADMIN_REFRESH_COOKIE, _ADMIN_PATH, tokens)


def end_admin_session(response: Response) -> None:
    response.delete_cookie(
        ADMIN_REFRESH_COOKIE, path=_ADMIN_PATH, secure=True, httponly=True, samesite="lax"
    )
