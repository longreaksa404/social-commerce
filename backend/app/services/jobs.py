"""The scheduled jobs cron-job.org calls (01_PRODUCT.md §33.1 and §12.2),
and Run now on the admin's System page (part 25): each run is saved with
when it ran and how many messages it sent (services/platform.py), so the
System page can say when one is late. A run that fails saves when, and
the kind of error (never its words: an HTTP error's carries the bot's
token in its address).

One run of a job at a time: a second one, from Run now or cron-job.org,
is refused while the first is going (one server process, so a lock in
memory is enough)."""

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from app.core.errors import AppError
from app.db.session import unscoped_session
from app.services import billing, order_reminders, platform

logger = logging.getLogger(__name__)

# name: (what it is, how often, late after)
JOBS = {
    "billing": ("Plan reminders", "daily", timedelta(hours=26)),
    "reminders": ("Customer reminders", "hourly", timedelta(hours=2)),
}

_locks = {name: asyncio.Lock() for name in JOBS}


class JobRunning(AppError):
    def __init__(self) -> None:
        super().__init__(409, "JOB_RUNNING", "This job is running now. Try again in a minute.")


async def run(name: str) -> int:
    """Runs one job now and saves the run; answers how many it sent.
    JobRunning while another run of it is going."""
    lock = _locks[name]
    if lock.locked():
        raise JobRunning
    async with lock:
        try:
            if name == "billing":
                sent = (await billing.run_daily()).reminders
            else:
                sent = (await order_reminders.run()).reminders
        except Exception as exc:
            async with unscoped_session() as db:
                await platform.record_failure(db, name, type(exc).__name__)
            raise
        async with unscoped_session() as db:
            await platform.record_run(db, name, sent)
        return sent


async def run_from_cron(name: str) -> None:
    """cron-job.org's call, after its answer: a run already going is left
    to finish (the next call catches up)."""
    try:
        await run(name)
    except JobRunning:
        logger.info("Job %s is already running; this call skipped.", name)


def late(name: str, last: dict | None, now: datetime | None = None) -> bool:
    """Never ran, or not within its time (a missed cron-job.org call)."""
    if last is None or "at" not in last:
        return True
    now = now or datetime.now(UTC)
    return now - datetime.fromisoformat(last["at"]) > JOBS[name][2]


def failed(last: dict | None) -> bool:
    """Its latest run failed: a failure after the last run that worked."""
    if not last or "failed_at" not in last:
        return False
    if "at" not in last:
        return True
    return datetime.fromisoformat(last["failed_at"]) > datetime.fromisoformat(last["at"])
