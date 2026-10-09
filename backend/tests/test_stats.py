"""The shop's numbers on the Orders tab (founder's picks 8B, 9B, 2026-10-09):
which orders count, Phnom Penh days, and the money per period."""

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import update

from app.core import clock
from app.db.session import unscoped_session
from app.models import Order
from app.services.stats import period_days
from tests.helpers import BANK, add_product, place_order, registered_seller, set_payments

STATS = "/api/v1/seller/stats"


def test_period_days():
    today = date(2026, 10, 9)
    week = date(2026, 10, 3)
    assert period_days("today", today) == (today, week, today)
    assert period_days("week", today) == (week, week, today)
    assert period_days("month", today) == (date(2026, 10, 1), date(2026, 10, 1), today)


async def _placed_at(order_id: str, when: datetime) -> None:
    async with unscoped_session() as db:
        await db.execute(
            update(Order).where(Order.id == uuid.UUID(order_id)).values(created_at=when)
        )
        await db.commit()


async def test_todays_orders_sales_and_what_is_still_to_collect(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await set_payments(client, headers, bank_transfer=BANK)
    cap = await add_product(store_id, "cap", stock=20)  # $10.00
    cash = (await place_order(client, slug, [(cap, None, 1)], total="10.00")).json()
    paid = (
        await place_order(
            client, slug, [(cap, None, 2)], total="20.00", payment_method="bank_transfer"
        )
    ).json()
    rejected = (await place_order(client, slug, [(cap, None, 3)], total="30.00")).json()
    await client.patch(
        f"/api/v1/seller/orders/{paid['id']}/payment", headers=headers, json={"status": "paid"}
    )
    await client.patch(
        f"/api/v1/seller/orders/{rejected['id']}/status",
        headers=headers,
        json={"status": "rejected"},
    )

    stats = (await client.get(STATS, headers=headers)).json()

    # The rejected order doesn't count; the cash one is still to collect.
    assert stats["orders"] == 2
    assert stats["sales"] == [{"currency": "USD", "amount": "30.00"}]
    assert stats["to_collect"] == [{"currency": "USD", "amount": "10.00"}]
    assert cash["id"]  # placed
    # Today's card charts the last 7 days, today last.
    assert len(stats["days"]) == 7
    assert stats["days"][-1] == {"date": str(clock.today()), "orders": 2, "sales": "30.00"}


async def test_the_week_and_the_month_count_their_own_days(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    today = clock.today()
    old = (await place_order(client, slug, [(cap, None, 1)], total="10.00")).json()
    recent = (await place_order(client, slug, [(cap, None, 1)], total="10.00")).json()
    # 8 days ago (outside the week) and 3 days ago (inside it), at noon in
    # Phnom Penh (05:00 UTC).
    await _placed_at(
        old["id"],
        datetime.combine(today - timedelta(days=8), datetime.min.time(), UTC) + timedelta(hours=5),
    )
    await _placed_at(
        recent["id"],
        datetime.combine(today - timedelta(days=3), datetime.min.time(), UTC) + timedelta(hours=5),
    )

    today_stats = (await client.get(STATS, headers=headers)).json()
    week = (await client.get(STATS, headers=headers, params={"period": "week"})).json()
    month = (await client.get(STATS, headers=headers, params={"period": "month"})).json()

    assert today_stats["orders"] == 0
    assert week["orders"] == 1
    assert [d["orders"] for d in week["days"]] == [0, 0, 0, 1, 0, 0, 0]
    assert len(month["days"]) == today.day
    in_month = sum(
        1 for d in (today - timedelta(days=8), today - timedelta(days=3)) if d.month == today.month
    )
    assert month["orders"] == in_month


async def test_an_order_counts_for_its_day_in_phnom_penh(client, auth_headers):
    """23:30 UTC yesterday is 06:30 today in Phnom Penh."""
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    order = (await place_order(client, slug, [(cap, None, 1)], total="10.00")).json()
    today = clock.today()
    await _placed_at(
        order["id"], datetime.combine(today, datetime.min.time(), UTC) - timedelta(minutes=30)
    )

    stats = (await client.get(STATS, headers=headers)).json()

    assert stats["orders"] == 1


async def test_numbers_are_for_the_owner_only(client, auth_headers):
    owner, _, _ = await registered_seller(client, auth_headers)
    email = f"helper-{uuid.uuid4().hex[:8]}@example.com"
    added = await client.post(
        "/api/v1/seller/staff",
        headers=owner,
        json={
            "full_name": "Vibol",
            "phone": "097 765 4321",
            "email": email,
            "password": "first-password",
        },
    )
    assert added.status_code == 201, added.text
    login = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "first-password"}
    )
    staff = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = await client.get(STATS, headers=staff)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "OWNER_ONLY"


async def test_numbers_count_only_the_sellers_own_shop(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)
    _, other_store, other_slug = await registered_seller(client, auth_headers)
    cap = await add_product(other_store, "cap", stock=20)
    await place_order(client, other_slug, [(cap, None, 1)], total="10.00")

    stats = (await client.get(STATS, headers=headers)).json()

    assert stats["orders"] == 0
    assert stats["sales"] == []
