import ipaddress

from limits import parse
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.core.config import get_settings
from app.core.errors import AppError


def client_ip(request: Request) -> str:
    """The IP that rate limits count against.

    Render's edge is Cloudflare, which sets CF-Connecting-IP to the address
    that connected to it, replacing any value the client sent. X-Forwarded-For
    is no good for this: Render keeps whatever the client put there and only
    appends, and uvicorn's --proxy-headers takes the first (client-written)
    entry, so a fake header would give every request a fresh budget.

    Without the header (local dev, tests) this is uvicorn's client address.
    """
    header = request.headers.get("cf-connecting-ip", "").strip()
    try:
        return str(ipaddress.ip_address(header))
    except ValueError:
        return get_remote_address(request)


# In-memory, per process: fine for one Render instance.
limiter = Limiter(key_func=client_ip, enabled=get_settings().rate_limit_enabled)


def check_limit(limit: str, scope: str, request: Request) -> None:
    """A second, stricter per-IP limit on one endpoint, on top of a router's.

    slowapi checks only the first decorated limit of a request, so this
    calls its limiter directly (same storage, same on/off switch).
    """
    if limiter.enabled and not limiter.limiter.hit(parse(limit), scope, client_ip(request)):
        raise AppError(429, "RATE_LIMITED", "Too many attempts. Try again in a minute.")
