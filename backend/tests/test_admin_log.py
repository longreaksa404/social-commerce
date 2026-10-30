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
