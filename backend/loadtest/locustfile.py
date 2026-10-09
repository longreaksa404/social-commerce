"""Customers in a shop, for the load test (README.md).

Each simulated user is one person in the shop right now: they arrive from
the shop's Facebook link, look at a few products, and some of them order.
When they leave, the next person arrives. So the user count is "people in
shops at the same time", and it climbs step by step (STEPS) to find where
pages start getting slow. One seller has the dashboard open all along,
which asks for new orders every 30 s like the real one.
"""

import os
import random
import statistics
import time
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from locust import HttpUser, LoadTestShape, between, constant, events, task
from seed import load_shop

SHOP = load_shop()
SHOP_API = f"/api/v1/shop/{SHOP['slug']}"

# People in shops at the same time, one step per STEP_SECONDS.
STEPS = [int(n) for n in os.environ.get("STEPS", "10,20,40,60,80,100").split(",")]
STEP_SECONDS = int(os.environ.get("STEP_SECONDS", "60"))
# Share of visitors who place an order. 10% is generous for social
# commerce, so orders are tested harder than they'll be used.
BUY_RATE = float(os.environ.get("BUY_RATE", "0.1"))


class Customer(HttpUser):
    host = SHOP["host"]
    # Looking at a page before the next tap.
    wait_time = between(3, 10)

    @task
    def visit(self) -> None:
        # Opening the shared link: the page counts the view and asks for
        # the shop and its products.
        self.client.post(f"{SHOP_API}/track-view", json={"token": SHOP["link"]}, name="track-view")
        self.client.get(SHOP_API, name="shop")
        cards = self.client.get(f"{SHOP_API}/products", name="products")
        if not cards.ok:
            return

        product = None
        for card in random.sample(cards.json(), k=random.randint(1, 3)):
            self.wait()
            response = self.client.get(f"{SHOP_API}/products/{card['slug']}", name="product page")
            if response.ok:
                product = response.json()

        if product and random.random() < BUY_RATE:
            self.wait()  # cart
            self.wait()  # filling in the checkout form
            self.order(product)

    def order(self, product: dict) -> None:
        if product["has_variants"]:
            variant = random.choice(product["variants"])
            variant_id, price = variant["id"], Decimal(variant["price"])
        else:
            variant_id, price = None, Decimal(product["price"])
        quantity = random.randint(1, 2)
        phone = f"012{random.randint(0, 999_999):06d}"

        # The test shop takes cash on delivery and delivers for free, with
        # no discounts (seed.py), so the total is just the items.
        placed = self.client.post(
            f"{SHOP_API}/orders",
            name="place order",
            json={
                "name": "Load Test",
                "phone": phone,
                "items": [
                    {"product_id": product["id"], "variant_id": variant_id, "quantity": quantity}
                ],
                "payment_method": "cod",
                "delivery_method": "seller_delivery",
                "courier": None,
                "delivery_address": "Street 271, Toul Kork, Phnom Penh",
                "expected_total": str(price * quantity),
                "link": SHOP["link"],
            },
        )
        if placed.ok:
            # The order page loads it again.
            self.client.get(
                f"{SHOP_API}/orders/{placed.json()['id']}",
                params={"phone": phone},
                name="order page",
            )


class Seller(HttpUser):
    host = SHOP["host"]
    fixed_count = 1
    wait_time = constant(30)

    def on_start(self) -> None:
        self.log_in()

    def log_in(self) -> None:
        tokens = self.client.post(
            "/api/v1/auth/login",
            json={"login": SHOP["email"], "password": SHOP["password"]},
            name="seller login",
        ).json()
        self.client.headers["Authorization"] = f"Bearer {tokens['access_token']}"

    @task
    def dashboard(self) -> None:
        orders = self.client.get(
            "/api/v1/seller/orders", params={"limit": 50, "offset": 0}, name="seller orders"
        )
        if orders.status_code == 401:  # the 15-minute access token ran out
            self.log_in()
            return
        self.client.get("/api/v1/seller/notifications/unread", name="seller bell")


class Steps(LoadTestShape):
    """More people every STEP_SECONDS; each step holds long enough for its
    numbers to settle (report.py reads the second half of each)."""

    def tick(self) -> tuple[int, float] | None:
        step = int(self.get_run_time() // STEP_SECONDS)
        if step >= len(STEPS):
            return None
        return STEPS[step] + Seller.fixed_count, 10


# Every answer, to sum up each step at the end: (seconds into the run,
# milliseconds, failed).
answers: list[tuple[float, float, bool]] = []
started = time.monotonic()
# Pages count as fast enough while 95% of answers take less than this.
FAST_MS = 1000


@events.test_start.add_listener
def _start(**_kwargs) -> None:
    global started
    started = time.monotonic()


@events.request.add_listener
def _answer(response_time: float, exception: Exception | None, **_kwargs) -> None:
    answers.append((time.monotonic() - started, response_time, exception is not None))


@events.test_stop.add_listener
def _summary(**_kwargs) -> None:
    """One line per step, from its second half (people have arrived and
    settled in by then). Printed and saved in results/."""
    lines = [
        f"{SHOP['host']}, {STEP_SECONDS} s per step, {BUY_RATE:.0%} of visitors order",
        "people  requests/s  median ms  95% ms  slowest ms  failed",
    ]
    for step, people in enumerate(STEPS):
        begin, end = (step + 0.5) * STEP_SECONDS, (step + 1) * STEP_SECONDS
        rows = [(ms, failed) for t, ms, failed in answers if begin <= t < end]
        if len(rows) < 2:
            break
        times = sorted(ms for ms, _ in rows)
        p95 = statistics.quantiles(times, n=20)[-1]
        failed = sum(failed for _, failed in rows)
        verdict = "ok" if p95 < FAST_MS and not failed else "SLOW" if not failed else "ERRORS"
        lines.append(
            f"{people:>6}  {len(rows) / (end - begin):>10.1f}  {statistics.median(times):>9.0f}"
            f"  {p95:>6.0f}  {times[-1]:>10.0f}  {failed:>6}  {verdict}"
        )
    summary = "\n".join(lines)
    print("\n" + summary)
    results = Path(__file__).with_name("results")
    results.mkdir(exist_ok=True)
    (results / f"summary-{datetime.now():%Y%m%d-%H%M}.txt").write_text(summary + "\n")
