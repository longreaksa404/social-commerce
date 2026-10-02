from limits import parse
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.core.config import get_settings
from app.core.errors import AppError

# In-memory, per process: fine for one Render instance. The client IP comes
# from X-Forwarded-For via uvicorn's --proxy-headers (see the Dockerfile).
limiter = Limiter(key_func=get_remote_address, enabled=get_settings().rate_limit_enabled)


def check_limit(limit: str, scope: str, request: Request) -> None:
    """A second, stricter per-IP limit on one endpoint, on top of a router's.

    slowapi checks only the first decorated limit of a request, so this
    calls its limiter directly (same storage, same on/off switch).
    """
    if limiter.enabled and not limiter.limiter.hit(
        parse(limit), scope, get_remote_address(request)
    ):
        raise AppError(429, "RATE_LIMITED", "Too many attempts. Try again in a minute.")
