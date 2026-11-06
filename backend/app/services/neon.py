"""Neon's compute hours (founder, 2026-11-06: the database is on Neon's free
plan, whose compute hours are the limit most likely to need paying next).

Every dashboard left open keeps Neon awake (the bell polls every 30 s), so
the admin shows this month's compute and warns before it runs out, as it
does for Render's free hours (services/awake.py).

Neon's consumption-history API needs a paid plan, so this reads the project
itself: GET {API}/projects/{id} answers `compute_time_seconds` (CU-seconds
used this period) with `consumption_period_start` and `_end`. Reading it
is a call to Neon's control plane; it doesn't wake the database.

The answer is kept in memory for 15 minutes (the bell's 30 s polling never
reaches Neon), and a failure for 5, so a slow Neon doesn't hold up every
poll. A failure only makes the System page say "Couldn't read Neon".
"""

import asyncio
import logging
import time
from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import get_settings
from app.schemas.admin import AdminDatabaseComputeOut

log = logging.getLogger(__name__)

API_URL = "https://console.neon.tech/api/v2"
TIMEOUT_S = 5
CACHE_S = 15 * 60
FAILED_CACHE_S = 5 * 60
# Too little of the period counted to say where it is heading.
PACE_AFTER = timedelta(days=2)
# The bell warns at this share used or on pace to pass the allowance, and
# says it's urgent from this share used.
WARN_USED, URGENT_USED = 0.7, 0.9

# (when it was asked, what Neon answered: the project, or None if it failed)
_cache: tuple[float, dict | None] | None = None
_lock = asyncio.Lock()


def enabled() -> bool:
    s = get_settings()
    return bool(s.neon_api_key and s.neon_project_id) and s.neon_compute_hours > 0


def period_key(at: datetime) -> str:
    return f"{at.astimezone(UTC):%Y-%m-%d}"


def _time(value: object) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(UTC)
    except ValueError:
        return None


def _month(now: datetime) -> tuple[datetime, datetime]:
    start = now.astimezone(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start, (start + timedelta(days=32)).replace(day=1)


def period(project: dict, now: datetime) -> tuple[datetime, datetime]:
    """The month Neon is counting: its own billing period when it says one
    around now that is about a month long, else the UTC calendar month."""
    start, end = (
        _time(project.get("consumption_period_start")),
        _time(project.get("consumption_period_end")),
    )
    if start and end and start <= now < end and 25 <= (end - start).days <= 32:
        return start, end
    return _month(now)


def usage(project: dict, now: datetime, limit: int) -> AdminDatabaseComputeOut:
    """This period's CU-hours from Neon's answer, and where the period is
    heading once two days are counted (limit = the plan's CU-hours)."""
    seconds = project.get("compute_time_seconds")
    if not isinstance(seconds, (int, float)) or isinstance(seconds, bool) or seconds < 0:
        raise ValueError("compute_time_seconds missing")
    start, end = period(project, now)
    used = seconds / 3600
    elapsed = now - start
    on_pace = (
        used / (elapsed.total_seconds() / 3600) * ((end - start).total_seconds() / 3600)
        if elapsed >= PACE_AFTER
        else None
    )
    return AdminDatabaseComputeOut(
        readable=True,
        used=round(used, 1),
        limit=limit,
        period_start=start,
        period_end=end,
        on_pace=round(on_pace) if on_pace is not None else None,
        low=used >= limit * WARN_USED or (on_pace or 0) >= limit,
        over=used >= limit * URGENT_USED,
    )


def unreadable(limit: int) -> AdminDatabaseComputeOut:
    return AdminDatabaseComputeOut(readable=False, limit=limit)


async def _fetch() -> dict:
    """Neon's answer for our project (the `project` object). Raises on any
    failure; never logs the key."""
    s = get_settings()
    async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
        response = await client.get(
            f"{API_URL}/projects/{s.neon_project_id}",
            headers={"Authorization": f"Bearer {s.neon_api_key}", "Accept": "application/json"},
        )
    response.raise_for_status()
    project = response.json().get("project")
    if not isinstance(project, dict):
        raise ValueError("no project in Neon's answer")
    return project


async def project() -> dict | None:
    """Neon's answer, from memory for 15 minutes (a failure for 5); None
    when it couldn't be read."""
    global _cache
    async with _lock:
        now = time.monotonic()
        if _cache is not None:
            asked, answer = _cache
            if now - asked < (CACHE_S if answer is not None else FAILED_CACHE_S):
                return answer
        try:
            answer = await _fetch()
        except Exception as error:
            # The type and status only: the request carries the key.
            status = getattr(getattr(error, "response", None), "status_code", None)
            log.warning("Couldn't read Neon's compute (%s %s)", type(error).__name__, status or "")
            answer = None
        _cache = (time.monotonic(), answer)
        return answer


async def state() -> AdminDatabaseComputeOut | None:
    """The System page's and the bell's view; None when off (no key or
    project ID, or NEON_COMPUTE_HOURS=0). Never raises."""
    if not enabled():
        return None
    limit = get_settings().neon_compute_hours
    answer = await project()
    if answer is None:
        return unreadable(limit)
    try:
        return usage(answer, datetime.now(UTC), limit)
    except Exception:
        log.warning("Neon's answer had no compute time")
        return unreadable(limit)
