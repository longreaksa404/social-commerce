"""The admin's System page (01_PRODUCT.md §22.11, parts 24 to 27; founder's
pick 12B): speed and errors in the last hour, the daily jobs, the Telegram
bot, the database, which services are set up (never a key), and the live
version. The detail stays on Sentry, Render, Neon and Cloudflare."""

import os
import time
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import NotificationChannel, NotificationLog, NotificationStatus, Store
from app.schemas.admin import (
    AdminBotOut,
    AdminFailedSendOut,
    AdminJobOut,
    AdminServiceOut,
    AdminSpeedOut,
    AdminSystemOut,
)
from app.services import jobs, monitor, platform, telegram
from app.services.telegram import TelegramError


def services() -> list[AdminServiceOut]:
    """What's set on the server, by name only."""
    s = get_settings()
    return [
        AdminServiceOut(name="Telegram bot", set=s.telegram_configured),
        AdminServiceOut(name="Photo storage", set=s.r2_configured),
        AdminServiceOut(name="Google login", set=bool(s.google_client_id)),
        AdminServiceOut(name="Facebook login", set=s.facebook_configured),
        AdminServiceOut(name="Oak's KHQR", set=bool(s.oak_khqr_account)),
        AdminServiceOut(
            name="Oak's bank account", set=bool(s.oak_bank_name and s.oak_bank_account_number)
        ),
        AdminServiceOut(name="Daily jobs' secret", set=bool(s.billing_cron_secret)),
        AdminServiceOut(name="Sentry (errors)", set=bool(s.sentry_dsn)),
    ]


async def _bot(db: AsyncSession) -> AdminBotOut:
    since = datetime.now(UTC) - timedelta(hours=24)
    failed = (
        await db.execute(
            select(NotificationLog, Store.name)
            .join(Store, Store.id == NotificationLog.store_id)
            .where(
                NotificationLog.channel == NotificationChannel.TELEGRAM,
                NotificationLog.status == NotificationStatus.FAILED,
                NotificationLog.sent_at >= since,
            )
            .order_by(NotificationLog.sent_at.desc())
        )
    ).all()
    recent = [
        AdminFailedSendOut(
            store_id=row.store_id,
            shop=shop,
            event_type=row.event_type,
            error=str(row.payload.get("error") or ""),
            sent_at=row.sent_at,
        )
        for row, shop in failed[:5]
    ]
    refused = telegram.refused_since(time.time() - 24 * 3600)
    if not get_settings().telegram_configured:
        return AdminBotOut(set_up=False, working=False, failed=len(failed), recent=recent)
    # Telegram's own view of the bot: messages waiting, the last error.
    try:
        info = await telegram.call("getWebhookInfo", {})
    except (TelegramError, httpx.HTTPError) as exc:
        return AdminBotOut(
            set_up=True,
            working=False,
            problem=str(exc) or type(exc).__name__,
            failed=len(failed),
            recent=recent,
            refused=refused,
        )
    error_at = info.get("last_error_date")
    recent_error = error_at is not None and time.time() - error_at < 3600
    return AdminBotOut(
        set_up=True,
        working=not recent_error,
        problem=info.get("last_error_message") if recent_error else None,
        waiting=info.get("pending_update_count", 0),
        webhook=bool(info.get("url")),
        failed=len(failed),
        recent=recent,
        refused=refused,
    )


async def system(db: AsyncSession) -> AdminSystemOut:
    speed = monitor.summary()
    started = time.perf_counter()
    await db.execute(text("SELECT 1"))
    query_ms = (time.perf_counter() - started) * 1000
    size = await db.scalar(select(func.pg_database_size(func.current_database())))
    runs = await platform.last_runs(db, list(jobs.JOBS))
    commit = os.environ.get("RENDER_GIT_COMMIT", "")
    return AdminSystemOut(
        speed=AdminSpeedOut(**speed.__dict__),
        jobs=[
            AdminJobOut(
                name=name,
                title=title,
                every=every,
                last_at=runs[name]["at"] if name in runs else None,
                last_sent=runs[name]["sent"] if name in runs else None,
                late=jobs.late(name, runs.get(name)),
            )
            for name, (title, every, _) in jobs.JOBS.items()
        ],
        bot=await _bot(db),
        database_bytes=size or 0,
        database_ms=round(query_ms, 1),
        services=services(),
        version=commit[:7] or None,
    )
