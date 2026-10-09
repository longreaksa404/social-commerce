"""Time every API endpoint against the perf database and count, per
request, its SQL statements and its round trips to Postgres
(docs/PERF_AUDIT.md). Development only.

    cd backend && .venv/bin/python loadtest/seed_perf.py      # first (and before each run)
    .venv/bin/python loadtest/measure.py                       # in-process: counts and times
    .venv/bin/python loadtest/measure.py --rtt-ms 2            # with 2 ms to the database
    .venv/bin/python loadtest/measure.py --host http://localhost:8001   # a running API: times only

In-process runs call the app directly (no network) through a small proxy
in front of Postgres that counts round trips (each Sync or simple Query
the driver sends waits for an answer) and can add a delay to each, like
the trip from Render to Neon. Statements are counted from SQLAlchemy;
"RLS" is the two that scope each tenant transaction. Background tasks
(the Telegram alert, link views) run inside the request here, so they
are counted too; Telegram is off.

Write endpoints use up rows of the seeded shop (pending orders to
accept, ...), so seed again before measuring again.
"""

import argparse
import asyncio
import gzip
import json
import os
import re
import statistics
import struct
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
# The in-process client (httpx2's ASGITransport) tries to import trio and
# sniffio on every request to see which async library runs it. Neither is
# installed, and each failed import searches every folder on the path,
# which on this repo's Windows-drive mount took ~5 ms a request: not the
# app's time. Marking them missing makes the import fail at once.
sys.modules.setdefault("trio", None)
sys.modules.setdefault("sniffio", None)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from seed_perf import DEFAULT_DATABASE, PASSWORD, database_url  # noqa: E402

BIG = "perf-big"
RESULTS = Path(__file__).with_name("results")


# Round trips to Postgres


class Counter:
    """Round trips and SQL statements since the last reset."""

    def __init__(self) -> None:
        self.round_trips = 0
        self.statements = 0
        self.rls = 0

    def reset(self) -> None:
        self.round_trips = self.statements = self.rls = 0


COUNTER = Counter()


class PgProxy:
    """Forwards a Postgres connection, counting what waits for an answer.

    After the startup message every client message is a type byte and a
    length. A Sync ('S') ends an extended-protocol batch (prepare, or
    bind + execute) and a Query ('Q') is a simple statement (BEGIN,
    COMMIT): each makes the client wait for the server once. The delay is
    added once per such batch, before it goes to the server.
    """

    def __init__(self, target_port: int, rtt: float) -> None:
        self.target_port = target_port
        self.rtt = rtt

    async def start(self) -> int:
        server = await asyncio.start_server(self._client, "127.0.0.1", 0)
        self.server = server
        return server.sockets[0].getsockname()[1]

    async def _client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        up_reader, up_writer = await asyncio.open_connection("127.0.0.1", self.target_port)
        down = asyncio.create_task(self._pipe(up_reader, writer))
        try:
            await self._from_client(reader, up_writer)
        finally:
            down.cancel()
            up_writer.close()
            writer.close()

    async def _pipe(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        while data := await reader.read(65536):
            writer.write(data)
            await writer.drain()

    async def _from_client(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        started = False
        buffer = b""
        while data := await reader.read(65536):
            buffer += data
            waits = 0
            while True:
                if not started:
                    if len(buffer) < 8:
                        break
                    (length,) = struct.unpack("!I", buffer[:4])
                    if len(buffer) < length:
                        break
                    (code,) = struct.unpack("!I", buffer[4:8])
                    started = code == 196608  # the startup message, not SSL/GSS requests
                    buffer = buffer[length:]
                    continue
                if len(buffer) < 5:
                    break
                kind = buffer[:1]
                (length,) = struct.unpack("!I", buffer[1:5])
                if len(buffer) < length + 1:
                    break
                if kind in (b"S", b"Q"):
                    waits += 1
                buffer = buffer[length + 1 :]
            if waits:
                COUNTER.round_trips += waits
                if self.rtt:
                    await asyncio.sleep(self.rtt * waits)
            writer.write(data)
            await writer.drain()


# The requests


@dataclass
class Fixtures:
    store_id: str
    order_id: str
    order_phone: str
    customer_id: str
    product_id: str
    product_slug: str
    category_slug: str
    link_id: str
    claim_order_id: str
    claim_phone: str
    checkout_product_id: str
    checkout_price: Decimal
    pending: list[str] = field(default_factory=list)  # to accept
    cash: list[str] = field(default_factory=list)  # COD, pending payment, not sent out
    to_assign: list[str] = field(default_factory=list)  # own delivery, not assigned
    paid_toggle: str = ""  # a KHQR order whose payment goes paid / pending / paid ...


async def load_fixtures(url: str) -> Fixtures:
    import asyncpg

    connection = await asyncpg.connect(url.replace("postgresql+asyncpg", "postgresql"))
    try:
        store_id = await connection.fetchval("SELECT id FROM store WHERE slug = $1", BIG)
        row = await connection.fetchrow(
            """SELECT o.id, c.phone FROM "order" o JOIN customer c ON c.id = o.customer_id
               WHERE o.store_id = $1
               AND (SELECT count(*) FROM order_item i WHERE i.order_id = o.id) >= 3
               ORDER BY o.number DESC LIMIT 1""",
            store_id,
        )
        customer_id = await connection.fetchval(
            """SELECT customer_id FROM "order" WHERE store_id = $1
               GROUP BY customer_id ORDER BY count(*) DESC LIMIT 1""",
            store_id,
        )
        product = await connection.fetchrow(
            """SELECT p.id, p.slug FROM product p WHERE p.store_id = $1 AND p.status = 'active'
               AND p.has_variants ORDER BY p.created_at DESC LIMIT 1""",
            store_id,
        )
        category_slug = await connection.fetchval(
            """SELECT c.slug FROM category c JOIN product p ON p.category_id = c.id
               WHERE c.store_id = $1 GROUP BY c.slug ORDER BY count(*) DESC LIMIT 1""",
            store_id,
        )
        link_id = await connection.fetchval(
            """SELECT link_id FROM link_event WHERE store_id = $1 AND event_type = 'order'
               GROUP BY link_id ORDER BY count(*) DESC LIMIT 1""",
            store_id,
        )
        claim = await connection.fetchrow(
            """SELECT o.id, c.phone FROM "order" o JOIN customer c ON c.id = o.customer_id
               JOIN payment p ON p.order_id = o.id
               WHERE o.store_id = $1 AND p.method = 'khqr' AND p.status = 'pending'
               AND o.status IN ('pending', 'accepted') ORDER BY o.number DESC LIMIT 1""",
            store_id,
        )
        cheap = await connection.fetchrow(
            """SELECT id, price FROM product WHERE store_id = $1 AND status = 'active'
               AND NOT has_variants AND stock_quantity >= 200 AND price < 30
               ORDER BY price LIMIT 1""",
            store_id,
        )
        pending = await connection.fetch(
            """SELECT id FROM "order" WHERE store_id = $1 AND status = 'pending'
               ORDER BY number""",
            store_id,
        )
        cash = await connection.fetch(
            """SELECT o.id FROM "order" o JOIN payment p ON p.order_id = o.id
               JOIN delivery d ON d.order_id = o.id
               WHERE o.store_id = $1 AND p.method = 'cod' AND p.status = 'pending'
               AND d.status = 'not_assigned' AND o.status <> 'pending' ORDER BY o.number""",
            store_id,
        )
        to_assign = await connection.fetch(
            """SELECT o.id FROM "order" o JOIN delivery d ON d.order_id = o.id
               WHERE o.store_id = $1 AND d.method = 'seller_delivery'
               AND d.status = 'not_assigned' AND o.status = 'pending' ORDER BY o.number""",
            store_id,
        )
        toggle = await connection.fetchval(
            """SELECT o.id FROM "order" o JOIN payment p ON p.order_id = o.id
               WHERE o.store_id = $1 AND p.method = 'khqr' AND p.status = 'pending'
               ORDER BY o.number LIMIT 1""",
            store_id,
        )
    finally:
        await connection.close()
    return Fixtures(
        store_id=str(store_id),
        order_id=str(row["id"]),
        order_phone=row["phone"],
        customer_id=str(customer_id),
        product_id=str(product["id"]),
        product_slug=product["slug"],
        category_slug=category_slug,
        link_id=str(link_id),
        claim_order_id=str(claim["id"]),
        claim_phone=claim["phone"],
        checkout_product_id=str(cheap["id"]),
        checkout_price=cheap["price"],
        pending=[str(r["id"]) for r in pending],
        cash=[str(r["id"]) for r in cash],
        to_assign=[str(r["id"]) for r in to_assign],
        paid_toggle=str(toggle),
    )


@dataclass
class Endpoint:
    name: str
    who: str  # seller, customer, auth
    method: str
    # The path and body for run number i
    request: Callable[[int], tuple[str, dict | None]]
    write: bool = False


def endpoints(f: Fixtures) -> list[Endpoint]:
    shop = f"/shop/{BIG}"
    today = date.today()

    def fixed(path: str, body: dict | None = None) -> Callable[[int], tuple[str, dict | None]]:
        return lambda i: (path, body)

    def cart(i: int) -> dict:
        # Pickup, cash on delivery, one cheap item: no fee or discount.
        return {
            "name": "Perf Customer",
            "phone": f"0889{i:05d}",
            "items": [{"product_id": f.checkout_product_id, "variant_id": None, "quantity": 1}],
            "payment_method": "cod",
            "delivery_method": "pickup",
            "courier": None,
            "expected_total": str(f.checkout_price),
        }

    return [
        # Seller, reads
        Endpoint("GET /seller/store", "seller", "GET", fixed("/seller/store")),
        Endpoint("GET /seller/account", "seller", "GET", fixed("/seller/account")),
        Endpoint(
            "GET /seller/orders (All, 50)",
            "seller",
            "GET",
            fixed("/seller/orders?limit=50&offset=0"),
        ),
        Endpoint(
            "GET /seller/orders (New)",
            "seller",
            "GET",
            fixed("/seller/orders?limit=50&offset=0&status=pending"),
        ),
        Endpoint(
            "GET /seller/orders (All, page 10)",
            "seller",
            "GET",
            fixed("/seller/orders?limit=50&offset=450"),
        ),
        Endpoint("GET /seller/orders/{id}", "seller", "GET", fixed(f"/seller/orders/{f.order_id}")),
        Endpoint("GET /seller/customers", "seller", "GET", fixed("/seller/customers?limit=50")),
        Endpoint(
            "GET /seller/customers?q=", "seller", "GET", fixed("/seller/customers?limit=50&q=dara")
        ),
        Endpoint(
            "GET /seller/customers?q=phone",
            "seller",
            "GET",
            fixed("/seller/customers?limit=50&q=012%20345"),
        ),
        Endpoint(
            "GET /seller/customers/{id}",
            "seller",
            "GET",
            fixed(f"/seller/customers/{f.customer_id}"),
        ),
        Endpoint("GET /seller/products", "seller", "GET", fixed("/seller/products")),
        Endpoint(
            "GET /seller/products/{id}", "seller", "GET", fixed(f"/seller/products/{f.product_id}")
        ),
        Endpoint("GET /seller/categories", "seller", "GET", fixed("/seller/categories")),
        Endpoint("GET /seller/links", "seller", "GET", fixed("/seller/links")),
        Endpoint(
            "GET /seller/links/{id}/stats",
            "seller",
            "GET",
            fixed(f"/seller/links/{f.link_id}/stats"),
        ),
        Endpoint("GET /seller/notifications", "seller", "GET", fixed("/seller/notifications")),
        Endpoint(
            "GET /seller/notifications/unread",
            "seller",
            "GET",
            fixed("/seller/notifications/unread"),
        ),
        Endpoint("GET /seller/staff", "seller", "GET", fixed("/seller/staff")),
        Endpoint(
            "GET /seller/stats?period=month", "seller", "GET", fixed("/seller/stats?period=month")
        ),
        Endpoint(
            "GET /seller/orders/export (month)",
            "seller",
            "GET",
            fixed(f"/seller/orders/export?first={today.replace(day=1)}&last={today}&lang=km"),
        ),
        Endpoint(
            "GET /seller/orders/export (year)",
            "seller",
            "GET",
            fixed(f"/seller/orders/export?first={today - timedelta(days=365)}&last={today}"),
        ),
        # Seller, writes
        Endpoint(
            "PATCH /seller/orders/{id}/status (accept)",
            "seller",
            "PATCH",
            lambda i: (f"/seller/orders/{f.pending[i]}/status", {"status": "accepted"}),
            write=True,
        ),
        Endpoint(
            "PATCH /seller/orders/{id}/payment",
            "seller",
            "PATCH",
            lambda i: (
                f"/seller/orders/{f.paid_toggle}/payment",
                {"status": "paid" if i % 2 == 0 else "pending", "reference": None},
            ),
            write=True,
        ),
        Endpoint(
            "PATCH /seller/orders/{id}/delivery (assign)",
            "seller",
            "PATCH",
            lambda i: (
                f"/seller/orders/{f.to_assign[i]}/delivery",
                {"status": "assigned", "assignee_note": None},
            ),
            write=True,
        ),
        Endpoint(
            "POST /seller/orders/{id}/cash-handover",
            "seller",
            "POST",
            lambda i: (f"/seller/orders/{f.cash[i]}/cash-handover", None),
            write=True,
        ),
        Endpoint(
            "POST /seller/orders (from chat)",
            "seller",
            "POST",
            lambda i: ("/seller/orders", cart(50_000 + i)),
            write=True,
        ),
        Endpoint(
            "POST /seller/notifications/read",
            "seller",
            "POST",
            fixed("/seller/notifications/read", {"up_to": "2100-01-01T00:00:00Z"}),
            write=True,
        ),
        Endpoint(
            "PATCH /seller/products/{id}",
            "seller",
            "PATCH",
            lambda i: (f"/seller/products/{f.product_id}", {"description": f"Edited {i}"}),
            write=True,
        ),
        Endpoint(
            "POST /seller/products",
            "seller",
            "POST",
            lambda i: (
                "/seller/products",
                {"name": f"Perf new {i}", "price": "9.50", "stock_quantity": 10},
            ),
            write=True,
        ),
        Endpoint(
            "PATCH /seller/store",
            "seller",
            "PATCH",
            lambda i: ("/seller/store", {"description": f"Perf shop, edit {i}"}),
            write=True,
        ),
        Endpoint(
            "POST /seller/links (existing)",
            "seller",
            "POST",
            fixed("/seller/links", {"target_type": "store", "target_id": None, "source": "tiktok"}),
            write=True,
        ),
        # Customers (public)
        Endpoint("GET /shop/{slug}", "customer", "GET", fixed(shop)),
        Endpoint("GET /shop/{slug}/products", "customer", "GET", fixed(f"{shop}/products")),
        Endpoint(
            "GET /shop/{slug}/products/{slug}",
            "customer",
            "GET",
            fixed(f"{shop}/products/{f.product_slug}"),
        ),
        Endpoint(
            "GET /shop/{slug}/categories/{slug}",
            "customer",
            "GET",
            fixed(f"{shop}/categories/{f.category_slug}"),
        ),
        Endpoint(
            "GET /shop/{slug}/orders/{id}?phone=",
            "customer",
            "GET",
            fixed(f"{shop}/orders/{f.order_id}?phone={f.order_phone}"),
        ),
        Endpoint(
            "POST /shop/{slug}/orders",
            "customer",
            "POST",
            lambda i: (f"{shop}/orders", cart(i)),
            write=True,
        ),
        Endpoint(
            "POST /shop/{slug}/track-view",
            "customer",
            "POST",
            fixed(f"{shop}/track-view", {"token": "zzzzzzzz"}),
            write=True,
        ),
        Endpoint(
            "POST /shop/{slug}/orders/{id}/paid",
            "customer",
            "POST",
            fixed(f"{shop}/orders/{f.claim_order_id}/paid", {"phone": f.claim_phone}),
            write=True,
        ),
        # Auth
        Endpoint(
            "POST /auth/login",
            "auth",
            "POST",
            fixed("/auth/login", {"login": f"{BIG}@example.com", "password": PASSWORD}),
            write=True,
        ),
        Endpoint("POST /auth/refresh", "auth", "POST", fixed("/auth/refresh"), write=True),
    ]


# Running them


@dataclass
class Result:
    endpoint: Endpoint
    times: list[float]
    statuses: set[int]
    bytes: int
    gzip_bytes: int
    statements: int
    rls: int
    round_trips: int

    def row(self) -> dict:
        times = sorted(self.times)
        p95 = times[max(0, round(0.95 * len(times)) - 1)]
        return {
            "endpoint": self.endpoint.name,
            "who": self.endpoint.who,
            "write": self.endpoint.write,
            "status": sorted(self.statuses),
            "p50_ms": round(statistics.median(times) * 1000, 1),
            "p95_ms": round(p95 * 1000, 1),
            "statements": self.statements,
            "rls_statements": self.rls,
            "round_trips": self.round_trips,
            "kb": round(self.bytes / 1024, 1),
            "kb_gzip": round(self.gzip_bytes / 1024, 1),
        }


async def run(args: argparse.Namespace) -> list[dict]:
    url = database_url(args.database)
    fixtures = await load_fixtures(url)
    needed = args.warmup + args.runs
    if min(len(fixtures.pending), len(fixtures.cash), len(fixtures.to_assign)) < needed:
        sys.exit("The perf shop has too few open orders left: run seed_perf.py again.")

    import httpx2 as httpx

    if args.host:
        client = httpx.AsyncClient(base_url=args.host.rstrip("/"), timeout=60)
    else:
        from sqlalchemy import event
        from sqlalchemy.engine import make_url

        port = make_url(url).port or 5432
        if not args.direct:
            port = await PgProxy(port, args.rtt_ms / 1000).start()
        os.environ["DATABASE_URL"] = (
            make_url(url).set(host="127.0.0.1", port=port, query={"ssl": "disable"})
        ).render_as_string(hide_password=False)
        os.environ.update(
            RATE_LIMIT_ENABLED="false", SENTRY_DSN="", TELEGRAM_BOT_TOKEN="", PUBLIC_API_URL=""
        )
        from app.core.config import get_settings

        get_settings.cache_clear()
        from app.db.session import engine
        from app.main import app

        @event.listens_for(engine.sync_engine, "before_cursor_execute")
        def _count(conn, cursor, statement, parameters, context, executemany) -> None:  # noqa: ANN001
            COUNTER.statements += 1
            if statement.startswith(("SET LOCAL ROLE", "SELECT set_config")):
                COUNTER.rls += 1

        client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://perf", timeout=60
        )

    async with client:
        login = await client.post(
            "/api/v1/auth/login", json={"login": f"{BIG}@example.com", "password": PASSWORD}
        )
        login.raise_for_status()
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        # The refresh cookie is Secure, which the client won't send over
        # http: it goes by hand, the newest one each time (it's single use).
        refresh = login.cookies["refresh_token"]

        results = []
        for endpoint in endpoints(fixtures):
            if args.only and not re.search(args.only, endpoint.name):
                continue
            # A fresh access token for each endpoint: a slow one (the
            # export at Render's CPU) can outlast its 15 minutes.
            fresh = await client.post(
                "/api/v1/auth/refresh", headers={"Cookie": f"refresh_token={refresh}"}
            )
            fresh.raise_for_status()
            headers = {"Authorization": f"Bearer {fresh.json()['access_token']}"}
            refresh = fresh.cookies["refresh_token"]
            times, statuses = [], set()
            body_size = gzip_size = 0
            counts = (0, 0, 0)
            for i in range(needed):
                path, body = endpoint.request(i)
                COUNTER.reset()
                started = time.perf_counter()
                cookie = {"Cookie": f"refresh_token={refresh}"} if "refresh" in path else {}
                response = await client.request(
                    endpoint.method, f"/api/v1{path}", json=body, headers=headers | cookie
                )
                elapsed = time.perf_counter() - started
                if "refresh" in path and "refresh_token" in response.cookies:
                    refresh = response.cookies["refresh_token"]
                statuses.add(response.status_code)
                if i >= args.warmup:
                    times.append(elapsed)
                    counts = (COUNTER.statements, COUNTER.rls, COUNTER.round_trips)
                    body_size = len(response.content)
                    gzip_size = len(gzip.compress(response.content, 6))
                if response.status_code >= 400 and i == 0:
                    print(f"  {endpoint.name}: {response.status_code} {response.text[:200]}")
            result = Result(endpoint, times, statuses, body_size, gzip_size, *counts)
            results.append(result.row())
            print(_line(results[-1]))
    return results


def _line(row: dict) -> str:
    return (
        f"{row['endpoint'][:44]:<44} p50 {row['p50_ms']:>7.1f}  p95 {row['p95_ms']:>7.1f} ms"
        f"  sql {row['statements']:>3} (rls {row['rls_statements']})  trips {row['round_trips']:>3}"
        f"  {row['kb']:>7.1f} KB ({row['kb_gzip']:.1f} gz)  {row['status']}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--database", default=DEFAULT_DATABASE)
    parser.add_argument("--host", help="time a running API instead (no counts)")
    parser.add_argument("--rtt-ms", type=float, default=0, help="delay per database round trip")
    parser.add_argument("--direct", action="store_true", help="no proxy: no round-trip counts")
    parser.add_argument("--runs", type=int, default=30)
    parser.add_argument("--warmup", type=int, default=5)
    parser.add_argument("--only", help="only endpoints whose name matches this regex")
    parser.add_argument("--label", default="", help="saved as results/measure-<label>.json")
    args = parser.parse_args()
    rows = asyncio.run(run(args))
    if args.label:
        RESULTS.mkdir(exist_ok=True)
        out = RESULTS / f"measure-{args.label}.json"
        out.write_text(json.dumps({"args": vars(args), "results": rows}, indent=1))
        print(f"Saved {out}")


if __name__ == "__main__":
    main()
