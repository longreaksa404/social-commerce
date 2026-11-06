"""The Oak Wear clothing demo shop, built on this machine for marketing
pictures and clips (docs/superpowers/plans/2026-11-05-clothing-demo-shop.md).
Development only: it never reads or writes the live site.

    cd backend
    .venv/bin/python marketing/clothing_shop.py photos
    .venv/bin/python marketing/clothing_shop.py copy --lang km
    .venv/bin/python marketing/shots.py --copy marketing/out/clothing/copy-km \\
        --lang km --out marketing/out/clothing [--video]

The shop is clothing_shop.json: 50 products in 4 categories (the first 12
are the ones the marketing pictures buy; keep them first), their names
and descriptions in Khmer and English, options (colour / size) with
stock, and where each photo comes from. `photos` downloads the photos
from Pexels (free for business use, no credit needed:
pexels.com/license), crops each as the file says (the garment filling the
picture, no faces), and makes the shop's logo, its cover from catalogue
photos and a contact sheet to review them, in --photos. `copy` writes the
shop in one catalogue language the way demo_shop.py saves a copy of a live
shop (shop.json and photos/, each photo sized as the app uploads it), for
shots.py --copy, which seeds and films it like the live demo shop.
"""

import argparse
import json
import shutil
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "clothing_shop.json"
OUT = HERE / "out" / "clothing"
PHOTOS = OUT / "photos"
# Where the copy says its photos are: never fetched, only a path for
# demo_shop.photo_path (the copy's photos/ is served in its place).
PHOTO_HOST = "https://images.oaksolve.com/stores/oak-wear"
USER_AGENT = "oak-order-marketing/1.0 (demo catalogue photos)"
NAVY = (31, 51, 80)  # the shop colour "navy" (UI rules: primary #1f3350)
# As the app uploads them (frontend/src/lib/images.ts).
MAX_SIDE, QUALITY = 1600, 85
THUMB_SHORT_SIDE, THUMB_QUALITY = 480, 80
LOGO_SIDE, LOGO_QUALITY = 256, 90
COVER_SIZE = (1800, 600)
# The cropped photos kept here: sharp enough for any phone.
KEEP_SIDE = 2000


def manifest() -> dict:
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("georgiab.ttf", "DejaVuSerif-Bold.ttf", "LiberationSerif-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def download(photo_id: int, cache: Path) -> Image.Image:
    path = cache / f"{photo_id}.jpg"
    if not path.is_file():
        url = (
            f"https://images.pexels.com/photos/{photo_id}/pexels-photo-{photo_id}.jpeg"
            "?auto=compress&cs=tinysrgb&w=3000"
        )
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=60) as response:
            path.write_bytes(response.read())
    return Image.open(path).convert("RGB")


def crop(image: Image.Image, box: list[float]) -> Image.Image:
    left, top, right, bottom = box
    w, h = image.size
    part = image.crop((round(left * w), round(top * h), round(right * w), round(bottom * h)))
    part.thumbnail((KEEP_SIDE, KEEP_SIDE), Image.Resampling.LANCZOS)
    return part


def fill(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """The middle of `image` at `size`'s proportions, at `size`."""
    w, h = image.size
    ratio = size[0] / size[1]
    width = min(w, round(h * ratio))
    height = round(width / ratio)
    left, top = (w - width) // 2, (h - height) // 2
    middle = image.crop((left, top, left + width, top + height))
    return middle.resize(size, Image.Resampling.LANCZOS)


def logo() -> Image.Image:
    """The shop's name in white serif capitals on navy, inside the circle
    the shop shows its logo in."""
    side = 1024
    image = Image.new("RGB", (side, side), NAVY)
    draw = ImageDraw.Draw(image)
    big = font(150)
    for text, y in (("OAK", 0.33), ("WEAR", 0.53)):
        spaced = " ".join(text)
        width = draw.textlength(spaced, font=big)
        draw.text(((side - width) / 2, side * y), spaced, font=big, fill="white")
    line = round(side * 0.3)
    draw.line([(line, side * 0.51), (side - line, side * 0.51)], fill="white", width=5)
    return image


def cover(photos: dict[str, Image.Image], names: list[str]) -> Image.Image:
    """Catalogue photos side by side, a thin gap between them."""
    width, height = COVER_SIZE
    gap = 8
    tile = (width - gap * (len(names) - 1)) // len(names)
    image = Image.new("RGB", COVER_SIZE, (246, 247, 249))
    for place, name in enumerate(names):
        image.paste(fill(photos[name], (tile, height)), (place * (tile + gap), 0))
    return image


def contact_sheet(shop: dict, photos: dict[str, Image.Image], extra: dict[str, Image.Image]):
    """Every product with its photos, name and options, for review."""
    cell, label = 300, 150
    rows = [
        (f"{p['name']['en']} · {p['name']['km']} · ${p['price']}", [photos[n] for n in p["photos"]])
        for p in shop["products"]
    ]
    rows.append(("Logo and cover", list(extra.values())))
    cols = 4
    sheet = Image.new(
        "RGB", (cols * (2 * cell + 20), ((len(rows) + cols - 1) // cols) * (cell + label)), "white"
    )
    draw = ImageDraw.Draw(sheet)
    text = ImageFont.load_default()
    for name in ("KhmerUI.ttf", "NotoSansKhmer-Regular.ttf"):  # Khmer and Latin
        try:
            text = ImageFont.truetype(name, 18)
            break
        except OSError:
            continue
    for place, (title, images) in enumerate(rows):
        x0 = (place % cols) * (2 * cell + 20) + 10
        y0 = (place // cols) * (cell + label) + 10
        x = x0
        for image in images:
            small = image.copy()
            small.thumbnail((cell * 2 if len(images) == 1 else cell, cell))
            sheet.paste(small, (x, y0))
            x += small.width + 6
        draw.text((x0, y0 + cell + 8), title, fill="black", font=text)
    if "products" in shop:
        for place, product in enumerate(shop["products"]):
            x0 = (place % cols) * (2 * cell + 20) + 10
            y0 = (place // cols) * (cell + label) + 10 + cell + 34
            options = ", ".join(f"{c} / {s} ({n})" for c, s, n in product["variants"])
            for line, start in enumerate(range(0, len(options), 58)):
                draw.text(
                    (x0, y0 + line * 22), options[start : start + 58], fill=(91, 99, 112), font=text
                )
    return sheet


def make_photos(folder: Path) -> None:
    shop = manifest()
    cache = folder / "source"
    cache.mkdir(parents=True, exist_ok=True)
    photos = {}
    for name, entry in shop["photos"].items():
        photos[name] = crop(download(entry["pexels"], cache), entry["crop"])
        photos[name].save(folder / f"{name}.jpg", quality=92)
        print(f"{name:>16} {photos[name].width} x {photos[name].height}", flush=True)
    extra = {"logo": logo(), "cover": cover(photos, shop["cover"])}
    for name, image in extra.items():
        image.save(folder / f"{name}.jpg", quality=92)
    contact_sheet(shop, photos, extra).save(folder / "contact_sheet.jpg", quality=88)
    credits = [
        f"{name}.jpg: Pexels photo {entry['pexels']} by {entry['author']}, "
        f"https://www.pexels.com/photo/{entry['pexels']}/ (Pexels licence, no credit needed)"
        for name, entry in shop["photos"].items()
    ]
    (folder / "sources.txt").write_text("\n".join(credits) + "\n", encoding="utf-8")
    print(f"Photos, logo, cover and contact_sheet.jpg in {folder}")


def save_jpeg(image: Image.Image, path: Path, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "JPEG", quality=quality)


def scaled(image: Image.Image, scale: float) -> Image.Image:
    size = (round(image.width * min(1, scale)), round(image.height * min(1, scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def make_copy(lang: str, photos: Path, folder: Path) -> None:
    """The shop as demo_shop.fetch saves a live one: shop.json beside
    photos/ at the paths the photo URLs name."""
    shop = manifest()
    missing = [n for n in [*shop["photos"], "logo", "cover"] if not (photos / f"{n}.jpg").is_file()]
    if missing:
        sys.exit(f"No photos for {', '.join(missing)} in {photos}: run `photos` first.")
    shutil.rmtree(folder, ignore_errors=True)
    served = folder / "photos"

    def url(path: str) -> str:
        return f"{PHOTO_HOST}/{path}"

    def path_of(address: str) -> Path:
        return served / address.removeprefix("https://images.oaksolve.com/")

    open_ = lambda name: Image.open(photos / f"{name}.jpg").convert("RGB")  # noqa: E731
    logo_url, cover_url = url("logo/logo.jpg"), url("cover/cover.jpg")
    save_jpeg(fill(open_("logo"), (LOGO_SIDE, LOGO_SIDE)), path_of(logo_url), LOGO_QUALITY)
    save_jpeg(fill(open_("cover"), COVER_SIZE), path_of(cover_url), QUALITY)

    info = shop["shop"]
    colours = shop["colours"]
    categories = {
        c["slug"]: {"name": c["name"][lang], "slug": c["slug"]} for c in shop["categories"]
    }
    products = []
    for entry in shop["products"]:
        image_urls = []
        for name in entry["photos"]:
            address = url(f"products/{entry['slug']}/{name}-m.jpg")
            image = open_(name)
            save_jpeg(scaled(image, MAX_SIDE / max(image.size)), path_of(address), QUALITY)
            small = scaled(image, THUMB_SHORT_SIDE / min(image.size))
            save_jpeg(small, path_of(address.replace("-m.jpg", "-s.jpg")), THUMB_QUALITY)
            image_urls.append(address)
        variants = [
            {
                "name": f"{colours[colour] if lang == 'km' else colour} / {size}",
                "price": entry["price"],
                "stock_quantity": stock,
                "was_price": None,
            }
            for colour, size, stock in entry["variants"]
        ]
        products.append(
            {
                "slug": entry["slug"],
                "name": entry["name"][lang],
                "description": entry["description"][lang],
                "price": entry["price"],
                "was_price": None,
                "image_urls": image_urls,
                "has_variants": True,
                "stock_quantity": None,
                "category": categories[entry["category"]],
                "variants": variants,
            }
        )
    copy = {
        "shop": {
            "name": info["name"],
            "slug": info["slug"],
            "description": info["description"][lang],
            "logo_url": logo_url,
            "cover_url": cover_url,
            "color": info["color"],
            "currency": info["currency"],
            # No contacts: a made-up one could be a real person's.
            "telegram_username": None,
            "contact_phone": None,
            "messenger_username": None,
            "instagram_username": None,
            "payment_methods": info["payment_methods"],
            "delivery": {
                "fee": info["delivery_fee"],
                "free_from_amount": info["free_delivery_from"],
                "free_from_items": None,
                "own_delivery": True,
                "couriers": [],
                "pickup": {"address": info["pickup_address"][lang]},
            },
            "discounts": [],
            "categories": [
                {**category, "product_count": sum(p["category"] == slug for p in shop["products"])}
                for slug, category in categories.items()
            ],
        },
        "products": products,
    }
    (folder / "shop.json").write_text(
        json.dumps(copy, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8"
    )
    print(f"Oak Wear ({lang}) in {folder}: {len(products)} products")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    commands = parser.add_subparsers(dest="command", required=True)
    photos = commands.add_parser("photos", help="download, crop and review the photos")
    photos.add_argument("--photos", type=Path, default=PHOTOS)
    copy = commands.add_parser("copy", help="the shop in one language, for shots.py --copy")
    copy.add_argument("--lang", choices=("km", "en"), required=True)
    copy.add_argument("--photos", type=Path, default=PHOTOS)
    copy.add_argument("--out", type=Path, help="default: out/clothing/copy-<lang>")
    args = parser.parse_args()
    if args.command == "photos":
        make_photos(args.photos)
    else:
        make_copy(args.lang, args.photos, args.out or OUT / f"copy-{args.lang}")


if __name__ == "__main__":
    main()
