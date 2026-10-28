"""The admin's Home (founder's pick 3B, 2026-10-28): the numbers across
every shop, then the shops that need the admin."""

from datetime import timedelta
from decimal import Decimal

from sqlalchemy import update

from app.core import clock
from app.db.session import unscoped_session
from app.models import Store
from tests.helpers import add_product, place_order

OVERVIEW = "/api/v1/admin/overview"
PLAN = "/api/v1/seller/plan"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def store_of(client, tokens) -> dict:
    return (await client.get("/api/v1/seller/store", headers=bearer(tokens))).json()


async def set_paid_until(store_id, day) -> None:
    async with unscoped_session() as db:
        await db.execute(update(Store).where(Store.id == store_id).values(paid_until=day))
        await db.commit()


async def test_home_counts_shops_money_and_orders(client, register, admin):
    before = (await client.get(OVERVIEW, headers=bearer(admin))).json()
    paying, trial, setup = await register(), await register(), await register(opened=False)
    shop = await store_of(client, paying)
    await client.post(
        f"/api/v1/admin/shops/{shop['id']}/payments",
        headers=bearer(admin),
        json={"period": "year", "amount": "99.00"},
    )
    cap = await add_product(shop["id"], "cap", stock=5)
    await place_order(client, shop["slug"], [(cap, None, 1)], total="10.00")

    home = (await client.get(OVERVIEW, headers=bearer(admin))).json()

    grew = {k: home["shops"][k] - before["shops"][k] for k in home["shops"]}
    assert grew == {"total": 3, "setup": 1, "trial": 1, "paying": 1, "stopped": 0, "closed": 0}
    assert Decimal(home["collected_month"]) - Decimal(before["collected_month"]) == Decimal("99")
    assert Decimal(home["monthly_income"]) - Decimal(before["monthly_income"]) == Decimal("8.25")
    assert home["orders_today"] - before["orders_today"] == 1
    assert len(home["days"]) == 30
    assert home["days"][-1]["day"] == clock.today().isoformat()
    assert home["days"][-1]["signups"] - before["days"][-1]["signups"] == 3
    assert trial and setup


async def test_home_lists_what_needs_the_admin_waiting_payments_first(client, register, admin):
    claimed, unpaid, ending = await register(), await register(), await register()
    claimed_shop = await store_of(client, claimed)
    unpaid_shop = await store_of(client, unpaid)
    ending_shop = await store_of(client, ending)
    await client.post(f"{PLAN}/paid", headers=bearer(claimed), json={"period": "month"})
    await set_paid_until(unpaid_shop["id"], clock.today() - timedelta(days=2))
    await set_paid_until(ending_shop["id"], clock.today() + timedelta(days=3))

    needs = (await client.get(OVERVIEW, headers=bearer(admin))).json()["needs"]

    mine = {n["store_id"]: n for n in needs}
    assert mine[claimed_shop["id"]]["kind"] == "claim"
    assert mine[claimed_shop["id"]]["amount"] == "9.99"
    assert mine[unpaid_shop["id"]]["kind"] == "unpaid"
    assert mine[ending_shop["id"]]["kind"] == "ending"
    kinds = [n["kind"] for n in needs]
    assert kinds.index("claim") < kinds.index("unpaid") < kinds.index("ending")


async def test_home_is_for_the_admin_only(client, register):
    seller = await register()

    response = await client.get(OVERVIEW, headers=bearer(seller))

    assert response.status_code == 401
