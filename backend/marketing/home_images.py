"""The start page's phone and laptop screens, from the marketing pictures.

    cd backend && .venv/bin/python marketing/home_images.py [--source DIR] [--only NAMES]

Takes 5 of the iPhone-sized PNGs that shots.py makes, and the laptop's
Orders page that laptop_shot.py makes (marketing/out/, git-ignored), in
Khmer and English, and saves them as sharp WebPs for the start page
(frontend/public/home/<lang>/<screen>.webp, committed): the phone screens
at the full size shots.py takes them (3x), the laptop at the full
2880 x 1800 from laptop_shot.py's 2x picture. Every WebP is lossless:
small letters and garment details keep the original capture's pixels
(founder, 2026-11-07: the phone and laptop still look unclear). Run it again
after shots.py or laptop_shot.py when a screen in the app changes; --only
laptop (or shop,orders, ...) does just those.

Exits 1 if a picture is missing, too small, or a file comes out over 1.2 MB.
"""

import argparse
import io
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parents[1] / "frontend" / "public" / "home"

PHONE = (1170, 2532)  # 3x a 390 x 844 phone screen, as shots.py takes it
# Keep the original Retina capture rather than downsampling it first.
LAPTOP = (2880, 1800)
# The start page's name for a screen (pages/home/screens.ts) → the picture
# it comes from and its size.
SCREENS = {
    "shop": ("01_shop", PHONE),
    "share": ("16_share_link", PHONE),
    "checkout": ("05_checkout", PHONE),
    "khqr": ("11_khqr", PHONE),
    "orders": ("07_dashboard", PHONE),
    "laptop": ("laptop_orders", LAPTOP),
}
LANGS = ("km", "en")
MAX_BYTES = 1_200_000


def webp(image: Image.Image) -> bytes:
    """Preserve text edges and photos without compression artefacts."""
    buffer = io.BytesIO()
    image.save(buffer, "WEBP", method=6, lossless=True)
    return buffer.getvalue()


def screens(source: Path, names: list[str]) -> bool:
    ok = True
    for lang in LANGS:
        (PUBLIC / lang).mkdir(parents=True, exist_ok=True)
        for name in names:
            picture, size = SCREENS[name]
            png = source / lang / f"{picture}.png"
            if not png.exists():
                print(f"missing {png}")
                ok = False
                continue
            out = PUBLIC / lang / f"{name}.webp"
            with Image.open(png) as image:
                image = image.convert("RGB")
                if image.width < size[0] or image.height < size[1]:
                    print(f"too small {png}: {image.size}, need at least {size}; recapture it")
                    ok = False
                    continue
                if image.size != size:
                    image = image.resize(size, Image.Resampling.LANCZOS)
                out.write_bytes(webp(image))
            weight = out.stat().st_size
            too_big = weight > MAX_BYTES
            ok = ok and not too_big
            print(f"{out.relative_to(PUBLIC)}  {weight // 1000} KB{'  TOO BIG' if too_big else ''}")
    return ok


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", type=Path, default=HERE / "out", help="shots.py's out folder")
    parser.add_argument("--only", help="comma-separated screens, e.g. laptop")
    args = parser.parse_args()
    names = args.only.split(",") if args.only else list(SCREENS)
    unknown = [name for name in names if name not in SCREENS]
    if unknown:
        print(f"unknown screens: {', '.join(unknown)}")
        return 1
    return 0 if screens(args.source, names) else 1


if __name__ == "__main__":
    sys.exit(main())
