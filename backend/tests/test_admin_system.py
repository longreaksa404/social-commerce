"""The admin's System page (01_PRODUCT.md §22.11, parts 24 to 27): speed
and errors counted in memory, the jobs and Run now, the bot, the database,
the services by name only."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete

from app.core.config import get_settings
from app.db.session import unscoped_session
from app.models import PlatformSetting
from app.services import jobs, monitor

ADMIN = "/api/v1/admin"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def forget_runs() -> None:
    async with unscoped_session() as db:
        await db.execute(delete(PlatformSetting).where(PlatformSetting.key.like("job:%")))
        await db.commit()


async def test_the_system_page_says_what_the_server_knows(client, register, admin, monkeypatch):
    monkeypatch.setattr(get_settings(), "google_client_id", "client-id.apps.googleusercontent.com")
    seller = await register()
    await client.get("/api/v1/seller/store", headers=bearer(seller))
    await forget_runs()

    page = await client.get(f"{ADMIN}/system", headers=bearer(admin))

    assert page.status_code == 200, page.text
    body = page.json()
    assert body["speed"]["requests"] >= 1
    assert body["speed"]["typical_ms"] is not None
    assert {s["name"]: s["set"] for s in body["services"]}["Google login"] is True
    assert "client-id" not in page.text  # names only, never a key
    assert [(j["name"], j["late"]) for j in body["jobs"]] == [
        ("billing", True),
        ("reminders", True),
    ]
    assert body["database_bytes"] > 0
    assert body["bot"]["set_up"] is False  # no bot in tests


async def test_the_route_is_counted_not_the_address(client, register):
    seller = await register()
    store = (await client.get("/api/v1/seller/store", headers=bearer(seller))).json()
    await client.get(f"/api/v1/shop/{store['slug']}")

    routes = {r.route for r in monitor._recent}

    assert "/shop/{store_slug}" in routes
    assert f"/shop/{store['slug']}" not in routes


async def test_run_now_saves_the_run_and_is_logged(client, admin):
    await forget_runs()

    ran = await client.post(f"{ADMIN}/jobs/billing/run", headers=bearer(admin))
    page = (await client.get(f"{ADMIN}/system", headers=bearer(admin))).json()
    unknown = await client.post(f"{ADMIN}/jobs/backup/run", headers=bearer(admin))

    assert ran.status_code == 200 and ran.json() == {"sent": 0}
    billing = next(j for j in page["jobs"] if j["name"] == "billing")
    assert billing["late"] is False and billing["last_sent"] == 0
    line = (await client.get(f"{ADMIN}/log", headers=bearer(admin))).json()[0]
    assert line["action"] == "run_job" and line["details"]["job"] == "billing"
    assert unknown.status_code == 422


async def test_cron_job_orgs_call_saves_the_run_too(client, admin, monkeypatch):
    monkeypatch.setattr(get_settings(), "billing_cron_secret", "cron-secret")
    await forget_runs()

    started = await client.post("/api/v1/reminders/run", headers={"X-Cron-Secret": "cron-secret"})
    page = (await client.get(f"{ADMIN}/system", headers=bearer(admin))).json()

    assert started.status_code == 202
    reminders = next(j for j in page["jobs"] if j["name"] == "reminders")
    assert reminders["late"] is False


def test_a_job_is_late_after_its_time():
    now = datetime(2026, 10, 31, 9, tzinfo=UTC)
    ran = {"at": (now - timedelta(hours=3)).isoformat(), "sent": 0}

    assert jobs.late("reminders", ran, now) is True  # hourly
    assert jobs.late("billing", ran, now) is False  # daily
    assert jobs.late("billing", None, now) is True  # never ran
