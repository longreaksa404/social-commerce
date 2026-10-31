"""The admin's Settings page (01_PRODUCT.md §22.11, parts 23 and D2B;
founder's pick 11A): the riel rate, the prices and the trial length, one
page and one Save, each change in the log (services/platform.py holds
them)."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PlatformSetting
from app.schemas.admin import AdminSettingsIn, AdminSettingsOut
from app.schemas.plan import PlanStage
from app.services import admin_log, platform
from app.services.admin import list_shops

# The words for each setting in the admins' Telegram line.
NAMES = {
    platform.RATE: "riel rate",
    "month": "month price",
    "year": "year price",
    platform.TRIAL: "free trial (days)",
}


async def get(db: AsyncSession) -> AdminSettingsOut:
    now = await platform.load(db)
    shops = await list_shops(db)
    paying = sum(s.is_open and not s.on_trial and s.stage is not PlanStage.SETUP for s in shops)
    return AdminSettingsOut(
        khr_per_usd=now.khr_per_usd,
        month=now.month,
        year=now.year,
        trial_days=now.trial_days,
        paying_shops=paying,
        updated_at=await db.scalar(
            select(func.max(PlatformSetting.updated_at)).where(
                PlatformSetting.key.in_([platform.RATE, platform.PRICES, platform.TRIAL])
            )
        ),
    )


async def save(
    db: AsyncSession, admin_id: uuid.UUID, data: AdminSettingsIn
) -> tuple[AdminSettingsOut, dict]:
    """Saves what changed and logs it (`setting`, each as [before,
    after]). Answers the page and the changes."""
    changes = await platform.save(
        db,
        admin_id,
        platform.Platform(
            khr_per_usd=data.khr_per_usd,
            month=data.month,
            year=data.year,
            trial_days=data.trial_days,
        ),
    )
    if changes:
        admin_log.record(
            db, admin_id, "setting", **{key: list(pair) for key, pair in changes.items()}
        )
        await db.commit()
    return await get(db), changes


def changes_text(changes: dict) -> str:
    """ "riel rate 4100 → 4050, month price 9.99 → 8.99"."""
    return ", ".join(f"{NAMES[key]} {a} → {b}" for key, (a, b) in changes.items())
