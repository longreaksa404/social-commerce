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


async def test_shop_colour_starts_navy_and_shows_in_the_shop(client, register):
    a, b = await register(), await register()
    a_headers = {"Authorization": f"Bearer {a['access_token']}"}
    b_headers = {"Authorization": f"Bearer {b['access_token']}"}

    new = (await client.get("/api/v1/seller/store", headers=a_headers)).json()
    light = await client.patch("/api/v1/seller/store", headers=a_headers, json={"color": "mint"})
    picked = await client.patch("/api/v1/seller/store", headers=a_headers, json={"color": "forest"})
    kept = await client.patch("/api/v1/seller/store", headers=a_headers, json={"color": None})
    wrong = await client.patch("/api/v1/seller/store", headers=a_headers, json={"color": "red"})
    shop = (await client.get(f"/api/v1/shop/{new['slug']}")).json()
    other = (await client.get("/api/v1/seller/store", headers=b_headers)).json()

    assert new["color"] == "navy"
    assert light.json()["color"] == "mint"
    assert picked.json()["color"] == "forest"
    assert kept.json()["color"] == "forest"  # null leaves it
    assert wrong.status_code == 422
    assert shop["color"] == "forest"
    assert other["color"] == "navy"  # another shop's pick doesn't touch this one


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
