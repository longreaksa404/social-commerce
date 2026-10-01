from urllib.parse import parse_qs, urlparse

import pytest

from app.core.config import get_settings
from app.services.images import _r2_client


@pytest.fixture
def r2(monkeypatch):
    settings = get_settings()
    for field, value in {
        "r2_account_id": "acct",
        "r2_access_key_id": "key",
        "r2_secret_access_key": "secret",
        "r2_bucket": "images",
        "r2_public_url": "https://pub-test.r2.dev",
    }.items():
        monkeypatch.setattr(settings, field, value)
    _r2_client.cache_clear()
    yield
    _r2_client.cache_clear()


async def _product(client, headers):
    body = {"name": "Bag", "price": "20", "stock_quantity": 1}
    return (await client.post("/api/v1/seller/products", headers=headers, json=body)).json()


async def test_upload_url_is_signed_for_exact_type_and_size(client, auth_headers, r2):
    headers = await auth_headers()
    product = await _product(client, headers)

    response = await client.post(
        f"/api/v1/seller/products/{product['id']}/images",
        headers=headers,
        json={"content_type": "image/png", "size": 1234},
    )
    upload = response.json()
    attach = await client.patch(
        f"/api/v1/seller/products/{product['id']}",
        headers=headers,
        json={"image_urls": [upload["public_url"]]},
    )

    assert response.status_code == 200, upload
    query = parse_qs(urlparse(upload["upload_url"]).query)
    assert query["X-Amz-SignedHeaders"] == ["content-length;content-type;host"]
    assert (
        upload["public_url"].startswith("https://pub-test.r2.dev/stores/")
        and f"/products/{product['id']}/" in upload["public_url"]
    )
    assert attach.json()["image_urls"] == [upload["public_url"]]


async def test_upload_rejects_large_or_wrong_files(client, auth_headers, r2):
    headers = await auth_headers()
    product = await _product(client, headers)
    url = f"/api/v1/seller/products/{product['id']}/images"

    too_big = await client.post(
        url, headers=headers, json={"content_type": "image/png", "size": 6 * 1024 * 1024}
    )
    gif = await client.post(url, headers=headers, json={"content_type": "image/gif", "size": 10})

    assert too_big.status_code == 422
    assert gif.status_code == 422


async def test_upload_needs_r2_settings(client, auth_headers):
    headers = await auth_headers()
    product = await _product(client, headers)

    response = await client.post(
        f"/api/v1/seller/products/{product['id']}/images",
        headers=headers,
        json={"content_type": "image/png", "size": 10},
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "UPLOADS_NOT_CONFIGURED"
