"""The founder's command-line tools (app/admin.py)."""

import pytest
from sqlalchemy import select

from app import admin
from app.db.session import unscoped_session
from app.models import Customer, Delivery, Order, OrderItem, Payment, Product, Seller, Store
from tests.helpers import add_product, place_order, registered_seller


async def test_reset_password_gives_a_working_password_and_logs_out_every_phone(client, register):
    seller = await register()

    password = await admin.reset_password(seller["email"].upper())

    old = await client.post(
        "/api/v1/auth/login", json={"email": seller["email"], "password": "correct-horse"}
    )
    new = await client.post(
        "/api/v1/auth/login", json={"email": seller["email"], "password": password}
    )
    phone = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": seller["refresh_token"]}
    )
    assert old.status_code == 401
    assert new.status_code == 200
    assert phone.status_code == 401


async def test_reset_password_for_an_unknown_email_says_so():
    with pytest.raises(admin.AdminError, match="No account"):
        await admin.reset_password("nobody@example.com")


def test_temporary_passwords_are_long_enough_and_easy_to_read():
    password = admin.temporary_password()
    assert len(password.replace("-", "")) == 12
    assert not set(password) & set("0o1li")


async def test_close_and_reopen_a_shop(client, register):
    seller = await register()
    login = {"email": seller["email"], "password": "correct-horse"}

    slug = await admin.set_shop_open(seller["email"], False)
    closed_login = await client.post("/api/v1/auth/login", json=login)
    closed_page = await client.get(f"/api/v1/shop/{slug}")
    await admin.set_shop_open(seller["email"], True)

    assert closed_login.status_code == 403
    assert closed_page.status_code == 404
    assert (await client.post("/api/v1/auth/login", json=login)).status_code == 200
    assert (await client.get(f"/api/v1/shop/{slug}")).status_code == 200


async def test_erase_only_a_closed_shop_and_only_with_its_link_name(client, register):
    seller = await register()
    slug = (await admin.shop_size(seller["email"])).slug

    with pytest.raises(admin.AdminError, match="Close it first"):
        await admin.erase_shop(seller["email"], slug)
    await admin.set_shop_open(seller["email"], False)
    with pytest.raises(admin.AdminError, match="Nothing was erased"):
        await admin.erase_shop(seller["email"], "not-the-slug")

    assert (await admin.shop_size(seller["email"])).slug == slug


async def test_erasing_removes_the_shop_and_everything_in_it_only(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    _, other_id, other_slug = await registered_seller(client, auth_headers)
    email = (await client.get("/api/v1/seller/account", headers=headers)).json()["email"]
    for shop_id, shop_slug in ((store_id, slug), (other_id, other_slug)):
        cap = await add_product(shop_id, "cap", stock=5)
        assert (await place_order(client, shop_slug, [(cap, None, 1)], total="10.00")).is_success

    size = await admin.shop_size(email)
    await admin.set_shop_open(email, False)
    files = await admin.erase_shop(email, slug)

    assert (size.products, size.orders, size.customers) == (1, 1, 1)
    assert files == 0  # R2 isn't set up in tests
    async with unscoped_session() as db:
        for model in (Store, Product, Order, Customer, OrderItem, Payment, Delivery):
            rows = await db.scalars(select(model.id).where(_store_column(model) == store_id))
            assert rows.all() == [], model.__name__
            others = await db.scalars(select(model.id).where(_store_column(model) == other_id))
            assert others.all(), model.__name__
        assert await db.scalar(select(Seller.id).where(Seller.email == email)) is None


def _store_column(model):
    return model.id if model is Store else model.store_id
