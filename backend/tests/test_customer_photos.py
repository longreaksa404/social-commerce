"""Customers' Telegram profile photos (founder, 2026-10-20): copied to R2
once their Telegram is linked, shown to the seller, replaced when it
changes, gone when they remove or hide it."""

import uuid

import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import tenant_session
from app.models import Customer
from app.services import customer_photos, images, telegram
from tests.helpers import add_product, place_order, registered_seller

R2 = "https://images.example.com"


@pytest.fixture
def storage(monkeypatch):
    """The bot and R2 set up; Telegram's photos and R2's files faked."""
    settings = get_settings()
    for name, value in {
        "telegram_bot_token": "123:abc",
        "telegram_bot_username": "TestShopBot",
        "telegram_webhook_secret": "secret",
        "r2_account_id": "acc",
        "r2_access_key_id": "key",
        "r2_secret_access_key": "secret",
        "r2_bucket": "bucket",
        "r2_public_url": R2,
    }.items():
        monkeypatch.setattr(settings, name, value)
    state = {
        "photos": [[{"file_id": "f1", "file_unique_id": "u1", "width": 160}]],
        "put": [],
        "deleted": [],
    }

    async def fake_call(method, payload):
        if state.get("fail"):
            raise telegram.TelegramError(400, "Bad Request")
        if method == "getUserProfilePhotos":
            return {"total_count": len(state["photos"]), "photos": state["photos"]}
        if method == "getFile":
            return {"file_path": f"photos/{payload['file_id']}.jpg"}
        return {}

    async def fake_download(path):
        return b"jpeg bytes"

    def fake_put(key, body, content_type):
        state["put"].append(key)
        return f"{R2}/{key}"

    monkeypatch.setattr(telegram, "call", fake_call)
    monkeypatch.setattr(customer_photos, "_download", fake_download)
    monkeypatch.setattr(images, "put_file", fake_put)
    monkeypatch.setattr(images, "delete_file", lambda url: state["deleted"].append(url))
    return state


async def a_customer(client, auth_headers, *, telegram_id="4242"):
    """(headers, store_id, customer_id, order_id, slug) of a customer on Telegram."""
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=5)
    order_id = (await place_order(client, slug, [(cap, None, 1)], total="10.00")).json()["id"]
    async with tenant_session(store_id) as db:
        customer = await db.scalar(select(Customer).where(Customer.store_id == store_id))
        customer.telegram_user_id = telegram_id
        await db.commit()
        return headers, store_id, customer.id, order_id, slug


async def photo_of(store_id, customer_id) -> str | None:
    async with tenant_session(store_id) as db:
        return (await db.get(Customer, customer_id)).photo_url


async def test_the_photo_is_copied_and_shown_to_the_seller(client, storage, auth_headers):
    headers, store_id, customer_id, order_id, _ = await a_customer(client, auth_headers)
    await customer_photos.refresh(store_id, customer_id)

    url = f"{R2}/stores/{store_id}/customers/{customer_id}-u1.jpg"
    assert await photo_of(store_id, customer_id) == url
    order = (await client.get(f"/api/v1/seller/orders/{order_id}", headers=headers)).json()
    assert order["customer"]["photo_url"] == url
    page = (await client.get(f"/api/v1/seller/customers/{customer_id}", headers=headers)).json()
    assert page["photo_url"] == url
    # And in the lists (test list #6, 2026-10-24).
    [row] = (await client.get("/api/v1/seller/orders", headers=headers)).json()["orders"]
    assert row["customer_photo_url"] == url
    [listed] = (await client.get("/api/v1/seller/customers", headers=headers)).json()["customers"]
    assert listed["photo_url"] == url

    # The same photo again: nothing copied.
    await customer_photos.refresh(store_id, customer_id)
    assert len(storage["put"]) == 1


async def test_a_new_photo_replaces_the_old_and_none_clears_it(client, storage, auth_headers):
    _, store_id, customer_id, _, _ = await a_customer(client, auth_headers)
    await customer_photos.refresh(store_id, customer_id)
    first = await photo_of(store_id, customer_id)

    storage["photos"] = [[{"file_id": "f2", "file_unique_id": "u2", "width": 320}]]
    await customer_photos.refresh(store_id, customer_id)
    second = await photo_of(store_id, customer_id)
    assert second.endswith("-u2.jpg") and storage["deleted"] == [first]

    storage["photos"] = []  # removed, or hidden from bots
    await customer_photos.refresh(store_id, customer_id)
    assert await photo_of(store_id, customer_id) is None
    assert storage["deleted"] == [first, second]


async def test_nothing_changes_when_telegram_fails_or_they_arent_on_it(
    client, storage, auth_headers
):
    _, store_id, customer_id, _, _ = await a_customer(client, auth_headers)
    storage["fail"] = True
    await customer_photos.refresh(store_id, customer_id)
    assert await photo_of(store_id, customer_id) is None

    storage["fail"] = False
    _, other_store, guest_id, _, _ = await a_customer(client, auth_headers, telegram_id=None)
    await customer_photos.refresh(other_store, guest_id)
    await customer_photos.refresh(other_store, uuid.uuid4())
    assert storage["put"] == []


async def test_an_order_by_a_customer_on_telegram_fetches_the_photo(client, storage, auth_headers):
    """Placing an order refreshes it after the response, in that shop's
    folder only."""
    _, store_id, customer_id, _, slug = await a_customer(client, auth_headers)
    cap = await add_product(store_id, "hat", stock=5)
    placed = await place_order(client, slug, [(cap, None, 1)], total="10.00")
    assert placed.status_code == 201
    assert storage["put"] == [f"stores/{store_id}/customers/{customer_id}-u1.jpg"]
