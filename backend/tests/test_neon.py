"""Neon's compute hours (services/neon.py, founder 2026-11-06): the System
page shows them and the bell warns before the plan's run out. No real
network calls: Neon's answer is faked."""

from datetime import UTC, datetime

import httpx
import pytest

from app.core.config import get_settings
from app.services import admin_notices, neon

ADMIN = "/api/v1/admin"


def at(day: int, hour: int = 0, month: int = 11) -> datetime:
    return datetime(2026, month, day, hour, tzinfo=UTC)


def project(
    cu_hours: float, start: str = "2026-11-01T00:00:00Z", end: str = "2026-12-01T00:00:00Z"
):
    return {
        "compute_time_seconds": cu_hours * 3600,
        "consumption_period_start": start,
        "consumption_period_end": end,
    }


@pytest.fixture(autouse=True)
def fresh_cache(monkeypatch):
    monkeypatch.setattr(neon, "_cache", None)


def test_the_pace_waits_for_two_days_then_warns_before_the_hours_run_out():
    # 2.84 CU-hours by the 6th (Neon's Usage page, 2026-11-06): fine.
    fine = neon.usage(project(2.84), at(6), limit=100)
    assert (fine.used, fine.limit, fine.low, fine.over) == (2.8, 100, False, False)
    assert fine.on_pace == 17  # 2.84 over 5 days, for 30 days

    # Under 2 days counted: no pace, and no warning from it.
    early = neon.usage(project(1), at(2, 12), limit=100)
    assert early.on_pace is None and not early.low

    # On pace for the allowance (20 in 5 days = 120 a month): warning.
    busy = neon.usage(project(20), at(6), limit=100)
    assert (busy.on_pace, busy.low, busy.over) == (120, True, False)

    # 70% used is a warning even before the pace is known; 90% is urgent.
    assert neon.usage(project(70), at(1, 12), limit=100).low
    nearly = neon.usage(project(90), at(20), limit=100)
    assert nearly.low and nearly.over


def test_neons_own_billing_period_is_used_when_it_is_about_a_month_else_the_calendar_month():
    anchored = project(10, "2026-10-20T00:00:00Z", "2026-11-20T00:00:00Z")
    assert neon.period(anchored, at(6)) == (at(20, month=10), at(20))
    # A period that isn't about a month long (or isn't now) is not trusted.
    short = project(10, "2026-11-06T11:30:00Z", "2026-11-06T12:00:00Z")
    assert neon.period(short, at(6, 11)) == (at(1), at(1, month=12))
    assert neon.period({}, at(6)) == (at(1), at(1, month=12))


def test_the_bell_warns_once_then_urgent_and_not_when_neon_cant_be_read():
    busy = neon.usage(project(20), at(6), limit=100)
    warning = admin_notices.compute_notice(busy, at(6))
    assert warning is not None and warning.kind == "database_compute"
    assert warning.severity == "warning" and warning.href == "/admin/system#database"
    assert warning.title == "Database compute running low"
    assert warning.text == "About 20 of 100 hours used · on pace for 120"

    urgent = admin_notices.compute_notice(neon.usage(project(92), at(20), limit=100), at(20))
    assert urgent is not None and urgent.severity == "urgent"
    assert urgent.key != warning.key

    assert admin_notices.compute_notice(neon.usage(project(2.84), at(6), limit=100), at(6)) is None
    assert admin_notices.compute_notice(neon.unreadable(100), at(6)) is None
    assert admin_notices.compute_notice(None, at(6)) is None


def test_a_neon_answer_without_compute_time_is_refused():
    with pytest.raises(ValueError):
        neon.usage({"consumption_period_start": "2026-11-01T00:00:00Z"}, at(6), limit=100)


def _set(monkeypatch, key="napi_secret_value", project_id="proj-1", hours=100):
    s = get_settings()
    monkeypatch.setattr(s, "neon_api_key", key)
    monkeypatch.setattr(s, "neon_project_id", project_id)
    monkeypatch.setattr(s, "neon_compute_hours", hours)


REAL_CLIENT = httpx.AsyncClient


def _fake(monkeypatch, handler):
    def client(*args, **kwargs):
        return REAL_CLIENT(*args, transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(neon.httpx, "AsyncClient", client)


async def test_it_reads_the_project_once_in_fifteen_minutes_with_the_key(monkeypatch):
    _set(monkeypatch)
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"project": project(2.84)})

    _fake(monkeypatch, handler)
    first = await neon.state()
    second = await neon.state()

    assert first is not None and first.readable and first.used is not None
    assert second == first
    assert len(calls) == 1  # the second answer came from memory
    assert str(calls[0].url) == "https://console.neon.tech/api/v2/projects/proj-1"
    assert calls[0].headers["authorization"] == "Bearer napi_secret_value"


async def test_it_is_off_without_the_key_the_project_or_with_zero_hours(monkeypatch):
    _fake(monkeypatch, lambda request: pytest.fail("Neon must not be called"))
    for key, project_id, hours in [("", "p", 100), ("k", "", 100), ("k", "p", 0)]:
        _set(monkeypatch, key, project_id, hours)
        assert await neon.state() is None


@pytest.mark.parametrize(
    "answer",
    [
        httpx.Response(401, json={"message": "unauthorized"}),
        httpx.Response(200, json={"nothing": 1}),
        httpx.Response(200, json={"project": {"compute_time_seconds": "lots"}}),
        httpx.ConnectTimeout("slow"),
    ],
)
async def test_a_failing_neon_is_unreadable_never_an_error_or_a_leak(monkeypatch, caplog, answer):
    _set(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        if isinstance(answer, Exception):
            raise answer
        return answer

    _fake(monkeypatch, handler)
    state = await neon.state()

    assert state is not None and not state.readable and state.used is None
    assert "napi_secret_value" not in caplog.text


async def test_a_failure_is_remembered_for_a_short_while_not_asked_again_each_poll(monkeypatch):
    _set(monkeypatch)
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        return httpx.Response(503)

    _fake(monkeypatch, handler)
    await neon.state()
    await neon.state()
    assert len(calls) == 1


async def test_the_system_page_and_the_bell_survive_neon_failing(client, admin, monkeypatch):
    headers = {"Authorization": f"Bearer {admin['access_token']}"}
    off = await client.get(f"{ADMIN}/system", headers=headers)
    assert off.json()["database_compute"] is None

    _set(monkeypatch)
    _fake(monkeypatch, lambda request: httpx.Response(500))
    page = await client.get(f"{ADMIN}/system", headers=headers)
    assert page.status_code == 200
    assert page.json()["database_compute"]["readable"] is False
    bell = await client.get(f"{ADMIN}/notices", headers=headers)
    assert bell.status_code == 200
    assert "database_compute" not in {n["kind"] for n in bell.json()["items"]}

    monkeypatch.setattr(neon, "_cache", None)
    _fake(monkeypatch, lambda request: httpx.Response(200, json={"project": project(80)}))
    page = await client.get(f"{ADMIN}/system", headers=headers)
    compute = page.json()["database_compute"]
    assert compute["readable"] and compute["limit"] == 100 and compute["low"]
    bell = await client.get(f"{ADMIN}/notices", headers=headers)
    kinds = {n["kind"] for n in bell.json()["items"]}
    assert "database_compute" in kinds
    assert "napi_secret_value" not in page.text + bell.text
