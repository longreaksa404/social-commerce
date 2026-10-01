"""Tests run against their own database, `<DATABASE_URL db>_test`.

It is created if missing, migrated to head, and emptied at the start of
each run, so local dev data is never touched.
"""

import asyncio
import os
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
        await conn.execute("TRUNCATE seller, store RESTART IDENTITY CASCADE")
    finally:
        await conn.close()


asyncio.run(_empty_tables())

# Imported only now, so the engine is built for the test database.
from app.db.session import unscoped_session  # noqa: E402
from app.models import Seller, Store  # noqa: E402


@dataclass
class StoreRef:
    seller_id: uuid.UUID
    store_id: uuid.UUID


@pytest.fixture
async def make_store():
    """Create a seller + store directly in the database (bypasses the API)."""

    async def _make() -> StoreRef:
        tag = uuid.uuid4().hex[:10]
        async with unscoped_session() as db:
            seller = Seller(
                email=f"{tag}@example.com",
                password_hash="x",
                full_name="Test Seller",
                phone="012345678",
            )
            db.add(seller)
            await db.flush()
            store = Store(seller_id=seller.id, name=f"Store {tag}", slug=f"store-{tag}")
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
    """Register a seller through the API; returns the token pair."""

    async def _register(**overrides) -> dict:
        tag = uuid.uuid4().hex[:10]
        body = {
            "email": f"{tag}@example.com",
            "password": "correct-horse",
            "full_name": "Test Seller",
            "phone": "012 345 678",
            "store_name": f"Store {tag}",
            **overrides,
        }
        response = await client.post("/api/v1/auth/register", json=body)
        assert response.status_code == 201, response.text
        return {**response.json(), "email": body["email"]}

    return _register


@pytest.fixture
async def auth_headers(register):
    """Bearer headers for a freshly registered seller."""

    async def _headers() -> dict[str, str]:
        tokens = await register()
        return {"Authorization": f"Bearer {tokens['access_token']}"}

    return _headers
