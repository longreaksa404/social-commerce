"""Shareable links (Phase 8): making them, counting the views and orders
they bring, and keeping each store's links to itself."""

import re

from sqlalchemy import select

from app.db.session import tenant_session, unscoped_session
from app.models import Category, LinkEvent, Order, Product, ProductStatus, ShareableLink
from tests.helpers import add_category, add_product, place_order, registered_seller

URL = "/api/v1/seller/links"


async def make_link(client, headers, target_type="store", target_id=None, **fields):
    body = {"target_type": target_type, "target_id": target_id and str(target_id), **fields}
    body.setdefault("source", "tiktok")
    return await client.post(URL, headers=headers, json=body)


async def stats(client, headers, link_id) -> dict:
    response = await client.get(f"{URL}/{link_id}/stats", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


async def view(client, slug, token):
    return await client.post(f"/api/v1/shop/{slug}/track-view", json={"token": token})


async def test_links_open_the_page_with_their_token(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    await add_product(store_id, "red-dress")
    async with unscoped_session() as db:
        product_id = await db.scalar(select(Product.id).where(Product.store_id == store_id))
    category_id = await add_category(store_id, "dresses")

    shop = (await make_link(client, headers, campaign="  Sept sale ")).json()
    product = (await make_link(client, headers, "product", product_id)).json()
    category = (await make_link(client, headers, "category", category_id, source="facebook")).json()

    assert re.fullmatch(r"[a-z0-9]{8}", shop["token"])
    assert shop["path"] == f"/shop/{slug}?l={shop['token']}"
    assert shop["campaign"] == "Sept sale"
    assert product["path"] == f"/shop/{slug}/product/red-dress?l={product['token']}"
    assert product["target_name"] == "Red-Dress"
    assert category["path"] == f"/shop/{slug}/category/dresses?l={category['token']}"
    assert category["source"] == "facebook"
    # Newest first, each with its counts.
    listed = (await client.get(URL, headers=headers)).json()
    assert [link["id"] for link in listed] == [category["id"], product["id"], shop["id"]]
    assert listed[0]["view_count"] == listed[0]["order_count"] == 0


async def test_the_same_link_twice_is_one_link(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)
    first = (await make_link(client, headers, campaign="Sept")).json()
    again = (await make_link(client, headers, campaign="Sept")).json()
    other_name = (await make_link(client, headers, campaign="Oct")).json()
    no_name = (await make_link(client, headers, campaign="")).json()

    assert again["id"] == first["id"]
    assert len({first["id"], other_name["id"], no_name["id"]}) == 3
    assert no_name["campaign"] is None


async def test_only_a_page_that_opens_can_be_shared(client, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    hidden = await add_product(store_id, "old-hat", status="inactive")

    response = await make_link(client, headers, "product", hidden)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PRODUCT_HIDDEN"
    assert (await make_link(client, headers, "store", hidden)).status_code == 422
    assert (await make_link(client, headers, "product")).status_code == 422


async def test_a_link_to_a_page_that_went_away_keeps_its_stats(client, auth_headers):
    headers, store_id, _ = await registered_seller(client, auth_headers)
    product_id = await add_product(store_id, "cap")
    category_id = await add_category(store_id, "hats")
    product = (await make_link(client, headers, "product", product_id)).json()
    category = (await make_link(client, headers, "category", category_id)).json()

    async with unscoped_session() as db:
        (await db.get(Product, product_id)).status = ProductStatus.INACTIVE
        await db.delete(await db.get(Category, category_id))
        await db.commit()

    hidden = await stats(client, headers, product["id"])
    deleted = await stats(client, headers, category["id"])
    assert (hidden["target_name"], hidden["path"]) == ("Cap", None)
    assert (deleted["target_name"], deleted["path"]) == (None, None)


async def test_views_and_orders_count_for_their_link(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=10)
    tiktok = (await make_link(client, headers, "product", cap)).json()
    facebook = (await make_link(client, headers, source="facebook")).json()

    for _ in range(3):
        assert (await view(client, slug, tiktok["token"])).status_code == 204
    await view(client, slug, facebook["token"])
    # The order carries the token the device remembered; the others none.
    await place_order(client, slug, [(cap, None, 1)], total="10.00")
    response = await client.post(
        f"/api/v1/shop/{slug}/orders", json={**_order_body(cap), "link": tiktok["token"]}
    )
    assert response.status_code == 201, response.text
    await client.post(f"/api/v1/shop/{slug}/orders", json={**_order_body(cap), "link": None})

    tiktok_stats = await stats(client, headers, tiktok["id"])
    assert (tiktok_stats["view_count"], tiktok_stats["order_count"]) == (3, 1)
    assert len(tiktok_stats["orders"]) == 1
    order_id = tiktok_stats["orders"][0]["id"]
    order = (await client.get(f"/api/v1/seller/orders/{order_id}", headers=headers)).json()
    assert order["source"] == "tiktok"
    assert (await stats(client, headers, facebook["id"]))["order_count"] == 0
    # The others came through no link.
    async with unscoped_session() as db:
        sources = (await db.scalars(select(Order.source).where(Order.store_id == store_id))).all()
    assert sorted(sources, key=str) == [None, None, "tiktok"]


def _order_body(product_id) -> dict:
    return {
        "name": "Dara",
        "phone": "012 345 678",
        "delivery_method": "seller_delivery",
        "courier": None,
        "delivery_address": "St 271, Phnom Penh",
        "items": [{"product_id": str(product_id), "variant_id": None, "quantity": 1}],
        "expected_total": "10.00",
        "payment_method": "cod",
    }


async def test_another_shops_token_counts_nothing(client, auth_headers):
    headers_a, _, _ = await registered_seller(client, auth_headers)
    _, store_b, slug_b = await registered_seller(client, auth_headers)
    cap = await add_product(store_b, "cap")
    link_a = (await make_link(client, headers_a)).json()

    # Shop B's pages opened with shop A's token: the same answer, no count.
    assert (await view(client, slug_b, link_a["token"])).status_code == 204
    assert (await view(client, slug_b, "zzzzzzzz")).status_code == 204
    response = await client.post(
        f"/api/v1/shop/{slug_b}/orders", json={**_order_body(cap), "link": link_a["token"]}
    )
    assert response.status_code == 201, response.text

    assert (await stats(client, headers_a, link_a["id"]))["view_count"] == 0
    async with unscoped_session() as db:
        events = (await db.scalars(select(LinkEvent).where(LinkEvent.store_id == store_b))).all()
        order = await db.scalar(select(Order).where(Order.store_id == store_b))
    assert events == []
    assert order.source is None


async def test_a_bad_token_is_refused(client, auth_headers):
    _, _, slug = await registered_seller(client, auth_headers)
    assert (await view(client, slug, "NOT-A-TOKEN")).status_code == 422
    assert (await view(client, "no-such-shop", "abcd1234")).status_code == 404


async def test_seller_sees_only_their_own_links(client, auth_headers):
    headers_a, _, _ = await registered_seller(client, auth_headers)
    headers_b, store_b, _ = await registered_seller(client, auth_headers)
    category_b = await add_category(store_b, "shoes")
    link_b = (await make_link(client, headers_b)).json()

    assert (await client.get(URL, headers=headers_a)).json() == []
    response = await client.get(f"{URL}/{link_b['id']}/stats", headers=headers_a)
    assert response.status_code == 404
    # Store A can't link to store B's category.
    response = await make_link(client, headers_a, "category", category_b)
    assert response.status_code == 404


async def test_rls_keeps_links_and_events_apart(client, auth_headers):
    headers_a, store_a, slug_a = await registered_seller(client, auth_headers)
    headers_b, store_b, slug_b = await registered_seller(client, auth_headers)
    for headers, slug in ((headers_a, slug_a), (headers_b, slug_b)):
        link = (await make_link(client, headers)).json()
        await view(client, slug, link["token"])

    # Straight to the database, without the service layer's filters.
    async with tenant_session(store_a) as db:
        links = (await db.scalars(select(ShareableLink.store_id))).all()
        events = (await db.scalars(select(LinkEvent.store_id))).all()
    assert links == events == [store_a]
