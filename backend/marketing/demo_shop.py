"""Seed the marketing demo shop into its own local database, for
marketing/shots.py. Development only.

    cd backend && .venv/bin/python marketing/demo_shop.py --fetch --image-base http://localhost:8091

The shop is a copy of the founder's demo shop on the live site (its link
code in the .env as DEMO_SHOP_SLUG), read through the public storefront
only: GET requests, no login, nothing written there. `fetch` saves those
answers and the shop's photos to a folder, whose photos/ shots.py serves
as the shop's photo host. `seed` writes the shop from that folder straight
to the database like loadtest/seed_perf.py, with earlier orders so the
dashboard isn't empty. It creates and migrates `social_commerce_demo`,
then empties it, so it refuses anything but a database on this machine
whose name ends in `_demo`. Every id and time is fixed, so the same live
shop gives the same demo shop.

Copied: the name, description, logo, cover, colour, currency, contacts,
delivery, bill discounts, categories, and every product with its photos,
options, prices and stock. Not public, so not copied: sales (a product on
sale keeps its sale price, without the crossed-out one), the low-stock
level (the app's default, 5) and the KHQR details, which come from the
.env: DEMO_BAKONG_ID, and with ABA's shared ID (abaakhppxxx@abaa) the
account number in the QR as DEMO_KHQR_ACCOUNT (from a "dual" QR, the one
in the shop's currency, as lib/readKhqr.ts picks it). Without them the
copy takes cash on delivery only.
"""

import argparse
import asyncio
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from loadtest.seed_perf import LOCAL_HOSTS, TABLES, create_database  # noqa: E402

DEFAULT_DATABASE = "social_commerce_demo"
DEFAULT_COPY = Path(__file__).resolve().parent / "out" / ".work" / "live"
LIVE_API = "https://api.oaksolve.com/api/v1"
# Cloudflare turns away Python's own user agent.
USER_AGENT = "oak-order-marketing/1.0 (demo shop copy, read only)"
# ABA's one Bakong ID for all its customers: the QR also needs the account.
ABA_SHARED_ID = "abaakhppxxx@abaa"
# The seller's login on the demo dashboard (a test password, local only).
PHONE = "012888168"
PASSWORD = "demo-password-123"
# The moment the pictures show: the browser's clock is frozen here and the
# new orders are dated a minute before it (shots.py). In the past, so it
# can never be mistaken for a time the API stamps during a run.
NOW = datetime(2026, 10, 2, 3, 42, tzinfo=UTC)  # 10:42 in Phnom Penh, a Friday
ORDER_TIME = NOW - timedelta(minutes=1)

# Earlier orders, oldest first, so the dashboard and Customers aren't
# empty: (customer, phone, address, [(product's place in the shop, from 0;
# quantity)], age, order status, payment method, payment status, delivery
# status). A product with options is bought in its middle one.
EARLIER = (
    (
        "Vannak Heng",
        "011223344",
        "#9, St 2011, Sen Sok, Phnom Penh",
        [(10, 1)],
        timedelta(days=5, hours=2),
        "completed",
        "cod",
        "paid",
        "delivered",
    ),
    (
        "ស្រីពៅ ជា",
        "098112233",
        "ផ្ទះលេខ ១២ ផ្លូវ ៣៧១ សង្កាត់ស្ទឹងមានជ័យ ភ្នំពេញ",
        [(6, 1)],
        timedelta(days=3, hours=6),
        "completed",
        "khqr",
        "paid",
        "delivered",
    ),
    (
        "Sokha Chan",
        "092345671",
        "#18, St 155, Toul Tompoung, Phnom Penh",
        [(12, 1)],
        timedelta(days=2, hours=3),
        "completed",
        "cod",
        "paid",
        "delivered",
    ),
    (
        "ដារ៉ា គឹម",
        "077456123",
        "ផ្ទះលេខ ៧ ផ្លូវ ៥៩៨ សង្កាត់ទួលគោក ភ្នំពេញ",
        [(2, 1), (8, 1)],
        timedelta(hours=19),
        "accepted",
        "khqr",
        "paid",
        "in_transit",
    ),
    (
        "Malis Chea",
        "087654321",
        "#3, St 63, BKK1, Phnom Penh",
        [(4, 2)],
        timedelta(hours=5, minutes=10),
        "accepted",
        "khqr",
        "paid",
        "not_assigned",
    ),
    (
        "Pisey Long",
        "015678234",
        "#42, St 2004, Sen Sok, Phnom Penh",
        [(14, 1)],
        timedelta(hours=2, minutes=25),
        "accepted",
        "cod",
        "pending",
        "not_assigned",
    ),
)


def fixed_id(name: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, f"oak-order-demo/{name}")


def fixed_hex(name: str) -> str:
    return hashlib.sha256(name.encode()).hexdigest()[:32]


def env(name: str) -> str:
    """From the environment, else the repo's .env (where the app reads it)."""
    from dotenv import dotenv_values

    from app.core.config import ENV_FILE

    value = os.environ.get(name)
    if value is None and ENV_FILE.is_file():
        value = dotenv_values(ENV_FILE).get(name)
    return (value or "").strip()


def database_url(name: str) -> str:
    """The .env's local database, renamed; refuses anything else."""
    from sqlalchemy.engine import make_url

    from app.core.config import get_settings

    url = make_url(get_settings().database_url)
    if url.host not in LOCAL_HOSTS or not name.endswith("_demo"):
        sys.exit(f"Refusing: only a database on this machine named *_demo (got {url.host}/{name}).")
    return url.set(database=name).render_as_string(hide_password=False)


def khqr_settings() -> tuple[dict | None, str]:
    """The founder's KHQR details from the .env (without the name the
    customer's bank app shows, which is the shop's), or None and why."""
    bakong = env("DEMO_BAKONG_ID")
    if not bakong:
        return None, "no DEMO_BAKONG_ID in the .env"
    account = env("DEMO_KHQR_ACCOUNT").replace(" ", "")
    shared = bakong.lower() == ABA_SHARED_ID
    if shared and not account:
        return None, (
            f"DEMO_BAKONG_ID is ABA's shared ID ({ABA_SHARED_ID}): add your ABA account "
            "number as DEMO_KHQR_ACCOUNT to the .env"
        )
    bank = "ABA Bank" if shared else ""  # as ABA's own QR names it
    return {"bakong_account_id": bakong, "account_information": account, "acquiring_bank": bank}, ""


# --- the live shop -------------------------------------------------------------


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def fetch(folder: Path) -> dict:
    """Reads the live demo shop through its public storefront into
    `folder` (shop.json and photos/, at the paths they have on the live
    photo host); stops if it can't."""
    slug = env("DEMO_SHOP_SLUG")
    if not slug:
        sys.exit(
            "No DEMO_SHOP_SLUG in the .env: the live demo shop's code, order.oaksolve.com/shop/<it>"
        )
    shop_url = f"{LIVE_API}/shop/{urllib.parse.quote(slug)}"
    try:
        shop = json.loads(get(shop_url))
        cards = json.loads(get(f"{shop_url}/products"))
        # A few at a time: well inside the storefront's rate limit.
        with ThreadPoolExecutor(8) as pool:
            pages = [f"{shop_url}/products/{urllib.parse.quote(card['slug'])}" for card in cards]
            products = [json.loads(page) for page in pool.map(get, pages)]
            urls = photo_urls(shop, products)
            photos = dict(zip(urls, pool.map(get, urls), strict=True))
    except urllib.error.HTTPError as error:
        sys.exit(f"Couldn't read the live demo shop: HTTP {error.code} from {error.url}")
    except OSError as error:  # no connection, DNS, timeout
        sys.exit(
            f"Couldn't reach the live site for the demo shop: {getattr(error, 'reason', error)}"
        )
    if not products:
        sys.exit(f"The live demo shop {slug} has no products to copy.")

    shutil.rmtree(folder, ignore_errors=True)
    served = (folder / "photos").resolve()
    for url, data in photos.items():
        path = (served / photo_path(url)).resolve()
        if served not in path.parents:
            sys.exit(f"Refusing a photo outside the copy's folder: {url}")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    copy = {"shop": shop, "products": products}
    (folder / "shop.json").write_text(
        json.dumps(copy, ensure_ascii=False, indent=1, sort_keys=True)
    )
    return copy


def photo_urls(shop: dict, products: list[dict]) -> list[str]:
    """The logo, the cover and every product photo with the small copy the
    shop's grids show (lib/images.ts: "-m.<ext>" has "-s.jpg" beside it)."""
    urls = [shop["logo_url"], shop["cover_url"]]
    for product in products:
        for url in product["image_urls"]:
            urls += [url, re.sub(r"-m\.(jpg|png|webp)$", "-s.jpg", url)]
    return list(dict.fromkeys(url for url in urls if url))


def photo_path(url: str) -> str:
    return urllib.parse.urlsplit(url).path.lstrip("/")


def load(folder: Path) -> dict:
    """The copy `fetch` saved."""
    try:
        return json.loads((folder / "shop.json").read_text())
    except FileNotFoundError:
        sys.exit(f"No copy of the live shop in {folder}: run with --fetch first.")


# --- the demo shop -------------------------------------------------------------


def middle_option(product: dict) -> dict | None:
    variants = product["variants"]
    return variants[len(variants) // 2] if variants else None


def khqr_name(shop_name: str) -> str:
    """The name bank apps show (plain capitals, at most 25): the shop's."""
    name = re.sub(r"[^A-Z0-9 &.-]", "", shop_name.upper())
    return re.sub(r" +", " ", name).strip()[:25] or "SHOP"


def build_rows(
    copy: dict, image_base: str, password_hash: str, khqr: dict | None
) -> dict[str, list[dict]]:
    from app.models import DeliveryMethod
    from app.schemas.delivery import DeliverySettings, DiscountSettings
    from app.services.pricing import line_total, order_totals

    shop, products = copy["shop"], copy["products"]
    rows: dict[str, list[dict]] = {}

    def add(table: str, **row: object) -> dict:
        rows.setdefault(table, []).append(row)
        return row

    def local(url: str | None) -> str | None:
        return url and f"{image_base}/{photo_path(url)}"

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
    live = shop["delivery"]
    delivery = {
        "fee": live["fee"],
        "free_from_amount": live["free_from_amount"],
        "free_from_items": live["free_from_items"],
        "own_delivery": {"enabled": live["own_delivery"]},
        "couriers": live["couriers"],
        "pickup": {
            "enabled": live["pickup"] is not None,
            "address": (live["pickup"] or {}).get("address", ""),
        },
    }
    discounts = {"rules": shop["discounts"]}
    payments = {"cod": {"enabled": "cod" in shop["payment_methods"]}, "khqr": {"enabled": False}}
    if khqr:
        payments["khqr"] = {"enabled": True, "merchant_name": khqr_name(shop["name"]), **khqr}
    add(
        "store",
        id=store_id,
        seller_id=seller_id,
        name=shop["name"],
        slug=shop["slug"],
        description=shop["description"],
        logo_url=local(shop["logo_url"]),
        cover_url=local(shop["cover_url"]),
        color=shop["color"],
        currency=shop["currency"],
        telegram_username=shop["telegram_username"],
        contact_phone=shop["contact_phone"],
        messenger_username=shop["messenger_username"],
        instagram_username=shop["instagram_username"],
        payment_config=payments,
        delivery_config=delivery,
        discount_config=discounts,
        order_confirmation_mode="manual",
        # Open and paid up: a shop without paid_until is still in setup
        # and takes no orders (app/services/plan.py).
        paid_until=date(2099, 12, 31),
        created_at=opened,
    )
    categories = {}
    for category in shop["categories"]:
        categories[category["slug"]] = add(
            "category",
            id=fixed_id(f"category/{category['slug']}"),
            store_id=store_id,
            name=category["name"],
            slug=category["slug"],
            created_at=opened,
        )

    saved = []  # (product row, {option name: variant row}), in the shop's order
    for index, entry in enumerate(products):
        # Newest first in the shop, as on the live one.
        created = opened + timedelta(days=60, minutes=-index)
        price = Decimal(entry["price"])
        product = add(
            "product",
            id=fixed_id(f"product/{entry['slug']}"),
            store_id=store_id,
            category_id=entry["category"] and categories[entry["category"]["slug"]]["id"],
            name=entry["name"],
            slug=entry["slug"],
            description=entry["description"],
            price=price,
            image_urls=[local(url) for url in entry["image_urls"]],
            status="active",
            has_variants=entry["has_variants"],
            stock_quantity=entry["stock_quantity"],
            created_at=created,
            updated_at=created,
        )
        options = {}
        for variant in entry["variants"]:
            options[variant["name"]] = add(
                "product_variant",
                id=fixed_id(f"product/{entry['slug']}/{variant['name']}"),
                store_id=store_id,
                product_id=product["id"],
                name=variant["name"],
                sku=None,
                price_override=None
                if Decimal(variant["price"]) == price
                else Decimal(variant["price"]),
                stock_quantity=variant["stock_quantity"],
                created_at=created,
            )
        saved.append((product, options))

    delivery_settings = DeliverySettings.model_validate(delivery)
    discount_settings = DiscountSettings.model_validate(discounts)
    currency = shop["currency"]
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
        items = []
        for place, quantity in lines:
            entry = products[place % len(products)]
            product, options = saved[place % len(products)]
            option = middle_option(entry)
            variant = option and options[option["name"]]
            unit = Decimal(option["price"]) if option else product["price"]
            items.append((product, variant, unit, quantity, line_total(unit, quantity)))
        totals = order_totals(
            [item[4] for item in items],
            item_count=sum(item[3] for item in items),
            method=DeliveryMethod.SELLER_DELIVERY,
            delivery=delivery_settings,
            discounts=discount_settings,
        )
        add(
            "order",
            id=order_id,
            store_id=store_id,
            number=number,
            customer_id=customer_id,
            status=status,
            currency=currency,
            subtotal=totals.subtotal,
            discount=totals.discount,
            delivery_fee=totals.delivery_fee,
            total=totals.total,
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
        for position, (product, variant, unit, quantity, total) in enumerate(items):
            add(
                "order_item",
                id=fixed_id(f"order/{number}/{position}"),
                store_id=store_id,
                order_id=order_id,
                product_id=product["id"],
                variant_id=variant and variant["id"],
                product_name_snapshot=product["name"],
                variant_name_snapshot=variant and variant["name"],
                unit_price_snapshot=unit,
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
            amount=totals.total,
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
        # Seen already: only the new orders are unread on the bell.
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
                    "item_count": sum(item[3] for item in items),
                    "total": str(totals.total),
                    "currency": currency,
                    "accepted_automatically": False,
                }
            },
            status="sent",
            sent_at=created,
            read_at=created + timedelta(minutes=5),
        )
    return rows


async def seed(copy: dict, image_base: str, khqr: dict | None) -> dict[str, int]:
    from sqlalchemy import insert, text

    import app.models  # noqa: F401  (registers every table on Base.metadata)
    from app.core.security import hash_password
    from app.db.base import Base
    from app.db.session import engine

    # The last guard before TRUNCATE: the engine really is the demo database.
    if engine.url.host not in LOCAL_HOSTS or not str(engine.url.database).endswith("_demo"):
        sys.exit(f"Refusing to empty {engine.url.host}/{engine.url.database}.")

    rows = build_rows(copy, image_base, await hash_password(PASSWORD), khqr)
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
    parser.add_argument("--copy", type=Path, default=DEFAULT_COPY, help="the live shop's copy")
    parser.add_argument("--fetch", action="store_true", help="read the live shop into --copy first")
    parser.add_argument(
        "--image-base", required=True, help="the address --copy/photos is served at"
    )
    parser.add_argument("--database", default=DEFAULT_DATABASE, help="a local database, *_demo")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    url = database_url(args.database)
    copy = fetch(args.copy) if args.fetch else load(args.copy)
    khqr, why_not = khqr_settings()
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
    counts = asyncio.run(seed(copy, args.image_base.rstrip("/"), khqr))
    if not args.quiet:
        for table, count in counts.items():
            print(f"{table:>18} {count:>4}")
        if why_not:
            print(f"Cash on delivery only: {why_not}")
        print(f"Log in as {PHONE} / {PASSWORD} (dashboard), shop /shop/{copy['shop']['slug']}")


if __name__ == "__main__":
    main()
