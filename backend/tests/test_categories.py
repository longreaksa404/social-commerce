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


async def test_seller_sees_categories_with_the_most_products_first(client, auth_headers):
    # The same order as the shop (shop page check 4A); hidden products count.
    headers = await auth_headers()
    ids = {}
    for name in ("Apple Watch", "iPhone", "Cases"):
        created = await client.post(
            "/api/v1/seller/categories", headers=headers, json={"name": name}
        )
        ids[name] = created.json()["id"]
    for i, (name, status) in enumerate(
        [("iPhone", "active"), ("iPhone", "inactive"), ("Cases", "active")]
    ):
        created = await client.post(
            "/api/v1/seller/products",
            headers=headers,
            json={
                "name": f"P{i}",
                "price": "10.00",
                "category_id": ids[name],
                "stock_quantity": 1,
                "status": status,
            },
        )
        assert created.status_code == 201

    listed = (await client.get("/api/v1/seller/categories", headers=headers)).json()

    assert [(c["name"], c["product_count"]) for c in listed] == [
        ("iPhone", 2),
        ("Cases", 1),
        ("Apple Watch", 0),
    ]
