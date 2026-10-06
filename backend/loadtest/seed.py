"""Make a test shop for the load test, through the normal API.

    python seed.py --host http://localhost:8001

Registers a seller, adds categories, products (every third with sizes)
and a shop link to share, the way a seller would in the dashboard. Saves
the login and the shop's slug in .shop.json (git-ignored) for
locustfile.py and race.py. Re-running makes another shop.
"""

import argparse
import json
import secrets
import sys
from pathlib import Path

import requests

SHOP_FILE = Path(__file__).with_name(".shop.json")

CATEGORIES = ("Clothes", "Shoes", "Bags")
PRODUCTS = 30
SIZES = ("S", "M", "L")
# Plenty: running out isn't what the load test measures (race.py does that).
STOCK = 100_000
DESCRIPTION = (
    "អាវយឺតកប្បាសសុទ្ធ ពាក់ស្រួល ទន់ល្អ។ Soft 100% cotton, true to size. "
    "Wash cold, dry in the shade. Delivery in Phnom Penh the next day, "
    "provinces in 2-3 days by courier."
)


def load_shop() -> dict:
    """The shop seed.py made last."""
    if not SHOP_FILE.exists():
        sys.exit("No test shop yet: run seed.py first (README.md).")
    return json.loads(SHOP_FILE.read_text())


class Api:
    """The JSON API under /api/v1, stopping at the first error."""

    def __init__(self, host: str) -> None:
        self.host = host.rstrip("/")
        self.session = requests.Session()

    def __call__(self, method: str, path: str, **kwargs) -> dict | list | None:
        response = self.session.request(method, f"{self.host}/api/v1{path}", timeout=90, **kwargs)
        if response.status_code >= 400:
            sys.exit(f"{method} {path}: {response.status_code} {response.text}")
        return response.json() if response.content else None

    def login(self, email: str, password: str) -> None:
        tokens = self("POST", "/auth/login", json={"email": email, "password": password})
        self.session.headers["Authorization"] = f"Bearer {tokens['access_token']}"


def product_body(number: int, category_id: str) -> dict:
    body = {
        "name": f"អាវ T-shirt {number}",
        "description": DESCRIPTION,
        "category_id": category_id,
        "price": f"{5 + number % 20}.50",
    }
    if number % 3 == 0:
        body["has_variants"] = True
        body["variants"] = [{"name": size, "stock_quantity": STOCK} for size in SIZES]
    else:
        body["stock_quantity"] = STOCK
    return body


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--host", required=True, help="the API, e.g. http://localhost:8001")
    host = parser.parse_args().host

    api = Api(host)
    email = f"loadtest-{secrets.token_hex(4)}@example.com"
    password = secrets.token_urlsafe(16)
    api(
        "POST",
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Load Test",
            "phone": "012345678",
            "store_name": "Load Test Shop",
        },
    )
    api.login(email, password)

    categories = [api("POST", "/seller/categories", json={"name": n}) for n in CATEGORIES]
    for number in range(1, PRODUCTS + 1):
        category = categories[number % len(categories)]
        api("POST", "/seller/products", json=product_body(number, category["id"]))
    slug = api("GET", "/seller/store")["slug"]
    link = api("POST", "/seller/links", json={"target_type": "store", "source": "facebook"})

    shop = {
        "host": api.host,
        "slug": slug,
        "email": email,
        "password": password,
        "link": link["token"],
    }
    SHOP_FILE.write_text(json.dumps(shop, indent=2))
    print(f"Test shop {slug} with {PRODUCTS} products on {api.host}; saved in {SHOP_FILE.name}.")


if __name__ == "__main__":
    main()
