"""Many customers try to buy the last units at the same moment.

    python race.py

Adds a product with UNITS left to the test shop (seed.py) and sends
BUYERS orders for one unit each, all at once. Passes when exactly UNITS
orders go through, every other customer is told it's sold out, and the
shop shows none left. Needs rate limits off (README.md): one IP may place
only 10 orders a minute.
"""

import secrets
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import requests
from seed import Api, load_shop

UNITS = 5
BUYERS = 30
PRICE = "12.00"


def main() -> None:
    shop = load_shop()
    api = Api(shop["host"])
    api.login(shop["email"], shop["password"])
    product = api(
        "POST",
        "/seller/products",
        json={
            "name": f"Last {UNITS} units {secrets.token_hex(2)}",
            "price": PRICE,
            "stock_quantity": UNITS,
        },
    )
    shop_api = f"{api.host}/api/v1/shop/{shop['slug']}"
    start = threading.Barrier(BUYERS)

    def buy(buyer: int) -> tuple[int, str]:
        body = {
            "name": f"Buyer {buyer}",
            "phone": f"097{buyer:06d}",
            "items": [{"product_id": product["id"], "quantity": 1}],
            "payment_method": "cod",
            "delivery_method": "seller_delivery",
            "delivery_address": "Street 271, Phnom Penh",
            "expected_total": PRICE,
        }
        start.wait()  # everyone taps "Place order" together
        response = requests.post(f"{shop_api}/orders", json=body, timeout=120)
        if response.ok:
            return response.status_code, ""
        try:
            return response.status_code, response.json()["error"]["code"]
        except (ValueError, KeyError):
            return response.status_code, response.text[:80]

    began = time.monotonic()
    with ThreadPoolExecutor(BUYERS) as pool:
        results = list(pool.map(buy, range(BUYERS)))
    seconds = time.monotonic() - began

    placed = sum(1 for status, _ in results if status == 201)
    sold_out = sum(1 for status, code in results if code == "PRODUCT_OUT_OF_STOCK")
    others = [r for r in results if r[0] != 201 and r[1] != "PRODUCT_OUT_OF_STOCK"]
    left = requests.get(f"{shop_api}/products/{product['slug']}", timeout=60).json()
    # Keep the shop's product list as it was for the next load test.
    api("DELETE", f"/seller/products/{product['id']}")

    print(f"{BUYERS} customers, {UNITS} units, all at once ({seconds:.1f} s for every answer):")
    print(f"  orders placed:  {placed}")
    print(f"  told sold out:  {sold_out}")
    print(f"  anything else:  {len(others)} {others or ''}")
    print(f"  stock left:     {left['stock_quantity']}")
    ok = placed == UNITS and sold_out == BUYERS - UNITS and left["stock_quantity"] == 0
    print("PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
