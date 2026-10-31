"""The shop's plan with Oak Order (01_PRODUCT.md §33.1): setup until the
owner opens the shop, the 30-day free trial from then, 7 days to pay once
it runs out, then no new orders until the founder records a payment."""

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError

from app import admin
from app.core import clock
from app.core.config import get_settings
from app.db.session import tenant_session, unscoped_session
from app.models import PlanPayment, PlanPeriod, Store
from app.schemas.plan import PlanStage
from app.services.plan import add_months, next_period, open_shop, record_payment, stage
from tests.helpers import add_product, place_order, random_phone, registered_seller, session_of

SIGNED_UP = date(2026, 11, 1)
TRIAL_END = date(2026, 11, 30)  # day 30
PLAN = "/api/v1/seller/plan"


@pytest.fixture
def today(monkeypatch):
    """Phnom Penh's date, set by the test; it starts on the day shops sign up."""

    def set_today(day: date) -> None:
        monkeypatch.setattr(clock, "today", lambda: day)

    set_today(SIGNED_UP)
    return set_today


@pytest.mark.parametrize(
    ("day", "expected"),
    [
        (date(2026, 11, 24), PlanStage.ACTIVE),
        (date(2026, 11, 25), PlanStage.ENDING_SOON),  # day 25: the reminder
        (date(2026, 11, 30), PlanStage.ENDING_SOON),
        (date(2026, 12, 1), PlanStage.OVERDUE),  # day 31: 7 days to pay
        (date(2026, 12, 7), PlanStage.OVERDUE),
        (date(2026, 12, 8), PlanStage.STOPPED),  # day 38: no new orders
    ],
)
def test_the_stages_of_a_trial_ending_on_30_november(day, expected):
    assert stage(TRIAL_END, day) is expected


@pytest.mark.parametrize(
    ("day", "months", "expected"),
    [
        (date(2026, 12, 1), 1, date(2027, 1, 1)),
        (date(2026, 12, 15), 12, date(2027, 12, 15)),
        (date(2027, 1, 28), 1, date(2027, 2, 28)),
        # No 31 February: the 1st of the month after, so no paid day is lost.
        (date(2027, 1, 31), 1, date(2027, 3, 1)),
        (date(2028, 2, 29), 12, date(2029, 3, 1)),
    ],
)
def test_add_months(day, months, expected):
    assert add_months(day, months) == expected


@pytest.mark.parametrize("paid_on", [date(2026, 11, 20), date(2026, 12, 5)])
def test_paying_before_orders_stop_carries_on_from_the_end(paid_on):
    assert next_period(TRIAL_END, paid_on, PlanPeriod.MONTH) == (
        date(2026, 12, 1),
        date(2026, 12, 31),
    )
    assert next_period(TRIAL_END, paid_on, PlanPeriod.YEAR) == (
        date(2026, 12, 1),
        date(2027, 11, 30),
    )


def test_paying_after_orders_stopped_starts_that_day():
    assert next_period(TRIAL_END, date(2026, 12, 10), PlanPeriod.MONTH) == (
        date(2026, 12, 10),
        date(2027, 1, 9),
    )


CHAT_ORDER = {
    "name": "Sokha",
    "phone": "098 765 432",
    "payment_method": "cod",
    "delivery_method": "seller_delivery",
    "delivery_address": "Toul Kork",
    "expected_total": "10.00",
}


async def chat_order(client, headers, product_id):
    """An order the seller adds from a chat (New order)."""
    return await client.post(
        "/api/v1/seller/orders",
        headers=headers,
        json={**CHAT_ORDER, "items": [{"product_id": str(product_id), "quantity": 1}]},
    )


async def test_a_new_shop_is_in_setup_until_opened(client, register, today, monkeypatch):
    # Whatever the local .env says: no Oak payment details.
    for name in ("oak_khqr_account", "oak_bank_name", "oak_bank_account_number"):
        monkeypatch.setattr(get_settings(), name, "")
    seller = await register(opened=False)
    headers = {"Authorization": f"Bearer {seller['access_token']}"}
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    cap = await add_product(store["id"], "cap", stock=5)

    today(date(2026, 11, 20))  # setup has no time limit
    plan = (await client.get(PLAN, headers=headers)).json()
    shop = (await client.get(f"/api/v1/shop/{store['slug']}")).json()
    order = await place_order(client, store["slug"], [(cap, None, 1)], total="10.00")
    chat = await chat_order(client, headers, cap)

    assert plan.pop("code").startswith("OAK-")
    assert plan == {
        "stage": "setup",
        "on_trial": True,
        "paid_until": None,
        "pay_by": None,
        "days_left": None,
        "trial_until": "2026-12-19",  # if opened today
        "trial_days": 30,
        "prices": {"month": "9.99", "year": "99.00"},
        # No OAK_* settings in tests: Settings → Plan says to message Oak Order.
        "pay_to": {"khqr_month": None, "khqr_year": None, "khqr_name": None, "bank": None},
        "claim": None,
        "payments": [],
    }
    # Customers can look around: "Opening soon", no checkout.
    assert (shop["opening_soon"], shop["orders_paused"], shop["orders_resume_on"]) == (
        True,
        True,
        None,
    )
    assert (order.status_code, order.json()["error"]["code"]) == (409, "ORDERS_PAUSED")
    assert (chat.status_code, chat.json()["error"]["code"]) == (409, "SHOP_NOT_OPEN")


async def test_opening_the_shop_starts_a_30_day_free_trial(client, register, today):
    seller = await register(opened=False)
    headers = {"Authorization": f"Bearer {seller['access_token']}"}
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    cap = await add_product(store["id"], "cap", stock=5)

    opened = await client.post(f"{PLAN}/open", headers=headers)
    today(date(2026, 11, 3))
    again = await client.post(f"{PLAN}/open", headers=headers)  # changes nothing
    shop = (await client.get(f"/api/v1/shop/{store['slug']}")).json()
    order = await place_order(client, store["slug"], [(cap, None, 1)], total="10.00")
    chat = await chat_order(client, headers, cap)

    assert opened.status_code == 200, opened.text
    assert {k: opened.json()[k] for k in ("stage", "paid_until", "pay_by", "days_left")} == {
        "stage": "active",
        "paid_until": "2026-11-30",
        "pay_by": "2026-12-07",
        "days_left": 30,
    }
    assert opened.json()["trial_until"] is None
    assert again.json()["paid_until"] == "2026-11-30"
    assert (shop["opening_soon"], shop["orders_paused"]) == (False, False)
    assert order.status_code == 201, order.text
    assert chat.status_code == 201, chat.text


async def test_opening_one_shop_leaves_the_others_in_setup(two_stores, today):
    a, b = two_stores
    async with unscoped_session() as db:
        for ref in (a, b):
            (await db.get(Store, ref.store_id)).paid_until = None
        await db.commit()

    async with tenant_session(a.store_id) as db:
        await open_shop(db, a.store_id)

    async with unscoped_session() as db:
        a_until = (await db.get(Store, a.store_id)).paid_until
        b_until = (await db.get(Store, b.store_id)).paid_until
    assert (a_until, b_until) == (TRIAL_END, None)


async def test_a_payment_before_opening_opens_the_shop_from_that_day(client, register, today):
    seller = await register(opened=False)
    headers = {"Authorization": f"Bearer {seller['access_token']}"}

    today(date(2026, 11, 10))
    preview = await admin.preview_payment(seller["phone"], PlanPeriod.MONTH, None)
    await admin.record_payment(seller["phone"], PlanPeriod.MONTH)
    plan = (await client.get(PLAN, headers=headers)).json()

    assert (preview.covers_from, preview.covers_until, preview.reopens) == (
        date(2026, 11, 10),
        date(2026, 12, 9),
        True,
    )
    assert (plan["stage"], plan["on_trial"], plan["paid_until"]) == ("active", False, "2026-12-09")


async def test_plans_lists_shops_in_setup_last(client, register, today):
    waiting, running = await register(opened=False), await register()

    rows = [
        row for row in await admin.list_plans() if row.login in (waiting["phone"], running["phone"])
    ]

    assert [(row.login, row.paid_until, row.stage) for row in rows] == [
        (running["phone"], TRIAL_END, PlanStage.ACTIVE),
        (waiting["phone"], None, PlanStage.SETUP),
    ]
    assert "not open" in admin._plans_table(rows)


@pytest.mark.parametrize(
    ("day", "expected_stage", "days_left", "takes_orders"),
    [
        (date(2026, 11, 25), "ending_soon", 6, True),
        (date(2026, 12, 7), "overdue", 0, True),
        (date(2026, 12, 8), "stopped", 0, False),
    ],
)
async def test_the_shop_takes_orders_until_7_days_after_its_trial(
    client, auth_headers, today, day, expected_stage, days_left, takes_orders
):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=5)

    today(day)
    plan = (await client.get(PLAN, headers=headers)).json()
    shop = (await client.get(f"/api/v1/shop/{slug}")).json()
    order = await place_order(client, slug, [(cap, None, 1)], total="10.00")

    assert (plan["stage"], plan["days_left"]) == (expected_stage, days_left)
    assert (shop["orders_paused"], shop["orders_resume_on"]) == (not takes_orders, None)
    assert shop["opening_soon"] is False
    if takes_orders:
        assert order.status_code == 201, order.text
    else:
        # Customers hear that orders are off, nothing about the plan.
        assert order.status_code == 409
        assert order.json()["error"]["code"] == "ORDERS_PAUSED"


async def test_a_stopped_shop_finishes_its_orders_but_adds_none_from_chats(
    client, auth_headers, today
):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=5)
    today(date(2026, 12, 6))
    placed = await place_order(client, slug, [(cap, None, 1)], total="10.00")
    assert placed.status_code == 201, placed.text

    today(date(2026, 12, 8))
    accepted = await client.patch(
        f"/api/v1/seller/orders/{placed.json()['id']}/status",
        headers=headers,
        json={"status": "accepted"},
    )
    chat = await chat_order(client, headers, cap)

    assert accepted.status_code == 200, accepted.text
    assert chat.status_code == 409
    assert chat.json()["error"]["code"] == "PLAN_UNPAID"


async def test_staff_can_read_the_plan(client, auth_headers, today):
    owner, _, _ = await registered_seller(client, auth_headers)
    phone = random_phone()
    added = await client.post(
        "/api/v1/seller/staff",
        headers=owner,
        json={"full_name": "Dara", "phone": phone, "password": "first-password"},
    )
    assert added.status_code == 201, added.text
    login = await client.post(
        "/api/v1/auth/login", json={"login": phone, "password": "first-password"}
    )
    staff = {"Authorization": f"Bearer {session_of(login)['access_token']}"}

    plan = await client.get(PLAN, headers=staff)

    assert plan.status_code == 200, plan.text
    assert plan.json()["paid_until"] == "2026-11-30"


async def test_a_payment_in_the_7_days_carries_on_from_the_trial(client, register, today):
    seller = await register()
    headers = {"Authorization": f"Bearer {seller['access_token']}"}

    today(date(2026, 12, 5))
    preview = await admin.preview_payment(seller["phone"], PlanPeriod.MONTH, None)
    paid_until = await admin.record_payment(seller["phone"], PlanPeriod.MONTH, note="ABA, ref 4821")
    plan = (await client.get(PLAN, headers=headers)).json()

    assert (preview.amount, preview.covers_from, preview.covers_until, preview.reopens) == (
        Decimal("9.99"),
        date(2026, 12, 1),
        date(2026, 12, 31),
        False,
    )
    assert paid_until == date(2026, 12, 31)
    assert (plan["stage"], plan["on_trial"], plan["paid_until"]) == (
        "active",
        False,
        "2026-12-31",
    )
    assert [
        (p["period"], p["amount"], p["paid_on"], p["covers_from"], p["covers_until"])
        for p in plan["payments"]
    ] == [("month", "9.99", "2026-12-05", "2026-12-01", "2026-12-31")]


async def test_a_payment_reopens_a_stopped_shop_from_that_day(client, register, today):
    seller = await register()
    headers = {"Authorization": f"Bearer {seller['access_token']}"}
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    cap = await add_product(store["id"], "cap", stock=5)

    today(date(2026, 12, 10))
    preview = await admin.preview_payment(seller["phone"], PlanPeriod.YEAR, Decimal("90.00"))
    await admin.record_payment(seller["phone"], PlanPeriod.YEAR, amount=Decimal("90.00"))
    plan = (await client.get(PLAN, headers=headers)).json()
    order = await place_order(client, store["slug"], [(cap, None, 1)], total="10.00")

    assert preview.reopens is True
    assert plan["paid_until"] == "2027-12-09"
    assert plan["payments"][0]["amount"] == "90.00"
    assert order.status_code == 201, order.text


async def test_payments_are_recorded_for_owners_only(client, auth_headers, today):
    owner, _, _ = await registered_seller(client, auth_headers)
    phone = random_phone()
    await client.post(
        "/api/v1/seller/staff",
        headers=owner,
        json={"full_name": "Dara", "phone": phone, "password": "first-password"},
    )

    with pytest.raises(admin.AdminError, match="staff login"):
        await admin.record_payment(phone, PlanPeriod.MONTH)


async def test_plans_lists_open_shops_soonest_to_run_out_first(client, register, today):
    early, late = await register(), await register()
    await admin.record_payment(late["phone"], PlanPeriod.MONTH)
    today(date(2026, 11, 26))

    rows = [row for row in await admin.list_plans() if row.login in (early["phone"], late["phone"])]

    assert [(row.login, row.paid_until, row.stage, row.paying) for row in rows] == [
        (early["phone"], date(2026, 11, 30), PlanStage.ENDING_SOON, False),
        (late["phone"], date(2026, 12, 31), PlanStage.ACTIVE, True),
    ]


async def test_a_shop_reads_only_its_own_payments_and_cannot_add_any(two_stores, today):
    a, b = two_stores
    async with unscoped_session() as db:
        for ref in (a, b):
            record_payment(
                db, await db.get(Store, ref.store_id), PlanPeriod.MONTH, price=Decimal("9.99")
            )
        await db.commit()

    async with tenant_session(a.store_id) as db:
        seen = (await db.scalars(select(PlanPayment.store_id))).all()
    assert seen == [a.store_id]

    # Seller requests run as app_user, which may only read the table.
    async with tenant_session(a.store_id) as db:
        with pytest.raises(DBAPIError, match="permission denied"):
            await db.execute(
                text(
                    "INSERT INTO plan_payment (id, store_id, period, amount, method, paid_on,"
                    " covers_from, covers_until) VALUES (gen_random_uuid(), :store, 'year', 0,"
                    " 'manual', '2026-11-01', '2026-11-01', '2027-11-01')"
                ),
                {"store": a.store_id},
            )
