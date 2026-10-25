"""Seed the marketing demo shop into its own local database, for
marketing/shots.py. Development only.

    cd backend && .venv/bin/python marketing/demo_shop.py --photos ~/oak-photos

One shop, `bopha-boutique` (the products in CATALOG, three earlier orders),
written straight to the database like loadtest/seed_perf.py. It creates
and migrates `social_commerce_demo`, then empties it, so it refuses
anything but a database on this machine whose name ends in `_demo`.
Every id and time is fixed, so two runs give the same shop.

The photos folder holds one photo per product, named as in CATALOG
(`1.jpg`, `2.png`, ...), and optionally `logo.*` and `cover.*`. They are
copied, shrunk as the app's uploads are, to `--serve-dir`, where
shots.py serves them as the shop's photo host.
"""

import argparse
import asyncio
import hashlib
import os
import subprocess
import sys
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from loadtest.seed_perf import LOCAL_HOSTS, TABLES, create_database  # noqa: E402

DEFAULT_DATABASE = "social_commerce_demo"
SLUG = "bopha-boutique"
# The seller's login on the demo dashboard (a test password, local only).
PHONE = "012888168"
PASSWORD = "demo-password-123"
# The moment the pictures show: the browser's clock is frozen here and the
# new order is dated a minute before it (shots.py). In the past, so it can
# never be mistaken for a time the API stamps during a run.
NOW = datetime(2026, 10, 2, 3, 42, tzinfo=UTC)  # 10:42 in Phnom Penh, a Friday
ORDER_TIME = NOW - timedelta(minutes=1)

PHOTO_TYPES = (".jpg", ".jpeg", ".png", ".webp")

# Edit to match your photos: each product's `photo` is a file name in the
# photos folder without its extension. The one with `options` is the
# product the customer picks an option on (shots.py picks `pick`).
CATALOG = (
    {
        "photo": "1",
        "name": "រ៉ូបផ្កា",
        "price": "12.00",
        "category": "clothes",
        "options": ("S", "M", "L"),
        "pick": "M",
        "description": "រ៉ូបផ្កាក្រណាត់ទន់ ពាក់ស្រួល ស័ក្តិសមដើរលេង និងទៅធ្វើការ។\n"
        "Soft floral dress, true to size.",
    },
    {
        "photo": "2",
        "name": "អាវយឺតកប្បាស",
        "price": "6.50",
        "category": "clothes",
        "description": "អាវយឺតកប្បាសសុទ្ធ ១០០% ទន់ ស្រូបញើសល្អ។\n100% cotton T-shirt.",
    },
    {
        "photo": "3",
        "name": "ខោខូវប៊យ",
        "price": "14.00",
        "category": "clothes",
        "description": "ខោខូវប៊យជើងត្រង់ ក្រណាត់យឺតបន្តិច។\nStraight-leg jeans with a little stretch.",
    },
    {
        "photo": "4",
        "name": "កាបូបស្ពាយ",
        "price": "9.50",
        "category": "accessories",
        "description": "កាបូបស្ពាយស្បែក ទំហំល្មម ដាក់ទូរស័ព្ទ និងកាបូបលុយបាន។",
    },
    {
        "photo": "5",
        "name": "ស្បែកជើងប៉ាតា",
        "price": "18.00",
        "category": "accessories",
        "description": "ស្បែកជើងប៉ាតាស្រាល ពាក់ដើរបានយូរមិនឈឺជើង។",
    },
)
CATEGORIES = {"clothes": "សម្លៀកបំពាក់", "accessories": "គ្រឿងលម្អ"}
STOCK = 30  # above the low-stock level, so the new order raises no alert

# Earlier orders, so the dashboard isn't empty: (customer, phone, address,
# [(product index, option, quantity)], age, order status, payment method,
# payment status, delivery status).
EARLIER = (
    (
        "Sokha Chan",
        "092345671",
        "#18, St 155, Toul Tompoung, Phnom Penh",
        [(1, None, 2)],
        timedelta(days=2, hours=3),
        "completed",
        "cod",
        "paid",
        "delivered",
    ),
    (
        "ដារ៉ា គឹម",
        "077456123",
        "#7, St 598, Toul Kork, Phnom Penh",
        [(0, "S", 1), (3, None, 1)],
        timedelta(hours=19),
        "shipped",
        "khqr",
        "paid",
        "in_transit",
    ),
    (
        "Pisey Long",
        "015678234",
        "#42, St 2004, Sen Sok, Phnom Penh",
        [(2, None, 1)],
        timedelta(hours=2, minutes=25),
        "accepted",
        "cod",
        "pending",
        "not_assigned",
    ),
)
DELIVERY_FEE = Decimal("1.50")


def fixed_id(name: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, f"oak-order-demo/{name}")


def fixed_hex(name: str) -> str:
    return hashlib.sha256(name.encode()).hexdigest()[:32]


def database_url(name: str) -> str:
    """The .env's local database, renamed; refuses anything else."""
    from sqlalchemy.engine import make_url

    from app.core.config import get_settings

    url = make_url(get_settings().database_url)
    if url.host not in LOCAL_HOSTS or not name.endswith("_demo"):
        sys.exit(f"Refusing: only a database on this machine named *_demo (got {url.host}/{name}).")
    return url.set(database=name).render_as_string(hide_password=False)


def find_photo(folder: Path, stem: str) -> Path | None:
    for suffix in PHOTO_TYPES:
        for candidate in (folder / f"{stem}{suffix}", folder / f"{stem}{suffix.upper()}"):
            if candidate.is_file():
                return candidate
    return None


def save_jpeg(image, path: Path, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(path, "JPEG", quality=quality)


def prepare_photos(folder: Path, serve_dir: Path, image_base: str) -> dict[str, str | None]:
    """The photos, shrunk and named as the app's uploads are, under
    `serve_dir`; returns their addresses (product photo, logo, cover)."""
    from PIL import Image, ImageOps

    store_id = fixed_id("store")
    missing = [p["photo"] for p in CATALOG if find_photo(folder, p["photo"]) is None]
    if missing:
        names = ", ".join(f"{stem}.jpg" for stem in missing)
        sys.exit(f"Missing in {folder}: {names} (one photo per product; see CATALOG).")

    urls: dict[str, str | None] = {}
    for product in CATALOG:
        with Image.open(find_photo(folder, product["photo"])) as opened:
            image = ImageOps.exif_transpose(opened)
            path = f"stores/{store_id}/products/{fixed_id(product['photo'])}"
            name = fixed_hex(product["photo"])
            # As lib/images.ts: longest side 1600, and a copy 480 on its short side.
            big = image.copy()
            big.thumbnail((1600, 1600))
            save_jpeg(big, serve_dir / path / f"{name}-m.jpg", 85)
            scale = min(1, 480 / min(image.size))
            small = image.resize((round(image.width * scale), round(image.height * scale)))
            save_jpeg(small, serve_dir / path / f"{name}-s.jpg", 80)
            urls[product["photo"]] = f"{image_base}/{path}/{name}-m.jpg"

    # As the app crops them: a 256 px square logo, a 3:1 cover.
    for kind, size in (("logo", (256, 256)), ("cover", (1800, 600))):
        source = find_photo(folder, kind)
        urls[kind] = None
        if source is None:
            continue
        with Image.open(source) as opened:
            image = ImageOps.fit(ImageOps.exif_transpose(opened), size)
            path = f"stores/{store_id}/{kind}/{fixed_hex(kind)}.jpg"
            save_jpeg(image, serve_dir / path, 85)
            urls[kind] = f"{image_base}/{path}"
    return urls


def build_rows(urls: dict[str, str | None], password_hash: str) -> dict[str, list[dict]]:
    rows: dict[str, list[dict]] = {}

    def add(table: str, **row: object) -> dict:
        rows.setdefault(table, []).append(row)
        return row

    seller_id, store_id = fixed_id("seller"), fixed_id("store")
    opened = NOW - timedelta(days=120)
    add(
        "seller",
        id=seller_id,
        phone=PHONE,
        password_hash=password_hash,
        full_name="Bopha Sok",
        created_at=opened,
    )
    add(
        "store",
        id=store_id,
        seller_id=seller_id,
        name="Bopha Boutique",
        slug=SLUG,
        description="សម្លៀកបំពាក់នារី និងគ្រឿងលម្អ តម្លៃសមរម្យ។ ដឹកជញ្ជូនក្នុងភ្នំពេញ ១ថ្ងៃ និងតាមខេត្ត ២-៣ថ្ងៃ។",
        logo_url=urls["logo"],
        cover_url=urls["cover"],
        currency="USD",
        contact_phone="012888168",
        payment_config={
            "cod": {"enabled": True},
            # A made-up account: the customer in the pictures pays cash.
            "khqr": {
                "enabled": True,
                "bakong_account_id": "bophaboutique@aclb",
                "merchant_name": "BOPHA BOUTIQUE",
            },
        },
        delivery_config={
            "fee": str(DELIVERY_FEE),
            "free_from_amount": None,
            "free_from_items": None,
            "own_delivery": {"enabled": True},
            "couriers": [],
            "pickup": {"enabled": True, "address": "#25, St 271, Phnom Penh"},
        },
        discount_config={"rules": []},
        order_confirmation_mode="manual",
        # Open and paid up: a shop without paid_until is still in setup
        # and takes no orders (app/services/plan.py).
        paid_until=date(2099, 12, 31),
        created_at=opened,
    )
    categories = {}
    for key, name in CATEGORIES.items():
        categories[key] = add(
            "category",
            id=fixed_id(f"category/{key}"),
            store_id=store_id,
            name=name,
            slug=key,
            created_at=opened,
        )

    # (product, variant or None) by CATALOG index and option
    sellable: dict[tuple[int, str | None], tuple[dict, dict | None]] = {}
    for index, entry in enumerate(CATALOG):
        options = entry.get("options", ())
        # Newest first in the shop: the first in CATALOG is the newest.
        created = opened + timedelta(days=60 - index)
        product = add(
            "product",
            id=fixed_id(entry["photo"]),
            store_id=store_id,
            category_id=categories[entry["category"]]["id"],
            name=entry["name"],
            slug=f"product-{index + 1}",
            description=entry["description"],
            price=Decimal(entry["price"]),
            image_urls=[urls[entry["photo"]]],
            status="active",
            has_variants=bool(options),
            stock_quantity=None if options else STOCK,
            created_at=created,
            updated_at=created,
        )
        sellable[(index, None)] = (product, None)
        for option in options:
            variant = add(
                "product_variant",
                id=fixed_id(f"{entry['photo']}/{option}"),
                store_id=store_id,
                product_id=product["id"],
                name=option,
                sku=None,
                price_override=None,
                stock_quantity=STOCK,
                created_at=created,
            )
            sellable[(index, option)] = (product, variant)

    for number, (name, phone, address, lines, age, status, method, paid, sent) in enumerate(
        EARLIER, start=1001
    ):
        created = NOW - age
        customer_id = fixed_id(f"customer/{phone}")
        add(
            "customer",
            id=customer_id,
            store_id=store_id,
            name=name,
            phone=phone,
            address=address,
            created_at=created,
        )
        order_id = fixed_id(f"order/{number}")
        items, subtotal = [], Decimal("0.00")
        for index, option, quantity in lines:
            product, variant = sellable[(index, option)]
            total = product["price"] * quantity
            subtotal += total
            items.append((product, variant, quantity, total))
        grand = subtotal + DELIVERY_FEE
        add(
            "order",
            id=order_id,
            store_id=store_id,
            number=number,
            customer_id=customer_id,
            status=status,
            currency="USD",
            subtotal=subtotal,
            discount=Decimal("0.00"),
            delivery_fee=DELIVERY_FEE,
            total=grand,
            delivery_method="seller_delivery",
            delivery_address=address,
            delivery_lat=None,
            delivery_lng=None,
            delivery_address_note=None,
            notes=None,
            source="facebook",
            created_at=created,
            updated_at=created + timedelta(minutes=20),
        )
        for position, (product, variant, quantity, total) in enumerate(items):
            add(
                "order_item",
                id=fixed_id(f"order/{number}/{position}"),
                store_id=store_id,
                order_id=order_id,
                product_id=product["id"],
                variant_id=variant and variant["id"],
                product_name_snapshot=product["name"],
                variant_name_snapshot=variant and variant["name"],
                unit_price_snapshot=product["price"],
                quantity=quantity,
                line_total=total,
            )
        add(
            "payment",
            id=fixed_id(f"order/{number}/payment"),
            store_id=store_id,
            order_id=order_id,
            method=method,
            status=paid,
            amount=grand,
            reference=None,
            paid_at=created + timedelta(minutes=30) if paid == "paid" else None,
            created_at=created,
        )
        add(
            "delivery",
            id=fixed_id(f"order/{number}/delivery"),
            store_id=store_id,
            order_id=order_id,
            method="seller_delivery",
            status=sent,
            courier=None,
            assignee_note=None,
            created_at=created,
            updated_at=created + timedelta(minutes=20),
        )
        # Seen already: only the new order is unread on the bell.
        add(
            "notification_log",
            id=fixed_id(f"order/{number}/notification"),
            store_id=store_id,
            channel="web",
            event_type="new_order",
            payload={
                "order": {
                    "id": str(order_id),
                    "number": number,
                    "customer_name": name,
                    "item_count": sum(item[2] for item in items),
                    "total": str(grand),
                    "currency": "USD",
                    "accepted_automatically": False,
                }
            },
            status="sent",
            sent_at=created,
            read_at=created + timedelta(minutes=5),
        )
    return rows


async def seed(urls: dict[str, str | None]) -> dict[str, int]:
    from sqlalchemy import insert, text

    import app.models  # noqa: F401  (registers every table on Base.metadata)
    from app.core.security import hash_password
    from app.db.base import Base
    from app.db.session import engine

    # The last guard before TRUNCATE: the engine really is the demo database.
    if engine.url.host not in LOCAL_HOSTS or not str(engine.url.database).endswith("_demo"):
        sys.exit(f"Refusing to empty {engine.url.host}/{engine.url.database}.")

    rows = build_rows(urls, await hash_password(PASSWORD))
    async with engine.begin() as connection:
        names = ", ".join(f'"{table}"' for table in Base.metadata.tables)
        await connection.execute(text(f"TRUNCATE {names} CASCADE"))
        for table in TABLES:
            if rows.get(table):
                await connection.execute(insert(Base.metadata.tables[table]), rows[table])
    await engine.dispose()
    return {table: len(rows.get(table, [])) for table in TABLES if rows.get(table)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--photos", type=Path, required=True, help="folder with the photos")
    parser.add_argument("--serve-dir", type=Path, required=True, help="where to put them")
    parser.add_argument("--image-base", required=True, help="the address serve-dir is served at")
    parser.add_argument("--database", default=DEFAULT_DATABASE, help="a local database, *_demo")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    if not args.photos.is_dir():
        sys.exit(f"No such folder: {args.photos}")
    url = database_url(args.database)
    urls = prepare_photos(args.photos, args.serve_dir, args.image_base)
    asyncio.run(create_database(url))
    os.environ["DATABASE_URL"] = url
    # The settings were read with the .env's database: read them again.
    from app.core.config import get_settings

    get_settings.cache_clear()
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND,
        check=True,
        env=os.environ,
        capture_output=args.quiet,
    )
    counts = asyncio.run(seed(urls))
    if not args.quiet:
        for table, count in counts.items():
            print(f"{table:>18} {count:>4}")
        print(f"Log in as {PHONE} / {PASSWORD} (dashboard), shop /shop/{SLUG}")


if __name__ == "__main__":
    main()
