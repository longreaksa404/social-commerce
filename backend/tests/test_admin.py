"""The founder's command-line tools (app/admin.py)."""

import pytest
from sqlalchemy import select

from app import admin
from app.db.session import unscoped_session
from app.models import Customer, Delivery, Order, OrderItem, Payment, Product, Seller, Store
from tests.helpers import add_product, place_order, refresh, registered_seller


async def test_reset_password_gives_a_working_password_and_logs_out_every_phone(client, register):
    seller = await register()

    password = await admin.reset_password(f"+855 {seller['phone'][1:]}")

    old = await client.post(
        "/api/v1/auth/login", json={"login": seller["phone"], "password": "correct-horse"}
    )
    new = await client.post(
        "/api/v1/auth/login", json={"login": seller["phone"], "password": password}
    )
    phone = await refresh(client, seller["refresh_token"])
    assert old.status_code == 401
    assert new.status_code == 200
    assert phone.status_code == 401


async def test_reset_password_for_an_unknown_login_says_so():
    for login in ("nobody@example.com", "012 000 002", "nobody"):
        with pytest.raises(admin.AdminError, match="No account"):
            await admin.reset_password(login)


def test_temporary_passwords_are_long_enough_and_easy_to_read():
    password = admin.temporary_password()
    assert len(password.replace("-", "")) == 12
    assert not set(password) & set("0o1li")


async def test_close_and_reopen_a_shop(client, register):
    seller = await register()
    login = {"login": seller["phone"], "password": "correct-horse"}

    slug = await admin.set_shop_open(seller["phone"], False)
    closed_login = await client.post("/api/v1/auth/login", json=login)
    closed_page = await client.get(f"/api/v1/shop/{slug}")
    await admin.set_shop_open(seller["phone"], True)

    assert closed_login.status_code == 403
    assert closed_page.status_code == 404
    assert (await client.post("/api/v1/auth/login", json=login)).status_code == 200
    assert (await client.get(f"/api/v1/shop/{slug}")).status_code == 200


async def test_erase_only_a_closed_shop_and_only_with_its_link_name(client, register):
    seller = await register()
    slug = (await admin.shop_size(seller["phone"])).slug

    with pytest.raises(admin.AdminError, match="Close it first"):
        await admin.erase_shop(seller["phone"], slug)
    await admin.set_shop_open(seller["phone"], False)
    with pytest.raises(admin.AdminError, match="Nothing was erased"):
        await admin.erase_shop(seller["phone"], "not-the-slug")

    assert (await admin.shop_size(seller["phone"])).slug == slug


async def test_erasing_removes_the_shop_and_everything_in_it_only(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    _, other_id, other_slug = await registered_seller(client, auth_headers)
    phone = (await client.get("/api/v1/seller/account", headers=headers)).json()["phone"]
    for shop_id, shop_slug in ((store_id, slug), (other_id, other_slug)):
        cap = await add_product(shop_id, "cap", stock=5)
        assert (await place_order(client, shop_slug, [(cap, None, 1)], total="10.00")).is_success

    size = await admin.shop_size(phone)
    await admin.set_shop_open(phone, False)
    files = await admin.erase_shop(phone, slug)

    assert (size.products, size.orders, size.customers) == (1, 1, 1)
    assert files == 0  # R2 isn't set up in tests
    async with unscoped_session() as db:
        for model in (Store, Product, Order, Customer, OrderItem, Payment, Delivery):
            rows = await db.scalars(select(model.id).where(_store_column(model) == store_id))
            assert rows.all() == [], model.__name__
            others = await db.scalars(select(model.id).where(_store_column(model) == other_id))
            assert others.all(), model.__name__
        assert await db.scalar(select(Seller.id).where(Seller.phone == phone)) is None


def _store_column(model):
    return model.id if model is Store else model.store_id


async def test_move_photos_points_saved_photos_and_logos_at_the_new_address(two_stores):
    a, b = two_stores
    old, new = "https://pub-old.r2.dev", "https://images.oaksolve.com"
    shirt = await add_product(a.store_id, "shirt")
    hat = await add_product(b.store_id, "hat")
    bare = await add_product(b.store_id, "bare")
    async with unscoped_session() as db:
        (await db.get(Product, shirt)).image_urls = [
            f"{old}/stores/{a.store_id}/products/{shirt}/1.jpg",
            f"{old}/stores/{a.store_id}/products/{shirt}/2.jpg",
        ]
        hat_photo = f"{old}/stores/{b.store_id}/products/{hat}/1.jpg"
        (await db.get(Product, hat)).image_urls = [hat_photo]
        (await db.get(Store, a.store_id)).logo_url = f"{old}/stores/{a.store_id}/logo/l.png"
        await db.commit()

    moved = await admin.move_photos(old + "/", new)
    again = await admin.move_photos(old, new)

    assert (moved.products, moved.logos) == (2, 1)
    assert (again.products, again.logos) == (0, 0)
    async with unscoped_session() as db:
        assert (await db.get(Product, shirt)).image_urls == [
            f"{new}/stores/{a.store_id}/products/{shirt}/1.jpg",
            f"{new}/stores/{a.store_id}/products/{shirt}/2.jpg",
        ]
        assert (await db.get(Product, hat)).image_urls == [
            f"{new}/stores/{b.store_id}/products/{hat}/1.jpg"
        ]
        assert (await db.get(Product, bare)).image_urls == []
        assert (await db.get(Store, a.store_id)).logo_url == f"{new}/stores/{a.store_id}/logo/l.png"
        assert (await db.get(Store, b.store_id)).logo_url is None


async def test_move_photos_needs_two_different_https_addresses():
    with pytest.raises(admin.AdminError, match="two different https"):
        await admin.move_photos("https://images.oaksolve.com", "https://images.oaksolve.com/")
    with pytest.raises(admin.AdminError, match="two different https"):
        await admin.move_photos("pub-old.r2.dev", "https://images.oaksolve.com")


async def test_test_shop_logs_in_with_its_email(client):
    """Sign-up needs a phone checked in Telegram; the founder's test shops
    (the load test) log in with an email instead."""
    shop = await admin.make_test_shop("Load Test Shop")

    login = await client.post(
        "/api/v1/auth/login", json={"login": shop.email, "password": shop.password}
    )
    page = await client.get(f"/api/v1/shop/{shop.slug}")

    assert login.status_code == 200
    assert page.json()["name"] == "Load Test Shop"
    await admin.set_shop_open(shop.email.upper(), False)
    assert (await client.get(f"/api/v1/shop/{shop.slug}")).status_code == 404
