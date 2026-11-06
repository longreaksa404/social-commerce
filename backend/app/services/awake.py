"""Render's free hours (founder, 2026-11-06: the API stays on Render's free
plan for the first seller, with a warning before the hours run out).

Render's free plan gives the account 750 hours a month. They count while
the service is awake, and once they run out the API is stopped until the
1st. The cron-job.org ping keeps it awake 7:00 to midnight (~530 hours);
what else wakes it (a seller's dashboard left open overnight, Telegram,
late customers) is the margin.

A sleeping service is a stopped process, so this server counts its own
awake time: in memory since the last save, saved into `platform_setting`
"server_hours" ({"2026-11": {"seconds": …, "from": …}}, this month and
the last) when the server stops (Render puts it to sleep, or a deploy)
and at most every 15 minutes while the admin looks. Time lost to a crash
isn't counted, so the page says "about". Months are UTC, as Render's.

Only on Render (its RENDER variable), and off with RENDER_FREE_HOURS=0
once the service is on a paid plan.
"""

import asyncio
import logging
import os
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import unscoped_session
from app.models import PlatformSetting
from app.schemas.admin import AdminServerHoursOut

log = logging.getLogger(__name__)

KEY = "server_hours"
SAVE_EVERY = timedelta(minutes=15)
# Too little counting to say where the month is heading.
PACE_AFTER = timedelta(days=2)
# The bell warns when the month is on pace for this share of the hours,
# and says it's urgent once this share is used.
WARN_PACE, URGENT_USED = 0.93, 0.93

# The start of the awake time not saved yet.
_since = datetime.now(UTC)


def enabled() -> bool:
    return bool(os.environ.get("RENDER")) and get_settings().render_free_hours > 0


def _month_start(at: datetime) -> datetime:
    return at.astimezone(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _next_month(start: datetime) -> datetime:
    return (start + timedelta(days=32)).replace(day=1)


def month_key(at: datetime) -> str:
    return f"{at.astimezone(UTC):%Y-%m}"


def split(start: datetime, end: datetime) -> dict[str, tuple[datetime, float]]:
    """The time from start to end, by month: {month: (its start in that
    month, seconds)}."""
    out: dict[str, tuple[datetime, float]] = {}
    while start < end:
        cut = min(end, _next_month(_month_start(start)))
        out[month_key(start)] = (start, (cut - start).total_seconds())
        start = cut
    return out


def add(stored: dict, start: datetime, end: datetime) -> dict:
    """`stored` with the awake time from start to end added (a new dict,
    this month and the last only)."""
    value = dict(stored)
    for month, (began, seconds) in split(start, end).items():
        entry = value.get(month) or {"seconds": 0, "from": began.isoformat()}
        value[month] = {**entry, "seconds": entry["seconds"] + round(seconds)}
    return {m: value[m] for m in sorted(value)[-2:]}


async def save(db: AsyncSession, now: datetime | None = None, force: bool = False) -> dict:
    """Adds the awake time since the last save (every 15 minutes at most,
    unless forced), and answers what's stored. Commits."""
    global _since
    now = now or datetime.now(UTC)
    row = await db.get(PlatformSetting, KEY)
    stored = row.value if row is not None else {}
    if not force and now - _since < SAVE_EVERY:
        return stored
    start, _since = _since, now
    try:
        value = add(stored, start, now)
        if row is None:
            db.add(PlatformSetting(key=KEY, value=value))
        else:
            row.value = value
            row.updated_at = now
        await db.commit()
    except Exception:
        _since = start  # counted at the next save instead
        raise
    return value


async def save_on_stop() -> None:
    """At shutdown (Render puts the service to sleep, or a deploy): saves
    what's left, never holding the shutdown up for long."""
    try:
        async with unscoped_session() as db:
            await asyncio.wait_for(save(db, force=True), timeout=5)
    except Exception:
        log.exception("Couldn't save the server's awake time")


def usage(stored: dict, now: datetime, since: datetime, limit: int) -> AdminServerHoursOut:
    """This month's hours: saved plus not saved yet (since `since`), and
    where the month is heading once two days are counted."""
    month = month_key(now)
    entry = stored.get(month) or {}
    month_start = _month_start(now)
    pending = (now - max(since, month_start)).total_seconds()
    used = (entry.get("seconds", 0) + max(pending, 0)) / 3600
    counted_from = (
        datetime.fromisoformat(entry["from"]) if "from" in entry else max(since, month_start)
    )
    counted = now - counted_from
    month_hours = (_next_month(month_start) - month_start).total_seconds() / 3600
    on_pace = (
        used / (counted.total_seconds() / 3600) * month_hours if counted >= PACE_AFTER else None
    )
    # Counting began after the 1st: Render's own count is higher by the
    # days before, so only the pace says how the month will end.
    return AdminServerHoursOut(
        used=round(used, 1),
        limit=limit,
        counted_from=counted_from,
        from_month_start=counted_from <= month_start + timedelta(minutes=5),
        on_pace=round(on_pace) if on_pace is not None else None,
        low=(on_pace or 0) >= limit * WARN_PACE or used >= limit * URGENT_USED,
        over=used >= limit * URGENT_USED,
    )


async def state(db: AsyncSession) -> AdminServerHoursOut | None:
    """The System page's and the bell's view; None off Render or on a paid
    plan."""
    if not enabled():
        return None
    stored = await save(db)
    return usage(stored, datetime.now(UTC), _since, get_settings().render_free_hours)
