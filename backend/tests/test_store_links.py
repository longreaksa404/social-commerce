"""A shop's link: a short code made at sign-up that the seller can't
change (2026-10-18). Links shops had before (changed in Settings while it
could) keep opening the shop, and stay that shop's."""

import re
import uuid

from sqlalchemy import select

from app.db.session import tenant_session, unscoped_session
from app.models import StoreOldSlug
from app.services import slugs

CODE = re.compile(f"^[{slugs.SHOP_CODE_ALPHABET}]{{{slugs.SHOP_CODE_LENGTH}}}$")


def bearer(tokens) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def my_store(client, headers) -> dict:
    return (await client.get("/api/v1/seller/store", headers=headers)).json()


async def add_old_link(store_id: str, slug: str) -> None:
    """A link the shop had before, as Settings → Link used to leave it."""
    async with unscoped_session() as db:
        db.add(StoreOldSlug(slug=slug, store_id=uuid.UUID(store_id)))
        await db.commit()


async def test_a_new_shops_link_is_a_code_whatever_its_name(client, register):
    for name in ("Sokha Fashion", "ហាងសុខា"):
        store = await my_store(client, bearer(await register(store_name=name)))
        assert CODE.match(store["slug"]), store["slug"]


async def test_sign_up_ignores_a_chosen_link(client, register):
    store = await my_store(client, bearer(await register(slug="sokha-fashion")))

    assert CODE.match(store["slug"])


async def test_the_link_cant_be_changed_in_settings(client, register):
    headers = bearer(await register())
    before = (await my_store(client, headers))["slug"]

    response = await client.patch(
        "/api/v1/seller/store", headers=headers, json={"slug": "my-own-link", "name": "Renamed"}
    )

    assert response.status_code == 200
    assert response.json()["slug"] == before
    assert response.json()["name"] == "Renamed"
    assert (await client.get("/api/v1/shop/my-own-link")).status_code == 404


async def test_a_new_code_skips_links_in_use_and_old_links(client, register, monkeypatch):
    a = await my_store(client, bearer(await register()))
    old = f"old{uuid.uuid4().hex[:8]}"
    await add_old_link(a["id"], old)
    codes = iter([a["slug"], old, "zz9zz9"])
    monkeypatch.setattr(slugs, "_shop_code", lambda: next(codes))

    async with unscoped_session() as db:
        assert await slugs.new_store_slug(db) == "zz9zz9"


async def test_an_old_link_opens_the_shop_at_its_link(client, register):
    store = await my_store(client, bearer(await register(store_name="Sokha Fashion")))
    old = f"sokha-{uuid.uuid4().hex[:8]}"
    await add_old_link(store["id"], old)

    shop = await client.get(f"/api/v1/shop/{old}")
    products = await client.get(f"/api/v1/shop/{old}/products")

    assert shop.status_code == 200
    # The page moves to the current link with this.
    assert shop.json()["slug"] == store["slug"]
    assert products.status_code == 200


async def test_old_links_are_only_visible_to_their_shop(client, register):
    a = await my_store(client, bearer(await register()))
    b = await my_store(client, bearer(await register()))
    await add_old_link(a["id"], f"a-moved-{uuid.uuid4().hex[:8]}")

    async with tenant_session(a["id"]) as db:
        a_sees = (await db.scalars(select(StoreOldSlug.store_id))).all()
    async with tenant_session(b["id"]) as db:
        b_sees = (await db.scalars(select(StoreOldSlug))).all()

    assert [str(i) for i in a_sees] == [a["id"]]
    assert b_sees == []
