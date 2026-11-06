"""Render's free hours (services/awake.py, founder 2026-11-06): the server
counts its own awake time, the System page shows it and the bell warns
before the month's 750 hours run out."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete

from app.db.session import unscoped_session
from app.models import PlatformSetting
from app.services import admin_notices, awake

ADMIN = "/api/v1/admin"


def at(day: int, hour: int = 0, month: int = 11) -> datetime:
    return datetime(2026, month, day, hour, tzinfo=UTC)


def test_awake_time_across_a_month_end_counts_in_both_months():
    stored = awake.add({}, at(31, 22, month=10), at(1, 3))

    assert stored == {
        "2026-10": {"seconds": 2 * 3600, "from": at(31, 22, month=10).isoformat()},
        "2026-11": {"seconds": 3 * 3600, "from": at(1).isoformat()},
    }
    # More time adds up; only this month and the last are kept.
    later = awake.add(stored, at(1, 7, month=12), at(1, 8, month=12))
    assert later["2026-11"]["seconds"] == 3 * 3600
    assert later["2026-12"]["seconds"] == 3600
    assert "2026-10" not in later


def test_the_pace_waits_for_two_days_then_warns_before_the_hours_run_out():
    # 18 hours a day since the 1st: 540 a month, fine.
    stored = {"2026-11": {"seconds": 5 * 18 * 3600, "from": at(1).isoformat()}}
    fine = awake.usage(stored, at(6), since=at(6), limit=750)
    assert (fine.used, fine.on_pace, fine.low, fine.over) == (90, 540, False, False)
    assert fine.from_month_start

    # 24 hours a day: 720 a month, on pace for over 93% of 750.
    stored = {"2026-11": {"seconds": 5 * 24 * 3600, "from": at(1).isoformat()}}
    busy = awake.usage(stored, at(6), since=at(6), limit=750)
    assert (busy.on_pace, busy.low, busy.over) == (720, True, False)
    notice = admin_notices.hours_notice(busy, at(6))
    assert notice is not None and notice.severity == "warning"
    assert notice.text == "About 120 of 750 hours used · on pace for 720"

    # Nearly all used: urgent, a new notice.
    stored = {"2026-11": {"seconds": 700 * 3600, "from": at(1).isoformat()}}
    over = awake.usage(stored, at(29, 4), since=at(29, 4), limit=750)
    urgent = admin_notices.hours_notice(over, at(29, 4))
    assert over.over and urgent is not None and urgent.severity == "urgent"
    assert urgent.key != notice.key

    # Counting began mid-month: no pace for two days, and said so.
    stored = {"2026-11": {"seconds": 24 * 3600, "from": at(6).isoformat()}}
    new = awake.usage(stored, at(7, 12), since=at(7, 12), limit=750)
    assert new.on_pace is None and not new.low and not new.from_month_start
    assert admin_notices.hours_notice(new, at(7, 12)) is None


async def test_saving_adds_the_time_since_the_last_save_once(monkeypatch):
    async with unscoped_session() as db:
        await db.execute(delete(PlatformSetting).where(PlatformSetting.key == awake.KEY))
        await db.commit()
    monkeypatch.setattr(awake, "_since", at(6, 10))

    async with unscoped_session() as db:
        # Under 15 minutes since the last save: nothing written.
        assert await awake.save(db, now=at(6, 10) + timedelta(minutes=5)) == {}
        stored = await awake.save(db, now=at(6, 12))
        again = await awake.save(db, now=at(6, 12), force=True)

    assert stored == {"2026-11": {"seconds": 2 * 3600, "from": at(6, 10).isoformat()}}
    assert again == stored
    async with unscoped_session() as db:
        row = await db.get(PlatformSetting, awake.KEY)
        assert row.value == stored


async def test_the_system_page_shows_the_hours_only_on_render(client, admin, monkeypatch):
    page = await client.get(
        f"{ADMIN}/system", headers={"Authorization": f"Bearer {admin['access_token']}"}
    )
    assert page.json()["server_hours"] is None

    monkeypatch.setenv("RENDER", "true")
    page = await client.get(
        f"{ADMIN}/system", headers={"Authorization": f"Bearer {admin['access_token']}"}
    )
    hours = page.json()["server_hours"]
    assert hours["limit"] == 750 and hours["used"] >= 0
