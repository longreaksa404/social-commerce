"""A shop's link (Settings → Link, and at sign-up): old links keep opening
the shop, and stay that shop's."""

import uuid

from sqlalchemy import select

from app.db.session import tenant_session
from app.models import StoreOldSlug
from app.services.slugs import slugify
from tests.helpers import verified_phone_check


def bearer(tokens) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def set_slug(client, headers, slug):
    return await client.patch("/api/v1/seller/store", headers=headers, json={"slug": slug})


async def test_an_old_link_opens_the_shop_at_its_new_link(client, register):
    headers = bearer(await register(store_name="Sokha Fashion"))
    old = (await client.get("/api/v1/seller/store", headers=headers)).json()["slug"]

    changed = await set_slug(client, headers, "sokha-style")
    shop = await client.get(f"/api/v1/shop/{old}")
    products = await client.get(f"/api/v1/shop/{old}/products")

    assert changed.status_code == 200
    assert shop.status_code == 200
    # The page moves to the current link with this.
    assert shop.json()["slug"] == "sokha-style"
    assert products.status_code == 200
    assert (await client.get("/api/v1/shop/sokha-style")).status_code == 200


async def test_another_shop_cant_take_an_old_link(client, register):
    a, b = bearer(await register()), bearer(await register())
    old = (await client.get("/api/v1/seller/store", headers=a)).json()["slug"]
    await set_slug(client, a, "a-new-link")

    response = await set_slug(client, b, old)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SLUG_TAKEN"


async def test_a_shop_can_change_back_to_its_old_link(client, register):
    headers = bearer(await register())
    first = (await client.get("/api/v1/seller/store", headers=headers)).json()["slug"]
    await set_slug(client, headers, "second-link")

    back = await set_slug(client, headers, first)

    assert back.status_code == 200
    assert back.json()["slug"] == first
    # The link in between is now an old one.
    assert (await client.get("/api/v1/shop/second-link")).json()["slug"] == first


async def test_saving_the_same_link_keeps_no_old_one(client, register):
    tokens = await register()
    headers = bearer(tokens)
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()

    await set_slug(client, headers, store["slug"])

    async with tenant_session(store["id"]) as db:
        assert (await db.scalars(select(StoreOldSlug))).all() == []


async def test_old_links_are_only_visible_to_their_shop(client, register):
    a, b = bearer(await register()), bearer(await register())
    await set_slug(client, a, "a-moved")
    a_id = (await client.get("/api/v1/seller/store", headers=a)).json()["id"]
    b_id = (await client.get("/api/v1/seller/store", headers=b)).json()["id"]

    async with tenant_session(a_id) as db:
        a_sees = (await db.scalars(select(StoreOldSlug.store_id))).all()
    async with tenant_session(b_id) as db:
        b_sees = (await db.scalars(select(StoreOldSlug))).all()

    assert [str(i) for i in a_sees] == [a_id]
    assert b_sees == []


async def test_sign_up_with_a_chosen_link(client, register):
    slug = f"sokha-{uuid.uuid4().hex[:8]}"
    headers = bearer(await register(store_name="សុខា", slug=slug))

    store = (await client.get("/api/v1/seller/store", headers=headers)).json()

    assert store["slug"] == slug


async def test_sign_up_with_a_taken_link_keeps_the_phone_check(client, register):
    a = bearer(await register())
    taken = (await client.get("/api/v1/seller/store", headers=a)).json()["slug"]
    await set_slug(client, a, "a-moved-away")  # `taken` is now an old link
    check_id, _ = await verified_phone_check()
    body = {
        "password": "correct-horse",
        "full_name": "Dara",
        "store_name": "Dara Shop",
        "phone_check": check_id,
    }

    clash = await client.post("/api/v1/auth/register", json={**body, "slug": taken})
    retry = await client.post(
        "/api/v1/auth/register", json={**body, "slug": f"dara-{uuid.uuid4().hex[:8]}"}
    )

    assert clash.status_code == 409
    assert clash.json()["error"]["code"] == "SLUG_TAKEN"
    assert clash.json()["error"]["field"] == "slug"
    assert retry.status_code == 201


async def test_a_new_shops_link_skips_old_links(client, register):
    name = f"Kanha {uuid.uuid4().hex[:8]}"
    a = bearer(await register(store_name=name))
    await set_slug(client, a, "kanha-moved")

    b = bearer(await register(store_name=name))

    assert (await client.get("/api/v1/seller/store", headers=b)).json()[
        "slug"
    ] == f"{slugify(name)}-2"
