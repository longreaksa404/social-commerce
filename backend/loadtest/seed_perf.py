"""Fill a local database with a realistic amount of shop data, for the
performance audit (docs/PERF_AUDIT.md). Development only.

    cd backend && .venv/bin/python loadtest/seed_perf.py

20 shops: one big one (`perf-big`: 500 products, 2,000 customers, 5,000
orders over a year, each with its payment, delivery and notifications,
plus links and their views) and 19 small ones, so every tenant table holds
other shops' rows too, as in production.

Writes straight to the database (not through the API: 5,000 checkouts
would take a while) into its own database, `social_commerce_perf` by
default. It creates and migrates that database, then empties it, so it
refuses anything but a database on this machine whose name ends in
`_perf`. The shops log in with an email (`perf-big@example.com` ...) and
PASSWORD below.
"""

import argparse
import asyncio
import os
import random
import secrets
import subprocess
import sys
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

# A test password for test shops in a local database.
PASSWORD = "perf-password-123"
DEFAULT_DATABASE = "social_commerce_perf"
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
# Where the product photos and logos point. loadtest/measure.py serves
# stand-in photos there (`--serve-images`) for the browser measurements.
DEFAULT_IMAGE_BASE = "http://localhost:8090"

BIG = {"products": 500, "categories": 12, "customers": 2000, "orders": 5000, "links": 40}
SMALL = {"products": 25, "categories": 3, "customers": 60, "orders": 150, "links": 3}
SMALL_SHOPS = 19
DAYS = 365

KHMER_NAMES = ("សុខា", "ដារ៉ា", "ចាន់ថា", "វិចិត្រ", "សុភា", "រតនា", "បូរ៉ា", "ស្រីនាង")
LATIN_NAMES = ("Dara", "Sokha", "Vanna", "Pisey", "Rithy", "Sophea", "Chenda", "Mony", "Kosal")
PRODUCT_WORDS = ("អាវយឺត", "Silk Shirt", "Dress", "សំពត់", "Sneakers", "Handbag", "Cap", "Jeans")
SIZES = ("S", "M", "L", "XL")
DESCRIPTION = (
    "អាវយឺតកប្បាសសុទ្ធ ពាក់ស្រួល ទន់ល្អ។ Soft 100% cotton, true to size. "
    "Wash cold, dry in the shade. Delivery in Phnom Penh the next day, "
    "provinces in 2-3 days by courier."
)
PLACES = ("facebook", "tiktok", "instagram", "telegram", "messenger")


def database_url(name: str) -> str:
    """The .env's local database, renamed; refuses anything else."""
    from sqlalchemy.engine import make_url

    from app.core.config import get_settings

    url = make_url(get_settings().database_url)
    if url.host not in LOCAL_HOSTS or not name.endswith("_perf"):
        sys.exit(f"Refusing: only a database on this machine named *_perf (got {url.host}/{name}).")
    return url.set(database=name).render_as_string(hide_password=False)


async def create_database(url: str) -> None:
    import asyncpg
    from sqlalchemy.engine import make_url

    parts = make_url(url)
    connection = await asyncpg.connect(
        host=parts.host,
        port=parts.port or 5432,
        user=parts.username,
        password=parts.password,
        database="postgres",
    )
    try:
        exists = await connection.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", parts.database
        )
        if not exists:
            await connection.execute(f'CREATE DATABASE "{parts.database}"')
    finally:
        await connection.close()


class Builder:
    """Rows for one shop, as plain dicts for bulk inserts."""

    def __init__(self, rng: random.Random, image_base: str, password_hash: str) -> None:
        self.rng = rng
        self.image_base = image_base
        self.password_hash = password_hash
        self.now = datetime.now(UTC)
        self.rows: dict[str, list[dict]] = {}

    def add(self, table: str, **row: object) -> dict:
        self.rows.setdefault(table, []).append(row)
        return row

    def photo(self, store_id: uuid.UUID, product_id: uuid.UUID) -> str:
        # The app's naming: <hex>-m.jpg is the photo, <hex>-s.jpg its small copy.
        folder = f"{self.image_base}/stores/{store_id}/products/{product_id}"
        return f"{folder}/{secrets.token_hex(16)}-m.jpg"

    def name(self) -> str:
        names = KHMER_NAMES if self.rng.random() < 0.4 else LATIN_NAMES
        return f"{self.rng.choice(names)} {self.rng.choice(LATIN_NAMES)}"

    def shop(self, slug: str, size: dict[str, int], phones: set[str]) -> None:
        rng, now = self.rng, self.now
        seller_id, store_id = uuid.uuid4(), uuid.uuid4()
        self.add(
            "seller",
            id=seller_id,
            email=f"{slug}@example.com",
            password_hash=self.password_hash,
            full_name=f"Owner of {slug}",
            created_at=now - timedelta(days=DAYS + 5),
        )
        self.add(
            "store",
            id=store_id,
            seller_id=seller_id,
            name=f"Perf {slug}",
            slug=slug,
            description="ហាងលក់សម្លៀកបំពាក់ Clothes, shoes and bags. " * 3,
            logo_url=f"{self.image_base}/stores/{store_id}/logo/{secrets.token_hex(16)}.jpg",
            currency="USD",
            telegram_chat_id="123456789",
            telegram_username="perfshop",
            contact_phone="012345678",
            payment_config={
                "cod": {"enabled": True},
                "bank_transfer": {
                    "enabled": True,
                    "bank_name": "ABA",
                    "account_name": "PERF SHOP",
                    "account_number": "000 111 222",
                },
                "khqr": {
                    "enabled": True,
                    "bakong_account_id": "perfshop@aclb",
                    "merchant_name": "PERF SHOP",
                },
            },
            delivery_config={
                "fee": "1.50",
                "free_from_amount": "40.00",
                "own_delivery": {"enabled": True},
                "couriers": ["J&T Express", "VET Express"],
                "pickup": {"enabled": True, "address": "#12, St 271, Phnom Penh"},
            },
            discount_config={"rules": [{"min_subtotal": "50.00", "amount_off": "5.00"}]},
            order_confirmation_mode="manual",
            created_at=now - timedelta(days=DAYS + 5),
        )

        categories = []
        for c in range(size["categories"]):
            categories.append(
                self.add(
                    "category",
                    id=uuid.uuid4(),
                    store_id=store_id,
                    name=f"Category {c + 1}",
                    slug=f"category-{c + 1}",
                    created_at=now - timedelta(days=DAYS),
                )
            )

        # (product, variant or None, price) a line can buy
        sellable: list[tuple[dict, dict | None, Decimal]] = []
        for p in range(size["products"]):
            product_id = uuid.uuid4()
            has_variants = p % 3 == 0
            price = Decimal(rng.randrange(300, 4500)) / 100
            created = now - timedelta(days=rng.uniform(0, DAYS))
            product = self.add(
                "product",
                id=product_id,
                store_id=store_id,
                category_id=rng.choice(categories)["id"] if rng.random() < 0.9 else None,
                name=f"{rng.choice(PRODUCT_WORDS)} {p + 1}",
                slug=f"product-{p + 1}",
                description=DESCRIPTION,
                price=price,
                image_urls=[
                    self.photo(store_id, product_id) for _ in range(rng.choice((1, 1, 2, 3, 4)))
                ],
                status="active" if rng.random() < 0.92 else "inactive",
                has_variants=has_variants,
                stock_quantity=None if has_variants else rng.choice((0, 3, 12, 40, 200)),
                created_at=created,
                updated_at=created,
            )
            if has_variants:
                for size_name in SIZES[: rng.choice((2, 3, 4))]:
                    variant = self.add(
                        "product_variant",
                        id=uuid.uuid4(),
                        store_id=store_id,
                        product_id=product_id,
                        name=size_name,
                        sku=None,
                        price_override=None if rng.random() < 0.7 else price + 2,
                        stock_quantity=rng.choice((0, 4, 20, 100)),
                        created_at=created,
                    )
                    variant_price = variant["price_override"] or price
                    sellable.append((product, variant, variant_price))
            else:
                sellable.append((product, None, price))

        customers = []
        for _ in range(size["customers"]):
            phone = f"0{rng.choice((10, 11, 12, 15, 16, 17, 69, 70, 77, 78, 85, 89, 92, 96, 97))}"
            phone += f"{rng.randrange(1_000_000, 9_999_999)}"
            while phone in phones:
                phone = phone[:-1] + str(rng.randrange(10))
            phones.add(phone)
            customers.append(
                self.add(
                    "customer",
                    id=uuid.uuid4(),
                    store_id=store_id,
                    name=self.name(),
                    phone=phone,
                    address=f"#{rng.randrange(1, 300)}, St {rng.randrange(1, 600)}, Phnom Penh",
                    created_at=now - timedelta(days=DAYS),
                )
            )

        links = []
        for _ in range(size["links"]):
            kind = rng.choice(("store", "product", "category"))
            target = None
            if kind == "product":
                target = rng.choice(sellable)[0]["id"]
            elif kind == "category":
                target = rng.choice(categories)["id"]
            links.append(
                self.add(
                    "shareable_link",
                    id=uuid.uuid4(),
                    store_id=store_id,
                    target_type=kind,
                    target_id=target,
                    token=secrets.token_hex(4),
                    source=rng.choice(PLACES),
                    campaign=None,
                    created_at=now - timedelta(days=rng.uniform(30, DAYS)),
                )
            )

        # Orders: more of them lately, numbered in the order they came.
        times = sorted(
            now - timedelta(days=DAYS * rng.random() ** 1.6) for _ in range(size["orders"])
        )
        for number, created in enumerate(times, start=1001):
            self.order(store_id, number, created, rng.choice(customers), sellable, links)
        for _ in range(size["orders"] * 4):
            link = rng.choice(links)
            self.add(
                "link_event",
                id=uuid.uuid4(),
                store_id=store_id,
                link_id=link["id"],
                event_type="view",
                order_id=None,
                created_at=now - timedelta(days=DAYS * rng.random()),
            )

    def order(
        self,
        store_id: uuid.UUID,
        number: int,
        created: datetime,
        customer: dict,
        sellable: list[tuple[dict, dict | None, Decimal]],
        links: list[dict],
    ) -> None:
        rng = self.rng
        age = self.now - created
        order_id = uuid.uuid4()
        lines = {}
        for _ in range(rng.choice((1, 1, 1, 2, 2, 3, 4))):
            product, variant, price = rng.choice(sellable)
            lines[(product["id"], variant and variant["id"])] = (product, variant, price)
        items, subtotal = [], Decimal("0.00")
        for product, variant, price in lines.values():
            quantity = rng.choice((1, 1, 1, 2, 3))
            total = price * quantity
            subtotal += total
            items.append((product, variant, price, quantity, total))
        pickup = rng.random() < 0.15
        discount = Decimal("5.00") if subtotal >= 50 else Decimal("0.00")
        fee = Decimal("0.00") if pickup or subtotal >= 40 else Decimal("1.50")
        grand = subtotal - discount + fee

        if age < timedelta(hours=6):
            status = rng.choice(("pending", "pending", "accepted"))
        elif age < timedelta(days=2):
            status = rng.choice(("pending", "accepted", "processing", "ready", "shipped"))
        else:
            status = rng.choices(
                ("completed", "cancelled", "rejected", "delivered"), (88, 5, 4, 3)
            )[0]
        done = status in ("completed", "delivered")
        method = rng.choices(("cod", "khqr", "bank_transfer"), (55, 30, 15))[0]
        paid = done or (status in ("ready", "shipped") and method != "cod")
        link = rng.choice(links) if rng.random() < 0.2 else None

        self.add(
            "order",
            id=order_id,
            store_id=store_id,
            number=number,
            customer_id=customer["id"],
            status=status,
            currency="USD",
            subtotal=subtotal,
            discount=discount,
            delivery_fee=fee,
            total=grand,
            delivery_method="pickup" if pickup else "seller_delivery",
            delivery_address=None if pickup else customer["address"],
            delivery_lat=None,
            delivery_lng=None,
            delivery_address_note=None,
            notes="Please call before delivery" if rng.random() < 0.2 else None,
            source=link["source"] if link else None,
            created_at=created,
            updated_at=created + timedelta(hours=rng.uniform(0, 30)),
        )
        for product, variant, price, quantity, total in items:
            self.add(
                "order_item",
                id=uuid.uuid4(),
                store_id=store_id,
                order_id=order_id,
                product_id=product["id"],
                variant_id=variant and variant["id"],
                product_name_snapshot=product["name"],
                variant_name_snapshot=variant and variant["name"],
                unit_price_snapshot=price,
                quantity=quantity,
                line_total=total,
            )
        self.add(
            "payment",
            id=uuid.uuid4(),
            store_id=store_id,
            order_id=order_id,
            method=method,
            status="paid" if paid else "pending",
            amount=grand,
            reference=None,
            paid_at=created + timedelta(hours=2) if paid else None,
            created_at=created,
        )
        if pickup:
            delivery_status = "delivered" if done else "not_assigned"
        elif done:
            delivery_status = "delivered"
        elif status == "shipped":
            delivery_status = "in_transit"
        else:
            delivery_status = "not_assigned"
        self.add(
            "delivery",
            id=uuid.uuid4(),
            store_id=store_id,
            order_id=order_id,
            method="pickup" if pickup else "seller_delivery",
            status=delivery_status,
            courier=None if pickup or rng.random() < 0.7 else "J&T Express",
            assignee_note=None,
            created_at=created,
            updated_at=created,
        )
        payload = {
            "order": {
                "id": str(order_id),
                "number": number,
                "customer_name": customer["name"],
                "item_count": sum(item[3] for item in items),
                "total": str(grand),
                "currency": "USD",
                "accepted_automatically": False,
            }
        }
        read_at = None if age < timedelta(hours=12) else created + timedelta(minutes=30)
        for channel in ("web", "telegram"):
            self.add(
                "notification_log",
                id=uuid.uuid4(),
                store_id=store_id,
                channel=channel,
                event_type="new_order",
                payload=payload,
                status="sent",
                sent_at=created,
                read_at=read_at if channel == "web" else None,
            )
        if rng.random() < 0.06:
            product = items[0][0]
            self.add(
                "notification_log",
                id=uuid.uuid4(),
                store_id=store_id,
                channel="web",
                event_type="low_stock",
                payload={
                    "items": [
                        {"product_id": str(product["id"]), "name": product["name"], "left": 3}
                    ]
                },
                status="sent",
                sent_at=created,
                read_at=read_at,
            )
        if method != "cod" and rng.random() < 0.3:
            self.add(
                "notification_log",
                id=uuid.uuid4(),
                store_id=store_id,
                channel="web",
                event_type="payment_claimed",
                payload=payload,
                status="sent",
                sent_at=created + timedelta(minutes=10),
                read_at=read_at,
            )
        if link is not None:
            self.add(
                "link_event",
                id=uuid.uuid4(),
                store_id=store_id,
                link_id=link["id"],
                event_type="order",
                order_id=order_id,
                created_at=created,
            )


# Parents before children.
TABLES = (
    "seller",
    "store",
    "category",
    "product",
    "product_variant",
    "customer",
    "shareable_link",
    "order",
    "order_item",
    "payment",
    "delivery",
    "notification_log",
    "link_event",
)


async def seed(image_base: str) -> dict[str, int]:
    from sqlalchemy import insert, text

    import app.models  # noqa: F401  (registers every table on Base.metadata)
    from app.core.security import hash_password
    from app.db.base import Base
    from app.db.session import engine

    # The last guard before TRUNCATE: the engine really is the perf database.
    if engine.url.host not in LOCAL_HOSTS or not str(engine.url.database).endswith("_perf"):
        sys.exit(f"Refusing to empty {engine.url.host}/{engine.url.database}.")

    rng = random.Random(1001)
    builder = Builder(rng, image_base, await hash_password(PASSWORD))
    phones: set[str] = set()
    builder.shop("perf-big", BIG, phones)
    for number in range(1, SMALL_SHOPS + 1):
        builder.shop(f"perf-shop-{number:02d}", SMALL, phones)

    async with engine.begin() as connection:
        names = ", ".join(f'"{table}"' for table in Base.metadata.tables)
        await connection.execute(text(f"TRUNCATE {names} CASCADE"))
        for table in TABLES:
            rows = builder.rows.get(table, [])
            for start in range(0, len(rows), 2000):
                await connection.execute(
                    insert(Base.metadata.tables[table]), rows[start : start + 2000]
                )
    async with engine.connect() as connection:
        await connection.execution_options(isolation_level="AUTOCOMMIT")
        await connection.execute(text("ANALYZE"))
    await engine.dispose()
    return {table: len(builder.rows.get(table, [])) for table in TABLES}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--database", default=DEFAULT_DATABASE, help="a local database, *_perf")
    parser.add_argument("--image-base", default=DEFAULT_IMAGE_BASE, help="where photos point")
    args = parser.parse_args()

    url = database_url(args.database)
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
    )
    counts = asyncio.run(seed(args.image_base))
    for table, count in counts.items():
        print(f"{table:>18} {count:>7,}")
    print(f"Log in as perf-big@example.com / {PASSWORD} (dashboard), shop /shop/perf-big")


if __name__ == "__main__":
    main()
