"""The admin's tools (01_PRODUCT.md §22.11): a test shop in one tap (part
29); erasing a closed shop after its link name and the admin's password
(D4B)."""

from tests.conftest import ADMIN_PASSWORD
from tests.helpers import add_product

ADMIN = "/api/v1/admin"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def test_a_test_shop_is_open_with_a_login_to_copy(client, admin):
    made = await client.post(f"{ADMIN}/test-shop", headers=bearer(admin), json={})

    assert made.status_code == 201, made.text
    shop = made.json()
    assert shop["login"].startswith("test-") and shop["login"].endswith("@example.com")
    logged_in = await client.post(
        "/api/v1/auth/login", json={"login": shop["login"], "password": shop["password"]}
    )
    detail = (await client.get(f"{ADMIN}/shops/{shop['store_id']}", headers=bearer(admin))).json()
    assert logged_in.status_code == 200
    assert detail["stage"] == "active" and detail["on_trial"]
    assert detail["log"][0]["action"] == "test_shop"
    assert shop["password"] not in str(detail["log"][0])


async def test_erasing_takes_a_closed_shop_its_name_and_the_password(client, register, admin):
    seller = await register()
    other = await register()
    store = (await client.get("/api/v1/seller/store", headers=bearer(seller))).json()
    other_store = (await client.get("/api/v1/seller/store", headers=bearer(other))).json()
    await add_product(store["id"], "cap")
    kept = await add_product(other_store["id"], "hat")
    url = f"{ADMIN}/shops/{store['id']}"
    body = {"slug": store["slug"], "password": ADMIN_PASSWORD}

    still_open = await client.request("DELETE", url, headers=bearer(admin), json=body)
    await client.post(f"{url}/close", headers=bearer(admin), json={"reason": "asked to erase"})
    wrong_name = await client.request(
        "DELETE", url, headers=bearer(admin), json={**body, "slug": "not-it"}
    )
    wrong_password = await client.request(
        "DELETE", url, headers=bearer(admin), json={**body, "password": "nope"}
    )
    erased = await client.request("DELETE", url, headers=bearer(admin), json=body)

    assert still_open.status_code == 409
    assert still_open.json()["error"]["code"] == "SHOP_NOT_CLOSED"
    assert wrong_name.status_code == 422 and wrong_name.json()["error"]["code"] == "SLUG_MISMATCH"
    assert wrong_password.json()["error"]["code"] == "WRONG_PASSWORD"
    assert erased.status_code == 200, erased.text
    assert erased.json() == {"shop": store["name"]}
    assert (await client.get(url, headers=bearer(admin))).status_code == 404
    login = await client.post(
        "/api/v1/auth/login", json={"login": seller["phone"], "password": "correct-horse"}
    )
    assert login.status_code == 401
    # The log keeps what was erased, by name.
    line = (await client.get(f"{ADMIN}/log", headers=bearer(admin))).json()[0]
    assert line["action"] == "erase_shop" and line["store_id"] is None
    assert line["shop"] == store["name"] and line["details"]["products"] == 1
    # Another shop untouched.
    their = await client.get(f"/api/v1/seller/products/{kept}", headers=bearer(other))
    assert their.status_code == 200
