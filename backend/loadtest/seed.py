"""Fill a test shop for the load test, through the normal API.

    python seed.py --host http://localhost:8001 --email test-xxxx@example.com --password ...

The shop comes from `python -m app.admin test-shop` (signing up in the
app needs a phone number checked in Telegram). Logs in to it and adds
categories, products (every third with sizes) and a shop link to share,
the way a seller would in the dashboard. Saves the login and the shop's
slug in .shop.json (git-ignored) for locustfile.py and race.py.
"""

import argparse
import json
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
        tokens = self("POST", "/auth/login", json={"login": email, "password": password})
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
    parser.add_argument("--email", required=True, help="the shop's login from app.admin test-shop")
    parser.add_argument("--password", required=True, help="its password")
    args = parser.parse_args()
    email, password = args.email, args.password

    api = Api(args.host)
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
