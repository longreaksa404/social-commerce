"""The admin's bell (services/admin_notices.py): notices made from the
records each time, with only which ones are read kept apart, and a seller
login never sees them."""

from datetime import timedelta

from sqlalchemy import delete, select, update

from app.core import clock
from app.db.session import unscoped_session
from app.models import PlatformSetting, Store
from app.services import platform

ADMIN = "/api/v1/admin"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def set_paid_until(store_id, days_from_today: int) -> str:
    until = clock.today() + timedelta(days=days_from_today)
    async with unscoped_session() as db:
        await db.execute(update(Store).where(Store.id == store_id).values(paid_until=until))
        await db.commit()
    return until.isoformat()


async def forget_read() -> None:
    async with unscoped_session() as db:
        await db.execute(delete(PlatformSetting).where(PlatformSetting.key.like("notices:%")))
        await db.commit()


async def test_a_notice_is_one_per_cause_and_read_is_kept_apart(client, register, admin):
    await forget_read()
    seller = await register()
    store = (await client.get("/api/v1/seller/store", headers=bearer(seller))).json()
    until = await set_paid_until(store["id"], 2)

    first = (await client.get(f"{ADMIN}/notices", headers=bearer(admin))).json()
    again = (await client.get(f"{ADMIN}/notices", headers=bearer(admin))).json()
    key = f"ending:{store['id']}:{until}"
    ending = [n for n in first["items"] if n["key"] == key]

    assert len(ending) == 1 and ending[0]["read"] is False
    assert ending[0]["href"] == f"/admin/shops/{store['id']}"
    assert [n["key"] for n in again["items"]].count(key) == 1  # no duplicate

    marked = await client.post(f"{ADMIN}/notices/read", headers=bearer(admin), json={"keys": [key]})
    assert marked.status_code == 200, marked.text
    after = {n["key"]: n["read"] for n in marked.json()["items"]}
    assert after[key] is True
    assert marked.json()["unread"] == first["unread"] - 1

    # A new paid-until date is a new cause: a new, unread notice; the old
    # one has gone, and so has its read mark.
    until = await set_paid_until(store["id"], -3)
    now = (await client.get(f"{ADMIN}/notices", headers=bearer(admin))).json()
    keys = {n["key"]: n for n in now["items"]}
    assert key not in keys
    unpaid = keys[f"unpaid:{store['id']}:{until}"]
    assert unpaid["read"] is False and unpaid["severity"] == "urgent"

    every = await client.post(f"{ADMIN}/notices/read", headers=bearer(admin), json={"all": True})
    assert every.json()["unread"] == 0
    async with unscoped_session() as db:
        kept = [
            row.value
            for row in await db.scalars(
                select(PlatformSetting).where(PlatformSetting.key.like("notices:%"))
            )
        ]
    assert kept and key not in kept[0]  # trimmed to the notices of the moment

    # Reading a notice changed nothing about the shop.
    shop = (await client.get(f"{ADMIN}/shops/{store['id']}", headers=bearer(admin))).json()
    assert shop["stage"] == "overdue" and shop["paid_until"] == until


async def test_a_seller_login_never_reaches_the_bell(client, register, admin):
    seller = await register()

    assert (await client.get(f"{ADMIN}/notices", headers=bearer(seller))).status_code == 401
    refused = await client.post(f"{ADMIN}/notices/read", headers=bearer(seller), json={"all": True})
    assert refused.status_code == 401
    assert (await client.get(f"{ADMIN}/analytics", headers=bearer(seller))).status_code == 401


async def test_a_claim_is_a_notice_until_it_is_checked(client, register, admin):
    seller = await register()
    store = (await client.get("/api/v1/seller/store", headers=bearer(seller))).json()
    claim = (
        await client.post(
            "/api/v1/seller/plan/paid", headers=bearer(seller), json={"period": "month"}
        )
    ).json()["claim"]

    items = (await client.get(f"{ADMIN}/notices", headers=bearer(admin))).json()["items"]
    found = [n for n in items if n["key"] == f"claim:{claim['id']}"]
    assert found and found[0]["severity"] == "action"

    await client.post(
        f"{ADMIN}/shops/{store['id']}/payments/{claim['id']}/confirm",
        headers=bearer(admin),
        json={"amount": None, "note": None},
    )
    items = (await client.get(f"{ADMIN}/notices", headers=bearer(admin))).json()["items"]
    assert not [n for n in items if n["kind"] == "claim" and n["href"].endswith(store["id"])]


async def test_a_failed_job_and_a_missing_backup_are_notices(client, admin):
    async with unscoped_session() as db:
        await db.execute(delete(PlatformSetting).where(PlatformSetting.key.like("job:%")))
        await db.commit()
        await platform.record_failure(db, "billing", "TimeoutError")

    items = (await client.get(f"{ADMIN}/notices", headers=bearer(admin))).json()["items"]
    kinds = {n["kind"]: n for n in items}

    assert kinds["job_failed"]["severity"] == "urgent"
    assert "TimeoutError" in kinds["job_failed"]["text"]
    assert kinds["job_failed"]["href"] == "/admin/system#jobs"
    assert kinds["backup_late"]["title"] == "No backup reported yet"
