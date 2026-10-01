async def _create(client, headers, **body):
    payload = {"name": "T-shirt", "price": "12.50", "stock_quantity": 5, **body}
    return await client.post("/api/v1/seller/products", headers=headers, json=payload)


async def test_simple_product_keeps_its_own_stock(client, auth_headers):
    headers = await auth_headers()

    response = await _create(client, headers)

    product = response.json()
    assert response.status_code == 201
    assert product["slug"] == "t-shirt"
    assert product["price"] == "12.50"
    assert product["stock_quantity"] == 5
    assert product["variants"] == []


async def test_variants_replace_product_stock_and_update_by_id(client, auth_headers):
    headers = await auth_headers()
    product = (
        await _create(
            client,
            headers,
            has_variants=True,
            variants=[
                {"name": "Red / M", "stock_quantity": 3},
                {"name": "Red / L", "stock_quantity": 0, "price_override": "14.00"},
            ],
        )
    ).json()
    red_m, red_l = product["variants"]

    # Keep Red / M (new stock), drop Red / L, add Blue / M.
    updated = await client.patch(
        f"/api/v1/seller/products/{product['id']}",
        headers=headers,
        json={
            "variants": [
                {"id": red_m["id"], "name": "Red / M", "stock_quantity": 9},
                {"name": "Blue / M", "stock_quantity": 2},
            ]
        },
    )

    assert product["stock_quantity"] is None
    assert red_l["price_override"] == "14.00"
    body = updated.json()
    assert updated.status_code == 200, body
    assert [(v["name"], v["stock_quantity"]) for v in body["variants"]] == [
        ("Red / M", 9),
        ("Blue / M", 2),
    ]
    assert body["variants"][0]["id"] == red_m["id"]


async def test_variants_need_variants_turned_on(client, auth_headers):
    headers = await auth_headers()

    no_variants = await _create(client, headers, has_variants=True, variants=[])
    stray = await _create(client, headers, variants=[{"name": "Red"}])

    assert no_variants.status_code == 422
    assert stray.status_code == 422


async def test_delete_only_deactivates(client, auth_headers):
    headers = await auth_headers()
    product = (await _create(client, headers)).json()

    deleted = await client.delete(f"/api/v1/seller/products/{product['id']}", headers=headers)
    fetched = await client.get(f"/api/v1/seller/products/{product['id']}", headers=headers)

    assert deleted.status_code == 204
    assert fetched.json()["status"] == "inactive"


async def test_seller_cannot_see_or_use_another_sellers_data(client, auth_headers):
    a, b = await auth_headers(), await auth_headers()
    a_product = (await _create(client, a)).json()
    a_category = (
        await client.post("/api/v1/seller/categories", headers=a, json={"name": "Shoes"})
    ).json()

    b_get = await client.get(f"/api/v1/seller/products/{a_product['id']}", headers=b)
    b_patch = await client.patch(
        f"/api/v1/seller/products/{a_product['id']}", headers=b, json={"price": "0"}
    )
    b_list = await client.get("/api/v1/seller/products", headers=b)
    # B can't file their own product under A's category either.
    b_create = await _create(client, b, category_id=a_category["id"])

    assert b_get.status_code == 404
    assert b_patch.status_code == 404
    assert b_list.json() == []
    assert b_create.status_code == 422
    assert b_create.json()["error"]["code"] == "CATEGORY_NOT_FOUND"


async def test_only_this_products_uploads_can_be_attached(client, auth_headers):
    headers = await auth_headers()
    product = (await _create(client, headers)).json()

    response = await client.patch(
        f"/api/v1/seller/products/{product['id']}",
        headers=headers,
        json={"image_urls": ["https://evil.example.com/x.jpg"]},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_IMAGE"
