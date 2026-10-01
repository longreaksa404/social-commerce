from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

# In-memory, per process: fine for one Render instance. The client IP comes
# from X-Forwarded-For via uvicorn's --proxy-headers (see the Dockerfile).
limiter = Limiter(key_func=get_remote_address, enabled=get_settings().rate_limit_enabled)
