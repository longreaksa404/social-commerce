"""Link-preview pictures (/api/v1/shop/{slug}/preview/...): the shop's own
logo or photo with our mark, never another shop's, and our plain mark when
there's nothing to draw on."""

from io import BytesIO

import pytest
from PIL import Image
from sqlalchemy import update

from app.core.config import get_settings
from app.db.session import unscoped_session
from app.models import Product, Store
from app.services import preview
from app.services.oak_mark import NAVY
from tests.helpers import add_product, shop_slug

PUBLIC = "https://pub-test.r2.dev"


@pytest.fixture
def photos(monkeypatch):
    """R2 on, and every photo "fetched" is a plain orange square."""
    monkeypatch.setattr(get_settings(), "r2_public_url", PUBLIC)
    monkeypatch.setattr(get_settings(), "public_app_url", "https://order.example")
    fetched: list[str] = []

    async def fake_fetch(url: str) -> bytes:
        fetched.append(url)
        out = BytesIO()
        Image.new("RGB", (800, 800), (230, 120, 40)).save(out, "JPEG")
        return out.getvalue()

    monkeypatch.setattr(preview, "fetch_image", fake_fetch)
    preview._cache.clear()
    yield fetched
    preview._cache.clear()


def _near(pixel, colour, tolerance=30) -> bool:
    return all(abs(a - b) <= tolerance for a, b in zip(pixel, colour, strict=True))


async def _set_logo(store_id, url):
    async with unscoped_session() as db:
        await db.execute(update(Store).where(Store.id == store_id).values(logo_url=url))
        await db.commit()


async def _set_photos(product_id, urls):
    async with unscoped_session() as db:
        await db.execute(update(Product).where(Product.id == product_id).values(image_urls=urls))
        await db.commit()


async def test_logo_gets_our_mark_in_the_corner(client, make_store, photos):
    store = await make_store()
    await _set_logo(store.store_id, f"{PUBLIC}/stores/a/logo.jpg")

    response = await client.get(f"/api/v1/shop/{await shop_slug(store.store_id)}/preview/logo")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    picture = Image.open(BytesIO(response.content))
    assert picture.size == (256, 256)
    assert _near(picture.getpixel((20, 20)), (230, 120, 40))  # the logo
    assert _near(picture.getpixel((195, 215)), NAVY)  # our mark, bottom right
    assert photos == [f"{PUBLIC}/stores/a/logo.jpg"]


async def test_no_logo_or_unreadable_photo_gets_the_plain_mark(
    client, make_store, photos, monkeypatch
):
    store = await make_store()
    slug = await shop_slug(store.store_id)

    response = await client.get(f"/api/v1/shop/{slug}/preview/logo")
    assert response.status_code == 302
    assert response.headers["location"] == "https://order.example/og/oak-mark.png"

    async def broken(url: str) -> bytes:
        raise preview.NoPicture(url)

    monkeypatch.setattr(preview, "fetch_image", broken)
    await _set_logo(store.store_id, f"{PUBLIC}/stores/a/gone.jpg")
    response = await client.get(f"/api/v1/shop/{slug}/preview/logo")
    assert response.status_code == 302


async def test_product_card_only_for_the_shops_own_products_on_sale(client, two_stores, photos):
    mine, theirs = two_stores
    shirt = await add_product(mine.store_id, "shirt")
    await _set_photos(shirt, [f"{PUBLIC}/stores/a/shirt-m.jpg"])
    old = await add_product(mine.store_id, "old", status="inactive")
    await _set_photos(old, [f"{PUBLIC}/stores/a/old-m.jpg"])
    secret = await add_product(theirs.store_id, "secret")
    await _set_photos(secret, [f"{PUBLIC}/stores/b/secret-m.jpg"])
    base = f"/api/v1/shop/{await shop_slug(mine.store_id)}/preview/products"

    response = await client.get(f"{base}/shirt")
    assert response.status_code == 200
    assert Image.open(BytesIO(response.content)).size == (1200, 630)

    assert (await client.get(f"{base}/old")).status_code == 404
    assert (await client.get(f"{base}/secret")).status_code == 404
    assert photos == [f"{PUBLIC}/stores/a/shirt-m.jpg"]


async def test_only_our_own_photos_are_fetched(monkeypatch):
    monkeypatch.setattr(get_settings(), "r2_public_url", PUBLIC)
    for url in (
        "https://evil.example/x.jpg",
        "https://pub-test.r2.dev.evil.example/x.jpg",
        "http://localhost/x",
    ):
        with pytest.raises(preview.NoPicture):
            await preview.fetch_image(url)
