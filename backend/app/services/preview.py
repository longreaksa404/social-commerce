"""Link-preview pictures (02_TECHNICAL.md section 9.3): the shop's logo or a
product's photo with our mark small in the corner (founder's pick 5B,
2026-10-10). frontend/middleware.ts points og:image here; a shop without a
logo gets the app's plain mark (public/og/oak-mark.png) instead. A shop
with a cover photo gets a large card made from it, with its logo (founder's
pick 4A, 2026-10-15).

Drawn on request and kept in memory: the photo addresses never change
(a new photo is a new file), and Facebook and Telegram keep their own copy.
"""

import asyncio
import logging
from collections import OrderedDict
from collections.abc import Callable
from io import BytesIO

import httpx
from PIL import Image, ImageDraw, ImageFilter, ImageOps

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
# The shop's logo on its cover card, round, in a white ring.
COVER_LOGO = 150
COVER_LOGO_RING = 8
CARD_MARGIN = 28

FETCH_TIMEOUT_S = 5.0
MAX_SOURCE_BYTES = 10 * 1024 * 1024
MAX_SOURCE_PIXELS = 40_000_000
CACHE_SIZE = 64

_cache: OrderedDict[tuple[str, str], bytes] = OrderedDict()


class NoPicture(Exception):
    """The source photo couldn't be fetched or read."""


async def logo_picture(logo_url: str) -> bytes:
    return await _picture(("logo", logo_url), draw_logo, logo_url)


async def product_picture(photo_url: str) -> bytes:
    return await _picture(("product", photo_url), draw_product, photo_url)


async def cover_picture(cover_url: str, logo_url: str | None) -> bytes:
    """The cover's card, with the logo on it when it has one that loads."""
    return await _picture(("cover", f"{cover_url} {logo_url}"), draw_cover, cover_url, logo_url)


async def _picture(
    key: tuple[str, str], draw: Callable[..., bytes], url: str, logo_url: str | None = None
) -> bytes:
    if key in _cache:
        _cache.move_to_end(key)
        return _cache[key]
    sources = [await fetch_image(url)]
    if logo_url:
        try:
            sources.append(await fetch_image(logo_url))
        except NoPicture:
            pass  # the cover alone
    try:
        # Pillow work off the event loop: Render's free plan has little CPU.
        picture = await asyncio.to_thread(draw, *sources)
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
    _paste_mark(back)
    return _jpeg(back)


def draw_cover(data: bytes, logo: bytes | None = None) -> bytes:
    """A 1200 × 630 card: the cover's middle filling it (its sides trimmed
    to Facebook's shape), the shop's logo round in the bottom left, as on
    the shop's page, and our mark in the bottom right."""
    card = ImageOps.fit(_open(data), (CARD_W, CARD_H), Image.Resampling.LANCZOS)
    face = None
    if logo is not None:
        try:
            face = ImageOps.fit(_open(logo), (COVER_LOGO, COVER_LOGO), Image.Resampling.LANCZOS)
        except (OSError, ValueError, Image.DecompressionBombError):
            logger.warning("Logo not readable for a cover card")
    if face is not None:
        side = COVER_LOGO + 2 * COVER_LOGO_RING
        disc = Image.new("RGB", (side, side), (255, 255, 255))
        disc.paste(face, (COVER_LOGO_RING, COVER_LOGO_RING), _circle(COVER_LOGO))
        card.paste(disc, (CARD_MARGIN, CARD_H - side - CARD_MARGIN), _circle(side))
    _paste_mark(card)
    return _jpeg(card)


def _paste_mark(card: Image.Image) -> None:
    mark = badge(round(CARD_W * CARD_BADGE))
    position = (CARD_W - mark.width - CARD_MARGIN, CARD_H - mark.height - CARD_MARGIN)
    card.paste(mark, position, mark)


def _circle(side: int) -> Image.Image:
    """A round mask with smooth edges: drawn 4 times as big, then shrunk."""
    big = Image.new("L", (side * 4, side * 4), 0)
    ImageDraw.Draw(big).ellipse((0, 0, side * 4 - 1, side * 4 - 1), fill=255)
    return big.resize((side, side), Image.Resampling.LANCZOS)
