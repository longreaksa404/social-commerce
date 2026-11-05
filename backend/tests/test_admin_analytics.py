"""The admin's Analytics (services/admin_analytics.py): Oak Order's money
from plan payments only, paying shops from the periods paid, test shops
left out, and nothing invented for months with no records."""

from datetime import timedelta
from decimal import Decimal

from sqlalchemy import update

from app.core import clock
from app.db.session import unscoped_session
from app.models import PlanPayment, Store
from tests.helpers import add_product, place_order

ADMIN = "/api/v1/admin"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def analytics(client, admin, months=12) -> dict:
    found = await client.get(f"{ADMIN}/analytics", params={"months": months}, headers=bearer(admin))
    assert found.status_code == 200, found.text
    return found.json()


async def test_paying_shops_and_money_come_from_paid_periods(client, register, admin):
    before = await analytics(client, admin)
    this_month = before["months"][-1]
    monthly = await register()
    yearly = await register()
    free = await register()
    ids = {}
    for name, tokens in (("monthly", monthly), ("yearly", yearly), ("free", free)):
        ids[name] = (await client.get("/api/v1/seller/store", headers=bearer(tokens))).json()["id"]
    for name, body in (
        ("monthly", {"period": "month", "amount": "9.99"}),
        ("yearly", {"period": "year", "amount": "99.00"}),
        ("free", {"period": "month", "amount": "0"}),
    ):
        paid = await client.post(
            f"{ADMIN}/shops/{ids[name]}/payments", headers=bearer(admin), json=body
        )
        assert paid.status_code == 200, paid.text
    # A test shop's payment is left out of everything.
    test = (await client.post(f"{ADMIN}/test-shop", headers=bearer(admin), json={})).json()
    await client.post(
        f"{ADMIN}/shops/{test['store_id']}/payments",
        headers=bearer(admin),
        json={"period": "year", "amount": "99.00"},
    )

    after = await analytics(client, admin)
    month = after["months"][-1]

    assert len(after["months"]) == 12
    assert month["month"] == f"{clock.today():%Y-%m}"
    assert Decimal(month["collected"]) - Decimal(this_month["collected"]) == Decimal("108.99")
    assert Decimal(month["collected_year_plans"]) - Decimal(
        this_month["collected_year_plans"]
    ) == Decimal("99.00")
    assert month["payments"] - this_month["payments"] == 2  # $0 isn't a payment
    assert month["paying"] - this_month["paying"] == 2  # free time isn't paying
    # $9.99 + $99 / 12 = $18.24 a month.
    assert Decimal(month["monthly_value"]) - Decimal(this_month["monthly_value"]) == Decimal(
        "18.24"
    )
    assert month["signups"] - this_month["signups"] == 3
    assert after["converted"] - before["converted"] == 2
    assert after["test_shops"] == before["test_shops"] + 1


async def test_orders_are_counted_not_added_as_money(client, register, admin):
    seller = await register()
    store = (await client.get("/api/v1/seller/store", headers=bearer(seller))).json()
    product = await add_product(store["id"], "tee", stock=5)
    before = (await analytics(client, admin, months=1))["months"][-1]

    placed = await place_order(client, store["slug"], [(product, None, 1)], total="10.00")
    assert placed.status_code == 201, placed.text

    month = (await analytics(client, admin, months=1))["months"][-1]
    assert month["orders"] == before["orders"] + 1
    assert month["active_shops"] >= 1
    assert month["collected"] == before["collected"]  # a seller's sale isn't Oak Order's money


async def test_a_paid_period_that_ended_without_another_is_not_renewed(client, register, admin):
    seller = await register()
    store_id = (await client.get("/api/v1/seller/store", headers=bearer(seller))).json()["id"]
    await client.post(
        f"{ADMIN}/shops/{store_id}/payments",
        headers=bearer(admin),
        json={"period": "month", "amount": "9.99"},
    )
    before = await analytics(client, admin)
    # Move its period back: it ended 10 days ago, past the 7 days to pay.
    today = clock.today()
    async with unscoped_session() as db:
        await db.execute(
            update(PlanPayment)
            .where(PlanPayment.store_id == store_id)
            .values(covers_from=today - timedelta(days=40), covers_until=today - timedelta(days=10))
        )
        await db.execute(
            update(Store).where(Store.id == store_id).values(paid_until=today - timedelta(days=10))
        )
        await db.commit()

    after = await analytics(client, admin)

    assert after["renewals_due"] == before["renewals_due"] + 1
    assert after["renewed"] == before["renewed"]
    assert after["months"][-1]["paying"] == before["months"][-1]["paying"] - 1


async def test_the_range_is_bounded(client, admin):
    assert (
        await client.get(f"{ADMIN}/analytics", params={"months": 0}, headers=bearer(admin))
    ).status_code == 422
    assert (
        await client.get(f"{ADMIN}/analytics", params={"months": 37}, headers=bearer(admin))
    ).status_code == 422
    assert len((await analytics(client, admin, months=36))["months"]) == 36
