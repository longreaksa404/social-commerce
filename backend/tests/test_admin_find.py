"""Orders, customers and products across every shop, for the admin
(01_PRODUCT.md §22.11, parts 19 to 22): find an order or a customer, look
only; remove a customer's details with REMOVE and the password every time;
the newest products and hiding one."""

import uuid

from tests.conftest import ADMIN_PASSWORD
from tests.helpers import add_product, place_order, random_phone

ADMIN = "/api/v1/admin"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def shop(client, register, name: str) -> dict:
    seller = await register(store_name=f"{name} {uuid.uuid4().hex[:6]}")
    store = (await client.get("/api/v1/seller/store", headers=bearer(seller))).json()
    cap = str(await add_product(store["id"], f"cap-{uuid.uuid4().hex[:6]}", stock=20))
    return {"seller": seller, "store": store, "cap": cap}


async def order_in(client, s, phone, name="Sophea") -> dict:
    placed = await place_order(
        client, s["store"]["slug"], [(s["cap"], None, 1)], total="10.00", phone=phone, name=name
    )
    assert placed.status_code == 201, placed.text
    return placed.json()


async def test_an_order_is_found_by_shop_and_number_or_by_phone(client, register, admin):
    one = await shop(client, register, "Sokha Fashion")
    two = await shop(client, register, "Kanha Skincare")
    phone = random_phone()
    first = await order_in(client, one, phone)
    await order_in(client, two, random_phone())
    word = one["store"]["name"].split()[-1]  # the shop's own random part

    by_shop = await client.get(
        f"{ADMIN}/orders", params={"q": f"{word} {first['number']}"}, headers=bearer(admin)
    )
    by_phone = await client.get(f"{ADMIN}/orders", params={"q": phone}, headers=bearer(admin))
    words_only = await client.get(f"{ADMIN}/orders", params={"q": word}, headers=bearer(admin))

    assert by_shop.status_code == 200, by_shop.text
    assert [(o["shop"], o["number"]) for o in by_shop.json()] == [
        (one["store"]["name"], first["number"])
    ]
    found = by_phone.json()
    assert [o["id"] for o in found] == [first["id"]]
    assert found[0]["items"][0].endswith("× 1")
    assert found[0]["payment_method"] == "cod" and found[0]["delivery_status"] == "not_assigned"
    assert words_only.json() == []


async def test_a_customer_is_one_phone_in_every_shop_they_ordered_from(client, register, admin):
    one = await shop(client, register, "Sokha Fashion")
    two = await shop(client, register, "Kanha Skincare")
    phone = random_phone()
    await order_in(client, one, phone)
    await order_in(client, two, phone)
    await order_in(client, two, phone)

    found = await client.get(f"{ADMIN}/customers", params={"q": phone}, headers=bearer(admin))

    assert found.status_code == 200, found.text
    [customer] = found.json()
    assert customer["phone"] == phone
    assert sorted((s["shop"], s["orders"]) for s in customer["shops"]) == sorted(
        [(one["store"]["name"], 1), (two["store"]["name"], 2)]
    )


async def test_removing_a_customer_asks_for_the_password_each_time(client, register, admin):
    one = await shop(client, register, "Sokha Fashion")
    two = await shop(client, register, "Kanha Skincare")
    phone = random_phone()
    order = await order_in(client, one, phone)
    await order_in(client, two, phone)
    body = {"phone": phone, "store_id": one["store"]["id"], "confirm": "REMOVE"}

    wrong = await client.post(
        f"{ADMIN}/customers/forget", headers=bearer(admin), json={**body, "password": "nope"}
    )
    not_typed = await client.post(
        f"{ADMIN}/customers/forget",
        headers=bearer(admin),
        json={**body, "confirm": "remove", "password": ADMIN_PASSWORD},
    )
    done = await client.post(
        f"{ADMIN}/customers/forget",
        headers=bearer(admin),
        json={**body, "password": ADMIN_PASSWORD},
    )

    assert wrong.status_code == 422 and wrong.json()["error"]["code"] == "WRONG_PASSWORD"
    assert not_typed.status_code == 422
    assert done.status_code == 200, done.text
    assert done.json() == {"shops": 1, "orders": 1}
    # Gone from that shop only; the order and its money stay.
    left = (
        await client.get(f"{ADMIN}/customers", params={"q": phone}, headers=bearer(admin))
    ).json()
    assert [s["shop"] for s in left[0]["shops"]] == [two["store"]["name"]]
    seen = await client.get(f"/api/v1/seller/orders/{order['id']}", headers=bearer(one["seller"]))
    assert seen.json()["customer"]["name"] == "(removed)"
    assert seen.json()["total"] == order["total"]
    line = (await client.get(f"{ADMIN}/log", headers=bearer(admin))).json()[0]
    assert line["action"] == "forget_customer" and line["store_id"] == one["store"]["id"]
    assert phone not in str(line)


async def test_removing_from_every_shop(client, register, admin):
    one = await shop(client, register, "Sokha Fashion")
    two = await shop(client, register, "Kanha Skincare")
    phone = random_phone()
    await order_in(client, one, phone)
    await order_in(client, two, phone)

    done = await client.post(
        f"{ADMIN}/customers/forget",
        headers=bearer(admin),
        json={"phone": phone, "confirm": "REMOVE", "password": ADMIN_PASSWORD},
    )
    left = await client.get(f"{ADMIN}/customers", params={"q": phone}, headers=bearer(admin))

    assert done.json() == {"shops": 2, "orders": 2}
    assert left.json() == []


async def test_the_newest_products_and_hiding_one(client, register, admin):
    s = await shop(client, register, "Dara Phone Case")
    seller_headers = bearer(s["seller"])

    listed = await client.get(f"{ADMIN}/products", headers=bearer(admin))
    hidden = await client.post(
        f"{ADMIN}/products/{s['cap']}/hide", headers=bearer(admin), json={"reason": "not allowed"}
    )
    again = await client.post(f"{ADMIN}/products/{s['cap']}/hide", headers=bearer(admin), json={})
    in_shop = await client.get(f"/api/v1/shop/{s['store']['slug']}/products")
    seller_view = await client.get(f"/api/v1/seller/products/{s['cap']}", headers=seller_headers)
    by_seller = await client.get(f"{ADMIN}/products", headers=seller_headers)

    assert listed.status_code == 200
    assert listed.json()[0]["id"] == s["cap"]
    assert hidden.status_code == 200 and hidden.json()["status"] == "inactive"
    assert again.status_code == 409
    assert s["cap"] not in str(in_shop.json())
    assert seller_view.json()["status"] == "inactive"
    assert by_seller.status_code == 401
    line = (await client.get(f"{ADMIN}/log", headers=bearer(admin))).json()[0]
    assert line["action"] == "hide_product" and line["reason"] == "not allowed"
