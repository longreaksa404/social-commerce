"""The admin's bell (the notification center): what needs the admin now,
made fresh from the records on each look, never stored as records of its
own, so a notice can't change a payment, a plan or a shop, and goes by
itself once its cause is gone (a claim checked, a shop paid).

Each notice has a key naming its cause ("claim:<payment>", "ending:<shop>:
<paid until>"…), so the same cause is one notice however often it's
looked at, and a new cause (a new paid-until date, a new failed send) is a
new, unread one. Which keys the admin has read is the only thing kept:
`platform_setting` "notices:<admin id>", {key: when read}, trimmed to the
notices of the moment each time it's written.

Sources: the shops' plans (the Home's "Needs you"), failed Telegram sends
in 24 hours, the daily jobs and the nightly backup (late or failed), and
server errors counted by this server since it started.
"""

import uuid
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.models import NotificationChannel, NotificationLog, NotificationStatus, PlatformSetting
from app.schemas.admin import (
    AdminDatabaseComputeOut,
    AdminNoticeOut,
    AdminNoticesOut,
    AdminServerHoursOut,
)
from app.schemas.plan import PlanStage
from app.services import admin_system, awake, jobs, monitor, neon, platform
from app.services import plan as plan_service
from app.services.admin import NOT_OPENED_DAYS, list_shops

# Most urgent first when two happen at the same time.
SEVERITY = {"action": 0, "urgent": 1, "warning": 2, "info": 3}


def read_key(admin_id: uuid.UUID) -> str:
    return f"notices:{admin_id}"


def _day(d: date) -> str:
    """ "13 Nov" """
    return f"{d.day} {d:%b}"


def _morning(d: date) -> datetime:
    """The start of a Phnom Penh day."""
    return datetime.combine(d, time.min, clock.PHNOM_PENH)


def _usd(amount: Decimal) -> str:
    return f"${amount:,.2f}"


def _shop_notices(shops, today: date) -> list[AdminNoticeOut]:
    out: list[AdminNoticeOut] = []
    for shop in shops:
        if not shop.is_open:
            continue
        href = f"/admin/shops/{shop.id}"
        if shop.claim is not None:
            out.append(
                AdminNoticeOut(
                    key=f"claim:{shop.claim.id}",
                    kind="claim",
                    severity="action",
                    title=f'{shop.name} says "I\'ve paid"',
                    text=f"{_usd(shop.claim.amount)} for a {shop.claim.period.value} · check it",
                    at=shop.claim.created_at,
                    href=href,
                )
            )
        stage, until = shop.stage, shop.paid_until
        if stage is PlanStage.STOPPED:
            stopped_on = shop.pay_by + timedelta(days=1)
            out.append(
                AdminNoticeOut(
                    key=f"stopped:{shop.id}:{until}",
                    kind="stopped",
                    severity="urgent",
                    title=shop.name,
                    text=f"Unpaid · no new orders since {_day(stopped_on)}",
                    at=_morning(stopped_on),
                    href=href,
                )
            )
        elif stage is PlanStage.OVERDUE:
            out.append(
                AdminNoticeOut(
                    key=f"unpaid:{shop.id}:{until}",
                    kind="unpaid",
                    severity="urgent",
                    title=shop.name,
                    text=f"Unpaid · orders stop {_day(shop.pay_by + timedelta(days=1))}",
                    at=_morning(until + timedelta(days=1)),
                    href=href,
                )
            )
        elif stage is PlanStage.ENDING_SOON:
            what = "Trial" if shop.on_trial else "Paid time"
            out.append(
                AdminNoticeOut(
                    key=f"ending:{shop.id}:{until}",
                    kind="ending",
                    severity="warning",
                    title=shop.name,
                    text=f"{what} ends {_day(until)}",
                    at=_morning(until - timedelta(days=plan_service.REMIND_DAYS - 1)),
                    href=href,
                )
            )
        elif stage is PlanStage.SETUP:
            signed_up = shop.created_at.astimezone(clock.PHNOM_PENH).date()
            if (today - signed_up).days >= NOT_OPENED_DAYS:
                out.append(
                    AdminNoticeOut(
                        key=f"not_opened:{shop.id}",
                        kind="not_opened",
                        severity="info",
                        title=shop.name,
                        text=f"Not opened · signed up {_day(signed_up)}",
                        at=_morning(signed_up + timedelta(days=NOT_OPENED_DAYS)),
                        href=href,
                    )
                )
    return out


async def _telegram_notice(db: AsyncSession) -> AdminNoticeOut | None:
    """One notice for the failed sends of the last 24 hours, new again
    with each new failure."""
    since = datetime.now(UTC) - timedelta(hours=24)
    where = (
        NotificationLog.channel == NotificationChannel.TELEGRAM,
        NotificationLog.status == NotificationStatus.FAILED,
        NotificationLog.sent_at >= since,
    )
    count = await db.scalar(select(func.count()).select_from(NotificationLog).where(*where))
    if not count:
        return None
    latest = await db.scalar(
        select(NotificationLog).where(*where).order_by(NotificationLog.sent_at.desc()).limit(1)
    )
    return AdminNoticeOut(
        key=f"telegram:{latest.id}",
        kind="telegram",
        severity="warning",
        title="Telegram messages failed",
        text=f"{count} in 24 hours" if count != 1 else "1 in 24 hours",
        at=latest.sent_at,
        href="/admin/system#bot",
    )


def _job_notices(runs: dict[str, dict], now: datetime) -> list[AdminNoticeOut]:
    out: list[AdminNoticeOut] = []
    for job in admin_system.job_states(runs):
        if job.failing:
            out.append(
                AdminNoticeOut(
                    key=f"job_failed:{job.name}:{job.failed_at.isoformat()}",
                    kind="job_failed",
                    severity="urgent",
                    title=f"{job.title} failed",
                    text=f"The last run stopped with {job.error or 'an error'}",
                    at=job.failed_at,
                    href="/admin/system#jobs",
                )
            )
        elif job.late:
            since = job.last_at.isoformat() if job.last_at else "never"
            out.append(
                AdminNoticeOut(
                    key=f"job_late:{job.name}:{since}",
                    kind="job_late",
                    severity="warning",
                    title=f"{job.title} didn't run",
                    text=(
                        f"Last run {_day(job.last_at.astimezone(clock.PHNOM_PENH).date())}"
                        if job.last_at
                        else "No run recorded yet"
                    ),
                    at=job.last_at + jobs.JOBS[job.name][2] if job.last_at else None,
                    href="/admin/system#jobs",
                )
            )
    backup = admin_system.backup_state(runs.get(admin_system.BACKUP), now)
    if backup.failing:
        out.append(
            AdminNoticeOut(
                key=f"backup_failed:{backup.failed_at.isoformat()}",
                kind="backup_failed",
                severity="urgent",
                title="Last night's backup failed",
                text="See the run on GitHub, Actions",
                at=backup.failed_at,
                href="/admin/system#backup",
            )
        )
    elif backup.late:
        since = backup.last_at.isoformat() if backup.last_at else "never"
        out.append(
            AdminNoticeOut(
                key=f"backup_late:{since}",
                kind="backup_late",
                severity="warning",
                title="No backup last night" if backup.last_at else "No backup reported yet",
                text=(
                    f"Last saved {_day(backup.last_at.astimezone(clock.PHNOM_PENH).date())}"
                    if backup.last_at
                    else "Not known to work until a night reports"
                ),
                at=backup.last_at + admin_system.BACKUP_LATE if backup.last_at else None,
                href="/admin/system#backup",
            )
        )
    return out


def _error_notice() -> AdminNoticeOut | None:
    last = monitor.last_error_at()
    if last is None:
        return None
    speed = monitor.summary()
    if not speed.errors_today:
        return None
    return AdminNoticeOut(
        key=f"errors:{last.isoformat()}",
        kind="errors",
        severity="warning",
        title="Server errors",
        text=f"{speed.errors_today} today · {speed.errors_hour} in the last hour",
        at=last,
        href="/admin/system#speed",
    )


def hours_notice(hours: AdminServerHoursOut | None, now: datetime) -> AdminNoticeOut | None:
    """Render's free hours running low: once when the month is on pace to
    run out, again (urgent) when nearly all are used."""
    if hours is None or not hours.low:
        return None
    pace = f" · on pace for {hours.on_pace}" if hours.on_pace is not None else ""
    return AdminNoticeOut(
        key=f"hours:{awake.month_key(now)}:{'over' if hours.over else 'pace'}",
        kind="server_hours",
        severity="urgent" if hours.over else "warning",
        title="Free server hours running low",
        text=f"About {hours.used:.0f} of {hours.limit} hours used{pace}",
        at=now,
        href="/admin/system#speed",
    )


def compute_notice(compute: AdminDatabaseComputeOut | None, now: datetime) -> AdminNoticeOut | None:
    """Neon's compute hours running low: once at about 70% used or on pace
    to pass the allowance, again (urgent) at about 90% used. Nothing when
    Neon couldn't be read."""
    if compute is None or not compute.readable or not compute.low:
        return None
    pace = f" · on pace for {compute.on_pace}" if compute.on_pace is not None else ""
    return AdminNoticeOut(
        key=f"compute:{neon.period_key(compute.period_start or now)}:"
        f"{'over' if compute.over else 'pace'}",
        kind="database_compute",
        severity="urgent" if compute.over else "warning",
        title="Database compute running low",
        text=f"About {compute.used:.0f} of {compute.limit} hours used{pace}",
        at=now,
        href="/admin/system#database",
    )


async def current(db: AsyncSession) -> list[AdminNoticeOut]:
    """Every notice of the moment, newest first (most urgent first at the
    same time; one with no time, last)."""
    now = datetime.now(UTC)
    notices = _shop_notices(await list_shops(db), clock.today())
    telegram_notice = await _telegram_notice(db)
    if telegram_notice:
        notices.append(telegram_notice)
    notices += _job_notices(await platform.last_runs(db, [*jobs.JOBS, admin_system.BACKUP]), now)
    error = _error_notice()
    if error:
        notices.append(error)
    hours = hours_notice(await awake.state(db), now)
    if hours:
        notices.append(hours)
    compute = compute_notice(await neon.state(), now)
    if compute:
        notices.append(compute)
    oldest = datetime.min.replace(tzinfo=UTC)
    return sorted(notices, key=lambda n: (-(n.at or oldest).timestamp(), SEVERITY[n.severity]))


async def _read(db: AsyncSession, admin_id: uuid.UUID) -> PlatformSetting | None:
    return await db.get(PlatformSetting, read_key(admin_id))


async def notices(db: AsyncSession, admin_id: uuid.UUID) -> AdminNoticesOut:
    items = await current(db)
    row = await _read(db, admin_id)
    read = row.value if row is not None else {}
    for item in items:
        item.read = item.key in read
    return AdminNoticesOut(items=items, unread=sum(not n.read for n in items))


async def mark_read(
    db: AsyncSession, admin_id: uuid.UUID, keys: list[str] | None
) -> AdminNoticesOut:
    """Marks these notices read (`keys` None: all of them). Only notices of
    the moment are kept, so the list never grows. Commits."""
    items = await current(db)
    live = {n.key for n in items}
    row = await _read(db, admin_id)
    before = row.value if row is not None else {}
    stamp = datetime.now(UTC).isoformat()
    picked = live if keys is None else live & set(keys)
    after = {k: v for k, v in before.items() if k in live} | {k: stamp for k in picked}
    if row is None:
        db.add(PlatformSetting(key=read_key(admin_id), value=after))
    else:
        row.value = after
        row.updated_at = datetime.now(UTC)
    await db.commit()
    for item in items:
        item.read = item.key in after
    return AdminNoticesOut(items=items, unread=sum(not n.read for n in items))
