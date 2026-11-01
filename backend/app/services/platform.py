"""Oak Order's own settings, set from the admin panel (01_PRODUCT.md
§22.11, founder's pick D2B): the riel rate a currency switch converts at,
the prices of a month and a year, and the free trial's length. They live
in `platform_setting`; a key never saved reads as the default (the rate:
the KHR_PER_USD variable). A new price applies from each shop's next
payment; a new trial length to shops opened from then.

Read once per request where it's needed (`load`) and passed down, so a
change shows everywhere at once, on every server.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.config import get_settings
from app.models import PlanPeriod, PlatformSetting
from app.models.account import TRIAL_DAYS

RATE, PRICES, TRIAL = "khr_per_usd", "prices", "trial_days"
DEFAULT_PRICES = {PlanPeriod.MONTH: Decimal("9.99"), PlanPeriod.YEAR: Decimal("99.00")}


@dataclass(frozen=True)
class Platform:
    khr_per_usd: int
    month: Decimal
    year: Decimal
    trial_days: int
    # The day the prices or the trial last changed (the Terms' date).
    terms_changed_on: date | None = None

    def price(self, period: PlanPeriod) -> Decimal:
        return self.month if period is PlanPeriod.MONTH else self.year


async def _rows(db: AsyncSession, keys: list[str]) -> dict[str, PlatformSetting]:
    rows = await db.scalars(select(PlatformSetting).where(PlatformSetting.key.in_(keys)))
    return {row.key: row for row in rows}


async def load(db: AsyncSession) -> Platform:
    rows = await _rows(db, [RATE, PRICES, TRIAL])
    prices = rows[PRICES].value if PRICES in rows else {}
    changed = [rows[k].updated_at for k in (PRICES, TRIAL) if k in rows]
    return Platform(
        khr_per_usd=int(rows[RATE].value) if RATE in rows else get_settings().khr_per_usd,
        month=Decimal(prices.get("month", DEFAULT_PRICES[PlanPeriod.MONTH])),
        year=Decimal(prices.get("year", DEFAULT_PRICES[PlanPeriod.YEAR])),
        trial_days=int(rows[TRIAL].value) if TRIAL in rows else TRIAL_DAYS,
        terms_changed_on=max(changed).astimezone(clock.PHNOM_PENH).date() if changed else None,
    )


def _put(db: AsyncSession, rows: dict, key: str, value: Any, admin_id: uuid.UUID | None) -> None:
    row = rows.get(key)
    if row is None:
        db.add(PlatformSetting(key=key, value=value, updated_by=admin_id))
    else:
        row.value = value
        row.updated_by = admin_id
        row.updated_at = datetime.now(UTC)


async def save(db: AsyncSession, admin_id: uuid.UUID, new: Platform) -> dict[str, tuple[Any, Any]]:
    """Saves what changed (not committed); answers {setting: (before,
    after)} for the log."""
    old = await load(db)
    rows = await _rows(db, [RATE, PRICES, TRIAL])
    changes: dict[str, tuple[Any, Any]] = {}
    if new.khr_per_usd != old.khr_per_usd:
        _put(db, rows, RATE, new.khr_per_usd, admin_id)
        changes[RATE] = (old.khr_per_usd, new.khr_per_usd)
    if (new.month, new.year) != (old.month, old.year):
        _put(db, rows, PRICES, {"month": f"{new.month:.2f}", "year": f"{new.year:.2f}"}, admin_id)
        if new.month != old.month:
            changes["month"] = (f"{old.month:.2f}", f"{new.month:.2f}")
        if new.year != old.year:
            changes["year"] = (f"{old.year:.2f}", f"{new.year:.2f}")
    if new.trial_days != old.trial_days:
        _put(db, rows, TRIAL, new.trial_days, admin_id)
        changes[TRIAL] = (old.trial_days, new.trial_days)
    return changes


# The daily jobs' last runs (the System page), saved by each run.
def job_key(name: str) -> str:
    return f"job:{name}"


async def record_run(db: AsyncSession, name: str, sent: int) -> None:
    """A job ran (cron-job.org, or Run now): when, and how many it sent.
    Commits."""
    key = job_key(name)
    rows = await _rows(db, [key])
    _put(db, rows, key, {"at": datetime.now(UTC).isoformat(), "sent": sent}, None)
    await db.commit()


async def last_runs(db: AsyncSession, names: list[str]) -> dict[str, dict[str, Any]]:
    rows = await _rows(db, [job_key(n) for n in names])
    return {n: rows[job_key(n)].value for n in names if job_key(n) in rows}
