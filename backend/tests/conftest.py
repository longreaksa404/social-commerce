"""Tests run against their own database, `<DATABASE_URL db>_test`.

It is created if missing, migrated to head, and emptied at the start of
each run, so local dev data is never touched.
"""

import asyncio
import os
import random
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass

import asyncpg
import pytest
from alembic.config import Config
from sqlalchemy.engine import make_url

from alembic import command
from app.core.config import get_settings

_dev_url = make_url(get_settings().database_url)
TEST_URL = _dev_url.set(database=f"{_dev_url.database}_test")
os.environ["DATABASE_URL"] = TEST_URL.render_as_string(hide_password=False)
os.environ["RATE_LIMIT_ENABLED"] = "false"
get_settings.cache_clear()


async def _prepare_database() -> None:
    admin = await asyncpg.connect(
        user=TEST_URL.username,
        password=TEST_URL.password,
        host=TEST_URL.host,
        port=TEST_URL.port,
        database="postgres",
    )
    try:
        exists = await admin.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", TEST_URL.database
        )
        if not exists:
            await admin.execute(f'CREATE DATABASE "{TEST_URL.database}"')
    finally:
        await admin.close()


asyncio.run(_prepare_database())
command.upgrade(Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini")), "head")


async def _empty_tables() -> None:
    conn = await asyncpg.connect(
        user=TEST_URL.username,
        password=TEST_URL.password,
        host=TEST_URL.host,
        port=TEST_URL.port,
        database=TEST_URL.database,
    )
    try:
        await conn.execute("TRUNCATE seller, store, admin_account RESTART IDENTITY CASCADE")
    finally:
        await conn.close()


asyncio.run(_empty_tables())

# Imported only now, so the engine is built for the test database.
from app.db.session import unscoped_session  # noqa: E402
from app.models import Seller, Store  # noqa: E402
from app.models.account import trial_end  # noqa: E402
from tests.helpers import session_of, verified_phone_check  # noqa: E402


@dataclass
class StoreRef:
    seller_id: uuid.UUID
    store_id: uuid.UUID


@pytest.fixture
async def make_store():
    """Create a seller + store directly in the database (bypasses the API).
    Open (its trial running) unless `opened=False`: in setup."""

    async def _make(opened: bool = True) -> StoreRef:
        tag = uuid.uuid4().hex[:10]
        async with unscoped_session() as db:
            seller = Seller(email=f"{tag}@example.com", password_hash="x", full_name="Test Seller")
            db.add(seller)
            await db.flush()
            store = Store(
                seller_id=seller.id,
                name=f"Store {tag}",
                slug=f"store-{tag}",
                paid_until=trial_end() if opened else None,
            )
            db.add(store)
            await db.commit()
            return StoreRef(seller_id=seller.id, store_id=store.id)

    return _make


@pytest.fixture
async def two_stores(make_store) -> AsyncIterator[tuple[StoreRef, StoreRef]]:
    yield await make_store(), await make_store()


@pytest.fixture
async def client():
    from httpx2 import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
async def register(client):
    """Register a seller through the API, with a phone number already
    shared with the bot; returns its tokens and phone number (its login).
    The shop is opened (its trial started) unless `opened=False`: a new
    shop is in setup until then. It delivers for free, like a shop from
    before the new-shop fee, unless `new_shop_fee=True`: most tests' totals
    leave delivery out."""

    async def _register(
        phone: str | None = None, opened: bool = True, new_shop_fee: bool = False, **overrides
    ) -> dict:
        check_id, phone = await verified_phone_check(phone)
        body = {
            "password": "correct-horse",
            "full_name": "Test Seller",
            "store_name": f"Store {uuid.uuid4().hex[:10]}",
            "phone_check": check_id,
            **overrides,
        }
        response = await client.post("/api/v1/auth/register", json=body)
        assert response.status_code == 201, response.text
        session = session_of(response)
        headers = {"Authorization": f"Bearer {session['access_token']}"}
        if not new_shop_fee:
            store_id = (await client.get("/api/v1/seller/store", headers=headers)).json()["id"]
            async with unscoped_session() as db:
                store = await db.get(Store, uuid.UUID(store_id))
                store.delivery_config = {}
                await db.commit()
        if opened:
            opening = await client.post("/api/v1/seller/plan/open", headers=headers)
            assert opening.status_code == 200, opening.text
        return {**session, "phone": phone}

    return _register


ADMIN_PASSWORD = "admin-horse-battery"


@pytest.fixture
async def admin(client, monkeypatch):
    """An admin account (the admin panel's own login, 01_PRODUCT.md §22.11)
    set up through the API, its number in ADMIN_PHONES: its tokens, phone
    and Telegram id (its "I've paid" alerts go there)."""
    from app.api.session_cookie import ADMIN_REFRESH_COOKIE
    from app.core.config import get_settings

    telegram_user_id = random.randrange(10**9, 10**10)
    check_id, phone = await verified_phone_check(telegram_user_id=telegram_user_id)
    monkeypatch.setattr(get_settings(), "admin_phones", f"+855 {phone[1:]}")
    response = await client.post(
        "/api/v1/admin/auth/setup", json={"phone_check": check_id, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 201, response.text
    return {
        **response.json(),
        "refresh_token": response.cookies[ADMIN_REFRESH_COOKIE],
        "phone": phone,
        "telegram_user_id": telegram_user_id,
    }


@pytest.fixture
async def auth_headers(register):
    """Bearer headers for a freshly registered seller."""

    async def _headers() -> dict[str, str]:
        tokens = await register()
        return {"Authorization": f"Bearer {tokens['access_token']}"}

    return _headers
