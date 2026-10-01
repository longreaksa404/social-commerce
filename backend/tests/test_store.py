async def test_seller_sees_and_edits_only_their_store(client, register):
    a, b = await register(store_name="Sokha Shop"), await register()
    a_headers = {"Authorization": f"Bearer {a['access_token']}"}
    b_headers = {"Authorization": f"Bearer {b['access_token']}"}

    a_store = (await client.get("/api/v1/seller/store", headers=a_headers)).json()
    updated = await client.patch(
        "/api/v1/seller/store",
        headers=b_headers,
        json={"description": "Shoes and bags", "currency": "KHR"},
    )

    assert a_store["name"] == "Sokha Shop"
    assert a_store["slug"].startswith("sokha-shop")
    assert a_store["currency"] == "USD"
    assert updated.json()["currency"] == "KHR"
    # B's edit did not touch A's store.
    again = (await client.get("/api/v1/seller/store", headers=a_headers)).json()
    assert again["description"] is None


async def test_taking_another_stores_slug_is_a_conflict(client, register):
    a, b = await register(), await register()
    a_slug = (
        await client.get(
            "/api/v1/seller/store", headers={"Authorization": f"Bearer {a['access_token']}"}
        )
    ).json()["slug"]

    response = await client.patch(
        "/api/v1/seller/store",
        headers={"Authorization": f"Bearer {b['access_token']}"},
        json={"slug": a_slug},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SLUG_TAKEN"


async def test_store_requires_login(client):
    response = await client.get("/api/v1/seller/store")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "NOT_AUTHENTICATED"
