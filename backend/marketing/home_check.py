"""Checks for the start page (/) in a real browser, logged out.

    cd frontend && npm run build && npx vite preview --port 4173 --strictPort
    cd backend && .venv/bin/python marketing/home_check.py [--url URL] [--only a,b] [--headed]

Each check prints PASS or FAIL with what was wrong; the run exits 1 if any
failed. Screenshots go to marketing/out/home/ (git-ignored). Needs the
marketing venv's Playwright and its Chromium (marketing/requirements.txt).
No API is needed: the page shows today's prices when it can't reach one.
"""

import argparse
import json
import sys
import traceback
from collections.abc import Callable
from pathlib import Path

from playwright.sync_api import Browser, Page, Playwright, Route, sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "out" / "home"
OPTS = {"url": "http://localhost:4173", "headed": False}

CHECKS: dict[str, Callable[[Browser], None]] = {}


def check(fn: Callable[[Browser], None]) -> Callable[[Browser], None]:
    CHECKS[fn.__name__.removeprefix("check_")] = fn
    return fn


def open_home(
    browser: Browser,
    lang: str = "km",
    width: int = 390,
    height: int = 844,
    reduced: bool = False,
    prices: dict | None = None,
    no_api: bool = False,
) -> Page:
    """A fresh context on / in `lang`, fonts loaded. `prices` answers
    GET /plan/prices with that body; `no_api` makes it fail."""
    context = browser.new_context(
        viewport={"width": width, "height": height},
        reduced_motion="reduce" if reduced else "no-preference",
    )
    context.add_init_script(f"try {{ localStorage.setItem('sc.lang', '{lang}') }} catch (e) {{}}")
    if prices is not None or no_api:
        context.route("**/plan/prices", lambda route: answer(route, prices))
    page = context.new_page()
    page.errors = []  # type: ignore[attr-defined]
    page.on("pageerror", lambda error: page.errors.append(str(error)))  # type: ignore[attr-defined]
    page.goto(OPTS["url"] + "/")
    page.wait_for_selector("main[data-home]")
    page.evaluate("document.fonts.ready")
    settle(page)
    return page


def settle(page: Page) -> None:
    """Wait for the app's page fade-in (RootLayout) to finish."""
    page.wait_for_function(
        "() => [...document.querySelectorAll('.animate-fade-in')]"
        ".every((e) => getComputedStyle(e).opacity === '1')"
    )


def answer(route: Route, body: dict | None) -> None:
    if body is None:
        route.abort()
        return
    origin = route.request.headers.get("origin", OPTS["url"])
    cors = {
        "access-control-allow-origin": origin,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "*",
    }
    if route.request.method == "OPTIONS":
        route.fulfill(status=204, headers=cors)
    else:
        route.fulfill(
            status=200, headers=cors, content_type="application/json", body=json.dumps(body)
        )


def shot(page: Page, name: str, full: bool = True) -> None:
    """A screenshot; a full page is scrolled through first, so the phones'
    lazy screens have loaded."""
    OUT.mkdir(parents=True, exist_ok=True)
    if full:
        y = page.evaluate("scrollY")
        height = page.evaluate("document.documentElement.scrollHeight")
        for top in range(0, height, 600):
            page.evaluate(f"scrollTo(0, {top})")
            page.wait_for_timeout(60)
        page.evaluate(f"scrollTo(0, {y})")
        page.wait_for_load_state("networkidle")
    page.screenshot(path=OUT / f"{name}.png", full_page=full)


def text(page: Page) -> str:
    return page.locator("main[data-home]").inner_text()


# Task 3: the page.


@check
def check_widths(browser: Browser) -> None:
    for lang in ("km", "en"):
        for width in (360, 390, 414, 1440):
            page = open_home(browser, lang, width, 900 if width > 1000 else 844)
            where = f"{lang} {width}px"
            scroll = page.evaluate("document.documentElement.scrollWidth")
            assert scroll <= width, f"{where}: page is {scroll}px wide"
            wide = page.evaluate(
                """(w) => [...document.querySelectorAll('main a, main button, main summary')]
                .filter((e) => e.getBoundingClientRect().right > w + 0.5)
                .map((e) => e.textContent.trim().slice(0, 30))""",
                width,
            )
            assert not wide, f"{where}: past the right edge: {wide}"
            short = page.evaluate(
                """() => [...document.querySelectorAll('[data-cta]')]
                .filter((e) => e.getBoundingClientRect().height < 48)
                .map((e) => e.textContent.trim().slice(0, 30))"""
            )
            assert not short, f"{where}: buttons under 48px: {short}"
            assert not page.errors, f"{where}: page errors {page.errors}"  # type: ignore[attr-defined]
            shot(page, f"widths-{lang}-{width}")
            page.context.close()


@check
def check_links(browser: Browser) -> None:
    page = open_home(browser)
    hrefs = page.evaluate(
        """() => [...document.querySelectorAll('[data-cta]')]
        .map((e) => [e.dataset.cta, e.getAttribute('href')])"""
    )
    kinds = {kind for kind, _ in hrefs}
    assert {"create", "demo", "login"} <= kinds, f"missing buttons, found {sorted(kinds)}"
    want = {"create": "/register", "demo": "/shop/zdpb5d", "login": "/login"}
    wrong = [(kind, href) for kind, href in hrefs if href != want[kind]]
    assert not wrong, f"wrong links: {wrong}"
    assert sum(kind == "create" for kind, _ in hrefs) >= 3, (
        "Create your shop should be at the top, price and bottom"
    )
    page.context.close()


@check
def check_prices(browser: Browser) -> None:
    body = {"month": "12.50", "year": "120.00", "trial_days": 14, "changed_on": None}
    page = open_home(browser, "en", prices=body)
    page.wait_for_function(
        "() => document.querySelector('main').innerText.includes('$12.50')", timeout=5000
    )
    seen = text(page)
    for want in ("$12.50", "$120", "Save $30", "14 days"):
        assert want in seen, f"set prices: {want!r} not on the page"
    page.context.close()
    page = open_home(browser, "en", no_api=True)
    page.wait_for_timeout(500)
    seen = text(page)
    for want in ("$9.99", "$99", "Save $20.88", "30 days"):
        assert want in seen, f"no API: {want!r} not on the page"
    page.context.close()


@check
def check_questions(browser: Browser) -> None:
    page = open_home(browser)
    details = page.locator("main details")
    assert details.count() == 5, f"{details.count()} questions, want 5"
    assert page.locator("main details[open]").count() == 0, "a question starts open"
    page.locator("main details summary").nth(2).click()
    assert page.locator("main details").nth(2).get_attribute("open") is not None, (
        "third question didn't open"
    )
    page.context.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--url", default=OPTS["url"])
    parser.add_argument("--only", help="comma-separated check names")
    parser.add_argument("--headed", action="store_true", help="show the browser")
    args = parser.parse_args()
    OPTS.update(url=args.url.rstrip("/"), headed=args.headed)
    names = args.only.split(",") if args.only else list(CHECKS)
    failed = 0
    with sync_playwright() as playwright:
        for name in names:
            browser = launch(playwright, name)
            try:
                CHECKS[name](browser)
                print(f"PASS {name}")
            except Exception as error:  # noqa: BLE001 - report every check
                failed += 1
                reason = (
                    str(error)
                    if isinstance(error, AssertionError)
                    else traceback.format_exc(limit=2)
                )
                print(f"FAIL {name}: {reason}")
            finally:
                browser.close()
    print(f"{len(names) - failed}/{len(names)} passed")
    return 1 if failed else 0


def launch(playwright: Playwright, name: str) -> Browser:
    return playwright.chromium.launch(headless=not OPTS["headed"])


if __name__ == "__main__":
    sys.exit(main())
