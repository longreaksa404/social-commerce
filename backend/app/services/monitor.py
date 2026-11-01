"""What the server knows about itself, for the admin's System page
(01_PRODUCT.md §22.11, founder 2026-10-28: "track on the platforms, show
what matters here"): each request of the last hour (which route, how long,
its status) and the server errors of today, kept in memory by a middleware
(app/main.py). They start again when the server restarts; the detail over
days stays on Sentry and Render.
"""

import time
from collections import Counter, deque
from dataclasses import dataclass
from datetime import UTC, datetime

from app.core import clock

STARTED = datetime.now(UTC)
HOUR = 3600


@dataclass(frozen=True)
class Request:
    at: float  # time.time()
    route: str  # "/api/v1/shop/{store_slug}/products"
    ms: float
    status: int


_recent: deque[Request] = deque(maxlen=100_000)
_errors_by_day: Counter[str] = Counter()


def record(route: str, ms: float, status: int) -> None:
    now = time.time()
    _recent.append(Request(now, route, ms, status))
    while _recent and _recent[0].at < now - HOUR:
        _recent.popleft()
    if status >= 500:
        _errors_by_day[clock.today().isoformat()] += 1


@dataclass(frozen=True)
class Summary:
    requests: int  # in the last hour
    typical_ms: float | None  # the median
    slow_ms: float | None  # the slowest 1 in 20 (95th percentile)
    slow_route: str | None  # the route most often that slow
    errors_hour: int
    errors_today: int
    started_at: datetime


def summary() -> Summary:
    now = time.time()
    hour = [r for r in _recent if r.at >= now - HOUR]
    times = sorted(r.ms for r in hour)
    typical = slow = None
    slow_route = None
    if times:
        typical = times[len(times) // 2]
        slow = times[int(0.95 * (len(times) - 1))]
        slowest = Counter(r.route for r in hour if r.ms >= slow)
        slow_route = slowest.most_common(1)[0][0]
    return Summary(
        requests=len(hour),
        typical_ms=typical,
        slow_ms=slow,
        slow_route=slow_route,
        errors_hour=sum(r.status >= 500 for r in hour),
        errors_today=_errors_by_day[clock.today().isoformat()],
        started_at=STARTED,
    )
