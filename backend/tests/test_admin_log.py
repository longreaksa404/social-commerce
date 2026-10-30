"""The admin's log (01_PRODUCT.md §22.11, part 28): everything done from
the admin, in the same transaction as the thing itself."""

LOG = "/api/v1/admin/log"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def store_id_of(client, tokens) -> str:
    return (await client.get("/api/v1/seller/store", headers=bearer(tokens))).json()["id"]


async def test_marking_paid_is_logged_and_the_log_filters_by_shop(client, register, admin):
    one, two = await register(), await register()
    one_id, two_id = await store_id_of(client, one), await store_id_of(client, two)
    for store_id in (one_id, two_id):
        paid = await client.post(
            f"/api/v1/admin/shops/{store_id}/payments",
            headers=bearer(admin),
            json={"period": "month", "amount": "0", "note": "free week"},
        )
        assert paid.status_code == 200, paid.text

    lines = (await client.get(LOG, params={"store_id": one_id}, headers=bearer(admin))).json()

    assert [line["action"] for line in lines] == ["mark_paid"]
    line = lines[0]
    assert line["store_id"] == one_id
    assert line["shop"]
    assert line["details"]["amount"] == "0.00"
    assert line["details"]["note"] == "free week"
    assert line["details"]["claim"] is False


async def test_a_seller_login_cannot_read_the_log(client, register, admin):
    seller = await register()
    assert (await client.get(LOG, headers=bearer(seller))).status_code == 401


async def test_close_and_reopen_from_the_admin_logs_out_only_that_shop(client, register, admin):
    seller, other = await register(), await register()
    store = (await client.get("/api/v1/seller/store", headers=bearer(seller))).json()
    shop = f"/api/v1/admin/shops/{store['id']}"
    login = {"login": seller["phone"], "password": "correct-horse"}

    blank = await client.post(f"{shop}/close", headers=bearer(admin), json={"reason": "  "})
    closed = await client.post(
        f"{shop}/close", headers=bearer(admin), json={"reason": "rainy season"}
    )
    again = await client.post(f"{shop}/close", headers=bearer(admin), json={"reason": "x"})
    refused = await client.post("/api/v1/auth/login", json=login)
    page = await client.get(f"/api/v1/shop/{store['slug']}")
    other_store = await client.get("/api/v1/seller/store", headers=bearer(other))

    assert blank.status_code == 422
    assert closed.status_code == 200
    assert closed.json()["is_open"] is False
    assert closed.json()["closed_reason"] == "rainy season"
    assert again.status_code == 409
    assert refused.status_code == 403
    assert page.status_code == 404
    assert other_store.status_code == 200

    reopened = await client.post(f"{shop}/reopen", headers=bearer(admin), json={})
    assert reopened.json()["is_open"] is True
    assert reopened.json()["closed_reason"] is None
    assert (await client.post("/api/v1/auth/login", json=login)).status_code == 200
    lines = (await client.get(LOG, params={"store_id": store["id"]}, headers=bearer(admin))).json()
    assert [(line["action"], line["reason"]) for line in lines] == [
        ("reopen_shop", None),
        ("close_shop", "rainy season"),
    ]
    # The shop's Activity carries the same lines.
    detail = (await client.get(shop, headers=bearer(admin))).json()
    assert [line["id"] for line in detail["log"]] == [line["id"] for line in lines]
