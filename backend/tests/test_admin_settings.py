"""Oak Order's own settings from the admin (01_PRODUCT.md §22.11, D2B):
the prices, the trial length and the riel rate, read by Settings → Plan,
"I've paid", Mark paid, opening a shop, a currency switch and the Terms."""

from datetime import timedelta

import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import DBAPIError

from app.core import clock
from app.db.session import tenant_session, unscoped_session
from app.models import PlatformSetting
from tests.conftest import ADMIN_PASSWORD

SETTINGS = "/api/v1/admin/settings"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.fixture(autouse=True)
async def defaults():
    """Every test starts, and leaves, with nothing saved."""
    yield
    async with unscoped_session() as db:
        await db.execute(delete(PlatformSetting))
        await db.commit()


async def save(client, admin, **changes):
    await client.post(
        "/api/v1/admin/auth/password", headers=bearer(admin), json={"password": ADMIN_PASSWORD}
    )
    body = {"khr_per_usd": 4100, "month": "9.99", "year": "99.00", "trial_days": 30, **changes}
    return await client.put(SETTINGS, headers=bearer(admin), json=body)


async def test_saving_needs_the_password_again_and_is_logged(client, admin):
    refused = await client.put(
        SETTINGS,
        headers=bearer(admin),
        json={"khr_per_usd": 4050, "month": "9.99", "year": "99.00", "trial_days": 30},
    )
    saved = await save(client, admin, khr_per_usd=4050, month="8.99")

    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "PASSWORD_AGAIN"
    assert saved.status_code == 200, saved.text
    assert (saved.json()["khr_per_usd"], saved.json()["month"]) == (4050, "8.99")
    line = (await client.get("/api/v1/admin/log", headers=bearer(admin))).json()[0]
    assert line["action"] == "setting"
    assert line["details"]["khr_per_usd"] == [4100, 4050]
    assert line["details"]["month"] == ["9.99", "8.99"]
    assert "year" not in line["details"]


async def test_new_prices_reach_the_plan_ive_paid_and_mark_paid(client, register, admin):
    await save(client, admin, month="7.50", year="75.00")
    seller = await register()
    headers = bearer(seller)
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()

    plan = (await client.get("/api/v1/seller/plan", headers=headers)).json()
    claimed = await client.post(
        "/api/v1/seller/plan/paid", headers=headers, json={"period": "year"}
    )
    marked = await client.post(
        f"/api/v1/admin/shops/{store['id']}/payments",
        headers=bearer(admin),
        json={"period": "month"},
    )
    public = (await client.get("/api/v1/plan/prices")).json()

    assert (plan["prices"]["month"], plan["prices"]["year"]) == ("7.50", "75.00")
    assert claimed.json()["claim"]["amount"] == "75.00"
    assert marked.json()["payments"][0]["amount"] == "7.50"
    assert (public["month"], public["year"], public["trial_days"]) == ("7.50", "75.00", 30)
    assert public["changed_on"] == clock.today().isoformat()


async def test_a_new_trial_length_for_shops_opened_from_now(client, register, admin):
    await save(client, admin, trial_days=14)
    seller = await register(opened=False)
    headers = bearer(seller)

    before = (await client.get("/api/v1/seller/plan", headers=headers)).json()
    opened = (await client.post("/api/v1/seller/plan/open", headers=headers)).json()

    assert before["trial_days"] == 14
    assert opened["paid_until"] == (clock.today() + timedelta(days=13)).isoformat()


async def test_a_currency_switch_uses_the_saved_rate(client, register, admin):
    await save(client, admin, khr_per_usd=4000)
    seller = await register()
    headers = bearer(seller)
    await client.patch(
        "/api/v1/seller/store",
        headers=headers,
        json={"delivery_settings": {"enabled": True, "fee": "1.50", "couriers": []}},
    )

    riel = await client.patch("/api/v1/seller/store", headers=headers, json={"currency": "KHR"})

    assert riel.status_code == 200, riel.text
    assert riel.json()["khr_per_usd"] == 4000
    assert riel.json()["delivery_settings"]["fee"] == "6000.00"


async def test_a_shop_reads_the_settings_but_cannot_change_them(two_stores):
    a, _ = two_stores
    async with tenant_session(a.store_id) as db:
        assert (await db.scalars(select(PlatformSetting))).all() == []
        db.add(PlatformSetting(key="prices", value={"month": "0.01", "year": "0.01"}))
        with pytest.raises(DBAPIError):
            await db.flush()
