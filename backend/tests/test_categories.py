async def test_same_name_gets_a_unique_slug(client, auth_headers):
    headers = await auth_headers()

    first = await client.post("/api/v1/seller/categories", headers=headers, json={"name": "Tops"})
    second = await client.post("/api/v1/seller/categories", headers=headers, json={"name": "Tops"})
    khmer = await client.post("/api/v1/seller/categories", headers=headers, json={"name": "អាវ"})

    assert first.json()["slug"] == "tops"
    assert second.json()["slug"] == "tops-2"
    assert khmer.status_code == 201 and khmer.json()["slug"]


async def test_seller_cannot_touch_another_sellers_category(client, auth_headers):
    a, b = await auth_headers(), await auth_headers()
    category = (
        await client.post("/api/v1/seller/categories", headers=a, json={"name": "Shoes"})
    ).json()

    edit = await client.patch(
        f"/api/v1/seller/categories/{category['id']}", headers=b, json={"name": "Mine now"}
    )
    delete = await client.delete(f"/api/v1/seller/categories/{category['id']}", headers=b)
    b_list = await client.get("/api/v1/seller/categories", headers=b)

    assert edit.status_code == 404
    assert delete.status_code == 404
    assert b_list.json() == []
    a_list = (await client.get("/api/v1/seller/categories", headers=a)).json()
    assert [c["name"] for c in a_list] == ["Shoes"]
