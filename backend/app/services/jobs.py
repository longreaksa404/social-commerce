"""The scheduled jobs cron-job.org calls (01_PRODUCT.md §33.1 and §12.2),
and Run now on the admin's System page (part 25): each run is saved with
when it ran and how many messages it sent (services/platform.py), so the
System page can say when one is late."""

from datetime import UTC, datetime, timedelta

from app.db.session import unscoped_session
from app.services import billing, order_reminders, platform

# name: (what it is, how often, late after)
JOBS = {
    "billing": ("Plan reminders", "daily", timedelta(hours=26)),
    "reminders": ("Customer reminders", "hourly", timedelta(hours=2)),
}


async def run(name: str) -> int:
    """Runs one job now and saves the run; answers how many it sent."""
    if name == "billing":
        sent = (await billing.run_daily()).reminders
    else:
        sent = (await order_reminders.run()).reminders
    async with unscoped_session() as db:
        await platform.record_run(db, name, sent)
    return sent


def late(name: str, last: dict | None, now: datetime | None = None) -> bool:
    """Never ran, or not within its time (a missed cron-job.org call)."""
    if last is None:
        return True
    now = now or datetime.now(UTC)
    return now - datetime.fromisoformat(last["at"]) > JOBS[name][2]
