"""The start page's phone screens, from the marketing pictures.

    cd backend && .venv/bin/python marketing/home_images.py [--source DIR]

Takes 5 of the iPhone-sized PNGs that shots.py makes (marketing/out/,
git-ignored) in Khmer and English, and saves them as small WebPs for the
start page (frontend/public/home/<lang>/<screen>.webp, committed), plus the
film grain the page lays over everything (frontend/public/home/grain.webp,
the same file every run). Run it again after shots.py when a screen in the
app changes.

Exits 1 if a picture is missing or a screen comes out over 150 KB.
"""

import argparse
import random
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parents[1] / "frontend" / "public" / "home"

# shots.py's picture → the start page's name for it (pages/home/screens.ts).
SCREENS = {
    "01_shop": "shop",
    "16_share_link": "share",
    "05_checkout": "checkout",
    "11_khqr": "khqr",
    "07_dashboard": "orders",
}
LANGS = ("km", "en")
SIZE = (780, 1688)  # 2x a 390 x 844 phone screen
MAX_BYTES = 150_000
GRAIN = 128  # tiled; soft noise around mid-grey, which overlay blending leaves alone


def screens(source: Path) -> bool:
    ok = True
    for lang in LANGS:
        (PUBLIC / lang).mkdir(parents=True, exist_ok=True)
        for picture, name in SCREENS.items():
            png = source / lang / f"{picture}.png"
            if not png.exists():
                print(f"missing {png}")
                ok = False
                continue
            out = PUBLIC / lang / f"{name}.webp"
            with Image.open(png) as image:
                image.convert("RGB").resize(SIZE, Image.Resampling.LANCZOS).save(
                    out, "WEBP", quality=82, method=6
                )
            size = out.stat().st_size
            too_big = size > MAX_BYTES
            ok = ok and not too_big
            print(f"{out.relative_to(PUBLIC)}  {size // 1000} KB{'  TOO BIG' if too_big else ''}")
    return ok


def grain() -> None:
    noise = random.Random(1)
    image = Image.new("L", (GRAIN, GRAIN))
    image.putdata([max(0, min(255, round(noise.gauss(128, 28)))) for _ in range(GRAIN * GRAIN)])
    out = PUBLIC / "grain.webp"
    image.save(out, "WEBP", quality=50)
    print(f"{out.relative_to(PUBLIC)}  {out.stat().st_size // 1000} KB")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", type=Path, default=HERE / "out", help="shots.py's out folder")
    args = parser.parse_args()
    ok = screens(args.source)
    grain()
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
