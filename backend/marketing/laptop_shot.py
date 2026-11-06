"""The start page's laptop screen: the seller's Orders page on a 1440 x 900
laptop, from a shop on this machine.

    cd backend && .venv/bin/python marketing/laptop_shot.py --login LOGIN --password PASSWORD

Logs in to the app running here (uvicorn on :8000 and `npm run dev` on
:5173 by default; never the live site) as the shop's owner, opens Orders in
Khmer and in English (--lang for one), and saves
marketing/out/<lang>/laptop_orders.png (git-ignored; --out for another
folder, e.g. out/clothing). home_images.py turns them into the start page's
laptop.webp. Use a shop with real-looking orders, such as a local copy of
the demo shop Oak Wear (shots.py --copy). Needs the marketing venv's
Playwright (marketing/requirements.txt); --browser points at another Chromium.
"""

import argparse
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
SIZE = {"width": 1440, "height": 900}
LANGS = ("km", "en")


def local(url: str) -> bool:
    return urlparse(url).hostname in ("localhost", "127.0.0.1")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--login", required=True, help="the shop owner's phone or email")
    parser.add_argument("--password", required=True)
    parser.add_argument("--web", default="http://localhost:5173")
    parser.add_argument("--api", default="http://localhost:8000")
    parser.add_argument("--browser", help="a Chromium to use instead of Playwright's")
    parser.add_argument("--lang", nargs="+", choices=LANGS, default=list(LANGS))
    parser.add_argument("--out", type=Path, default=OUT, help="where <lang>/ goes")
    args = parser.parse_args()
    if not (local(args.web) and local(args.api)):
        print("Only the app on this machine: --web and --api must be localhost.")
        return 1
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.browser)
        for lang in args.lang:
            context = browser.new_context(
                viewport=SIZE,
                device_scale_factor=2,  # 2880 x 1800: sharp on Retina laptops
                locale="km-KH" if lang == "km" else "en-US",
                timezone_id="Asia/Phnom_Penh",
                color_scheme="light",
                reduced_motion="reduce",
            )
            response = context.request.post(
                f"{args.api}/api/v1/auth/login",
                data={"login": args.login, "password": args.password},
            )
            if not response.ok:
                print(f"login: HTTP {response.status} {response.text()}")
                return 1
            context.add_init_script(
                "try { localStorage.setItem('sc.session', '1');"
                f" localStorage.setItem('sc.lang', '{lang}');"
                " localStorage.setItem('sc.theme', 'light') } catch {}"
            )
            page = context.new_page()
            page.goto(f"{args.web}/dashboard/orders")
            page.wait_for_load_state("networkidle")
            page.evaluate("document.fonts.ready")
            page.wait_for_timeout(1500)
            out = args.out.resolve() / lang / "laptop_orders.png"
            out.parent.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=out)
            print(out)
            context.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
