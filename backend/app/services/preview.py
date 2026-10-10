"""Link-preview pictures (02_TECHNICAL.md section 9.3): the shop's logo or a
product's photo with our mark small in the corner (founder's pick 5B,
2026-10-10). frontend/middleware.ts points og:image here; a shop without a
logo gets the app's plain mark (public/og/oak-mark.png) instead.

Drawn on request and kept in memory: the photo addresses never change
(a new photo is a new file), and Facebook and Telegram keep their own copy.
"""

import asyncio
import logging
from collections import OrderedDict
from io import BytesIO

import httpx
from PIL import Image, ImageFilter, ImageOps

from app.core.config import get_settings
from app.services.oak_mark import badge

logger = logging.getLogger(__name__)

# Logos are saved 256 px square (frontend/src/lib/images.ts).
LOGO_SIDE = 256
# Facebook's large card, 1.91:1.
CARD_W, CARD_H = 1200, 630
# Our mark's size: small, so the seller's picture stays the picture
# (founder, 2026-10-10: "smaller for our logo").
LOGO_BADGE = 0.22  # of the logo's side
CARD_BADGE = 0.10  # of the card's width

FETCH_TIMEOUT_S = 5.0
MAX_SOURCE_BYTES = 10 * 1024 * 1024
MAX_SOURCE_PIXELS = 40_000_000
CACHE_SIZE = 64

_cache: OrderedDict[tuple[str, str], bytes] = OrderedDict()


class NoPicture(Exception):
    """The source photo couldn't be fetched or read."""


async def logo_picture(logo_url: str) -> bytes:
    return await _picture("logo", logo_url)


async def product_picture(photo_url: str) -> bytes:
    return await _picture("product", photo_url)


async def _picture(kind: str, url: str) -> bytes:
    key = (kind, url)
    if key in _cache:
        _cache.move_to_end(key)
        return _cache[key]
    source = await fetch_image(url)
    draw = draw_logo if kind == "logo" else draw_product
    try:
        # Pillow work off the event loop: Render's free plan has little CPU.
        picture = await asyncio.to_thread(draw, source)
    except (OSError, ValueError, Image.DecompressionBombError) as error:
        raise NoPicture(f"can't read {url}") from error
    _cache[key] = picture
    if len(_cache) > CACHE_SIZE:
        _cache.popitem(last=False)
    return picture


async def fetch_image(url: str) -> bytes:
    """A photo from our own R2 bucket, and nowhere else."""
    public = get_settings().r2_public_url
    if not public or not url.startswith(f"{public}/"):
        raise NoPicture(f"not one of our photos: {url}")
    try:
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_S) as client:
            async with client.stream("GET", url) as response:
                if response.status_code != 200:
                    raise NoPicture(f"{url} answered {response.status_code}")
                data = bytearray()
                async for chunk in response.aiter_bytes():
                    data += chunk
                    if len(data) > MAX_SOURCE_BYTES:
                        raise NoPicture(f"{url} is too big")
                return bytes(data)
    except httpx.HTTPError as error:
        logger.warning("Preview photo %s not fetched: %s", url, error)
        raise NoPicture(str(error)) from error


def _open(data: bytes, draft: tuple[int, int] | None = None) -> Image.Image:
    image = Image.open(BytesIO(data))
    if image.width * image.height > MAX_SOURCE_PIXELS:
        raise ValueError("too many pixels")
    if draft:
        # JPEG only: decode straight at a smaller scale, much less work.
        image.draft("RGB", draft)
    return ImageOps.exif_transpose(image).convert("RGB")


def _jpeg(image: Image.Image) -> bytes:
    out = BytesIO()
    image.save(out, "JPEG", quality=86, optimize=True)
    return out.getvalue()


def draw_logo(data: bytes) -> bytes:
    """The logo's middle square at 256 px, our mark bottom right."""
    side = LOGO_SIDE
    image = ImageOps.fit(_open(data), (side, side), Image.Resampling.LANCZOS)
    mark = badge(round(side * LOGO_BADGE))
    margin = round(side * 0.05)
    image.paste(mark, (side - mark.width - margin, side - mark.height - margin), mark)
    return _jpeg(image)


def draw_product(data: bytes) -> bytes:
    """A 1200 × 630 card: the whole photo in the middle, as tall as the card
    (Facebook would otherwise crop a square photo's top and bottom), over a
    blurred copy of itself, with our mark in the bottom right corner."""
    image = _open(data, draft=(CARD_W, CARD_W))
    back = ImageOps.fit(image, (CARD_W // 20, CARD_H // 20), Image.Resampling.BILINEAR)
    back = back.filter(ImageFilter.GaussianBlur(1)).resize(
        (CARD_W, CARD_H), Image.Resampling.BICUBIC
    )
    front = ImageOps.contain(image, (CARD_W, CARD_H), Image.Resampling.LANCZOS)
    back.paste(front, ((CARD_W - front.width) // 2, (CARD_H - front.height) // 2))
    mark = badge(round(CARD_W * CARD_BADGE))
    margin = 28
    back.paste(mark, (CARD_W - mark.width - margin, CARD_H - mark.height - margin), mark)
    return _jpeg(back)
