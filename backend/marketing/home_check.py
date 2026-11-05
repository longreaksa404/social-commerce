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


# Task 4: How it works, the pinned stage.

STEP_FILES = ("share", "checkout", "khqr", "orders")


def scroll_steps(page: Page, progress: float) -> None:
    """Scroll so How it works' pinned stage is `progress` (0-1) through."""
    page.evaluate(
        """(p) => {
          const section = document.querySelector('[data-steps]')
          const stage = section.querySelector('[data-step-stage]')
          const top = section.getBoundingClientRect().top + scrollY
          scrollTo(0, top + p * (section.offsetHeight - stage.offsetHeight))
        }""",
        progress,
    )
    page.wait_for_timeout(250)


def active_step(page: Page) -> int:
    return int(page.get_attribute("[data-step-stage]", "data-step-active") or -1)


def wait_screen(page: Page, ending: str) -> None:
    """Wait until the stage's phone shows `ending` (its screen has loaded)."""
    page.wait_for_function(
        "(e) => document.querySelector('[data-step-stage] [data-screen]')"
        "?.dataset.screen.endsWith(e)",
        arg=ending,
        timeout=5000,
    )


def walk_steps(browser: Browser, width: int, height: int, reduced: bool = False) -> None:
    page = open_home(browser, "km", width, height, reduced=reduced)
    for index, progress in enumerate((0.1, 0.35, 0.6, 0.85)):
        scroll_steps(page, progress)
        where = f"{width}px at {progress}"
        assert active_step(page) == index, f"{where}: step {active_step(page)}, want {index}"
        wait_screen(page, f"/home/km/{STEP_FILES[index]}.webp")
        shot(page, f"steps-{width}-{index}{'-reduced' if reduced else ''}", full=False)
    page.context.close()


@check
def check_steps(browser: Browser) -> None:
    walk_steps(browser, 390, 844)
    walk_steps(browser, 1440, 900)


@check
def check_toolbar_resize(browser: Browser) -> None:
    page = open_home(browser)
    scroll_steps(page, 0.375)
    assert active_step(page) == 1, f"before: step {active_step(page)}, want 1"
    page.set_viewport_size({"width": 390, "height": 700})
    page.wait_for_timeout(300)
    assert active_step(page) == 1, f"after the screen got shorter: step {active_step(page)}"
    scroll = page.evaluate("document.documentElement.scrollWidth")
    assert scroll <= 390, f"page is {scroll}px wide"
    page.context.close()


@check
def check_lang_switch(browser: Browser) -> None:
    page = open_home(browser)
    scroll_steps(page, 0.1)
    wait_screen(page, "/home/km/share.webp")
    page.locator("header button", has_text="EN").click()
    wait_screen(page, "/home/en/share.webp")
    page.context.close()


@check
def check_back_nav(browser: Browser) -> None:
    page = open_home(browser)
    scroll_steps(page, 0.6)
    assert active_step(page) == 2, f"before: step {active_step(page)}, want 2"
    # Log in, in the sticky top bar: on screen here, so clicking doesn't scroll.
    page.locator("[data-cta=login]").click()
    page.wait_for_url("**/login")
    page.go_back()
    page.wait_for_selector("main[data-home]")
    page.wait_for_timeout(400)
    assert active_step(page) == 2, f"after Back: step {active_step(page)}, want 2"
    page.context.close()


@check
def check_steps_reduced(browser: Browser) -> None:
    walk_steps(browser, 390, 844, reduced=True)


# Task 5: the opening sequence.

BLOCK_STORAGE = """Object.defineProperty(window, 'sessionStorage', {
  get() { throw new Error('storage blocked') },
})"""


def fresh(browser: Browser, reduced: bool = False, script: str = "") -> Page:
    """A new tab on / that hasn't seen the intro; returns as soon as the
    page's main is in the DOM (no waiting for the fade or the fonts)."""
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        reduced_motion="reduce" if reduced else "no-preference",
    )
    if script:
        context.add_init_script(script)
    page = context.new_page()
    page.errors = []  # type: ignore[attr-defined]
    page.on("pageerror", lambda error: page.errors.append(str(error)))  # type: ignore[attr-defined]
    page.goto(OPTS["url"] + "/", wait_until="commit")
    page.wait_for_selector("main[data-home]", state="attached")
    return page


def intro(page: Page) -> str:
    return page.get_attribute("main[data-home]", "data-intro") or ""


def never_playing(page: Page, where: str) -> None:
    for _ in range(20):
        assert intro(page) != "playing", f"{where}: the intro played"
        page.wait_for_timeout(50)


@check
def check_intro_once(browser: Browser) -> None:
    page = fresh(browser)
    assert intro(page) == "playing", f"first visit: data-intro={intro(page)!r}"
    page.wait_for_function(
        "() => document.querySelector('main').dataset.intro === 'done'", timeout=2500
    )
    page.reload(wait_until="commit")
    page.wait_for_selector("main[data-home]", state="attached")
    never_playing(page, "after a reload")
    page.context.close()


@check
def check_intro_tap(browser: Browser) -> None:
    page = fresh(browser)
    page.wait_for_timeout(150)
    assert intro(page) == "playing", "the intro wasn't playing at 150 ms"
    button = page.locator("[data-cta=create]").first
    box = button.bounding_box()
    assert box, "no Create your shop"
    x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    on_top = page.evaluate(
        "([x, y]) => !!document.elementFromPoint(x, y)?.closest('[data-cta=create]')", [x, y]
    )
    assert on_top, "something covers Create your shop during the intro"
    page.mouse.click(x, y)
    page.wait_for_url("**/register", timeout=3000)
    page.context.close()


@check
def check_intro_scroll(browser: Browser) -> None:
    page = fresh(browser)
    page.wait_for_selector("[data-cta=create]")
    page.wait_for_timeout(200)
    assert intro(page) == "playing", "the intro wasn't playing at 200 ms"
    page.mouse.move(195, 400)
    page.mouse.wheel(0, 400)
    page.wait_for_timeout(150)
    assert intro(page) == "done", f"a scroll didn't end the intro: {intro(page)!r}"
    page.context.close()


@check
def check_intro_reduced(browser: Browser) -> None:
    page = fresh(browser, reduced=True)
    never_playing(page, "reduce motion")
    names = page.evaluate(
        "() => [...document.querySelectorAll('.home-glow')]"
        ".map((e) => getComputedStyle(e).animationName)"
    )
    assert names and all(name == "none" for name in names), f"glows drift: {names}"
    page.context.close()


@check
def check_intro_storage_blocked(browser: Browser) -> None:
    page = fresh(browser, script=BLOCK_STORAGE)
    assert intro(page) == "playing", f"storage blocked: data-intro={intro(page)!r}"
    page.wait_for_timeout(1800)
    assert intro(page) == "done", "storage blocked: the intro didn't end"
    assert not page.errors, f"page errors: {page.errors}"  # type: ignore[attr-defined]
    page.context.close()


@check
def check_intro_back(browser: Browser) -> None:
    page = fresh(browser)
    page.wait_for_function(
        "() => document.querySelector('main').dataset.intro === 'done'", timeout=2500
    )
    page.locator("[data-cta=demo]").click()
    page.wait_for_url("**/shop/zdpb5d")
    page.go_back(wait_until="commit")
    page.wait_for_selector("main[data-home]", state="attached")
    never_playing(page, "after Back")
    page.context.close()


@check
def check_night_behind(browser: Browser) -> None:
    page = fresh(browser)
    night = "getComputedStyle(document.body).backgroundColor"
    first = page.evaluate(night)
    assert first == "rgb(11, 19, 32)", f"not navy before the app: {first!r}"
    bar = "document.querySelector('meta[name=theme-color]').content"
    assert page.evaluate(bar) == "#0b1320", f"browser bar: {page.evaluate(bar)}"
    page.locator("[data-cta=login]").click(force=True)
    page.wait_for_url("**/login")
    page.wait_for_selector("main[data-home]", state="detached")
    left = page.evaluate(night)
    assert left != "rgb(11, 19, 32)", f"still navy behind /login: {left!r}"
    assert page.evaluate(bar) == "#ffffff", f"browser bar on /login: {page.evaluate(bar)}"
    page.context.close()


# Task 6: the 3D phone.

FRONTEND = HERE.parents[1] / "frontend"
# The entry chunk before three.js came in (commit e3de878), in kB.
ENTRY_BEFORE_KB = 1112.33
GPU = ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"]
NO_WEBGL = ["--disable-webgl", "--disable-3d-apis"]
CANVAS = "canvas[data-phone3d]"
# The first screen's phone (How it works has its own).
HERO = ".home-intro-phone"
HERO_CANVAS = f"{HERO} {CANVAS}"


def still_visible(page: Page, scope: str = HERO) -> bool:
    return page.evaluate(
        "(s) => getComputedStyle(document.querySelector(s + ' [data-still]')).opacity === '1'",
        scope,
    )


@check
def check_chunk(browser: Browser) -> None:
    dist = FRONTEND / "dist"
    html = (dist / "index.html").read_text(encoding="utf-8")
    entry = next(dist.glob("assets/index-*.js"))
    assert entry.name in html, f"{entry.name} isn't the entry index.html loads"
    assert "WebGLRenderer" not in entry.read_text(encoding="utf-8"), (
        "three.js is in the entry chunk"
    )
    three = [
        f.name for f in dist.glob("assets/*.js") if "WebGLRenderer" in f.read_text(encoding="utf-8")
    ]
    assert three, "no chunk with three.js"
    grew = entry.stat().st_size / 1000 - ENTRY_BEFORE_KB
    assert grew < 15, f"the entry chunk grew {grew:.1f} kB"
    print(f"  three in {three}, entry +{grew:.1f} kB")


@check
def check_3d_loaded(browser: Browser) -> None:
    page = open_home(browser)
    page.wait_for_selector(HERO_CANVAS, timeout=8000)
    page.wait_for_function(
        f"() => getComputedStyle(document.querySelector('{HERO_CANVAS}')).opacity === '1'",
        timeout=4000,
    )
    assert not still_visible(page), "the still phone shows under the 3D one"
    shot(page, "3d-hero", full=False)
    page.context.close()


@check
def check_3d_steps(browser: Browser) -> None:
    page = open_home(browser)
    for index, progress in enumerate((0.1, 0.35, 0.6, 0.85)):
        scroll_steps(page, progress)
        stage = f"[data-step-stage] {CANVAS}"
        page.wait_for_selector(stage, timeout=8000)
        page.wait_for_function(
            "([s, i, e]) => { const c = document.querySelector(s);"
            " return c.dataset.shot === String(i) && c.dataset.screen.endsWith(e) }",
            arg=[stage, index, f"/home/km/{STEP_FILES[index]}.webp"],
            timeout=4000,
        )
        page.wait_for_timeout(1200)
        shot(page, f"3d-step-{index}", full=False)
    page.context.close()


@check
def check_3d_lang(browser: Browser) -> None:
    page = open_home(browser)
    page.wait_for_selector(HERO_CANVAS, timeout=8000)
    page.locator("header button", has_text="EN").click()
    page.wait_for_function(
        f"() => document.querySelector('{HERO_CANVAS}').dataset.screen.includes('/home/en/')",
        timeout=4000,
    )
    page.context.close()


@check
def check_3d_reduced(browser: Browser) -> None:
    context = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
    page = context.new_page()
    asked = []
    page.on("request", lambda request: asked.append(request.url))
    page.goto(OPTS["url"] + "/")
    page.wait_for_selector("main[data-home]")
    page.wait_for_timeout(2000)
    assert not [url for url in asked if "phoneScene" in url], "three.js was downloaded"
    assert page.locator(CANVAS).count() == 0, "a 3D canvas with reduce motion"
    assert still_visible(page), "the still phone is hidden"
    context.close()


@check
def check_3d_no_webgl(browser: Browser) -> None:
    page = open_home(browser)
    page.wait_for_timeout(2000)
    assert page.locator(CANVAS).count() == 0, "a 3D canvas without WebGL"
    assert still_visible(page), "the still phone is hidden"
    assert not page.errors, f"page errors: {page.errors}"  # type: ignore[attr-defined]
    page.context.close()


@check
def check_3d_slow(browser: Browser) -> None:
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    page.goto(OPTS["url"] + "/")
    page.wait_for_selector("main[data-home]")
    # A slow phone from here on: before the 3D phone (after the opening).
    context.new_cdp_session(page).send("Emulation.setCPUThrottlingRate", {"rate": 30})
    page.wait_for_selector(HERO_CANVAS, state="attached")
    page.wait_for_function(
        f"() => !document.querySelector('{HERO_CANVAS}')"
        f" && getComputedStyle(document.querySelector('{HERO} [data-still]')).opacity === '1'",
        timeout=30000,
        polling=500,
    )
    context.close()


@check
def check_3d_context_lost(browser: Browser) -> None:
    page = open_home(browser)
    page.wait_for_selector(HERO_CANVAS, timeout=8000)
    page.wait_for_function(
        f"() => getComputedStyle(document.querySelector('{HERO_CANVAS}')).opacity === '1'",
        timeout=4000,
    )
    page.evaluate(
        f"() => {{ const c = document.querySelector('{HERO_CANVAS}');"
        " const gl = c.getContext('webgl2') || c.getContext('webgl');"
        " gl.getExtension('WEBGL_lose_context').loseContext() }"
    )
    page.wait_for_function(f"() => !document.querySelector('{HERO_CANVAS}')", timeout=2000)
    # It fades back in (0.7 s).
    page.wait_for_function(
        f"() => getComputedStyle(document.querySelector('{HERO} [data-still]')).opacity === '1'",
        timeout=2000,
    )
    assert not page.errors, f"page errors: {page.errors}"  # type: ignore[attr-defined]
    page.context.close()


# Task 7: the last pass.


@check
def check_keyboard(browser: Browser) -> None:
    page = open_home(browser, "en")
    seen: list[dict] = []
    for _ in range(80):
        page.keyboard.press("Tab")
        here = page.evaluate(
            """() => {
              const e = document.activeElement
              if (!e || e === document.body) return null
              const s = getComputedStyle(e)
              return { tag: e.tagName, cta: e.dataset.cta || '',
                       text: e.textContent.trim().slice(0, 30),
                       outline: s.outlineStyle, href: e.getAttribute('href') || '' }
            }"""
        )
        if here is None or (seen and here == seen[0]):
            break
        seen.append(here)
    ctas = [item["cta"] for item in seen]
    assert "login" in ctas and "demo" in ctas, f"Log in or Try a demo shop not reached: {ctas}"
    assert ctas.count("create") >= 3, f"Create your shop reached {ctas.count('create')} times"
    assert sum(item["tag"] == "SUMMARY" for item in seen) == 5, "not every question reached"
    assert {"EN", "ខ្មែរ"} <= {item["text"] for item in seen}, "the language switch wasn't reached"
    legal = [item for item in seen if item["href"] in ("/privacy", "/terms", "/data-deletion")]
    assert len(legal) == 3, f"legal links reached: {len(legal)}"
    hidden = [item["text"] or item["href"] for item in seen if item["outline"] == "none"]
    assert not hidden, f"no focus ring on: {hidden}"
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
    """Chromium; the 3D checks get the GPU (or no WebGL at all)."""
    args = NO_WEBGL if name == "3d_no_webgl" else GPU if name.startswith("3d") else []
    return playwright.chromium.launch(headless=not OPTS["headed"], args=args)


if __name__ == "__main__":
    sys.exit(main())
