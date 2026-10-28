"""Marketing screenshots and clips of Oak Order, from a copy of the
founder's demo shop on this machine. Development only: the live site is
only read, through its public storefront, to copy the shop; everything
else runs here, never on the live API, the Neon database or R2.

    cd backend && .venv/bin/python marketing/shots.py [--video]

One-time setup (beside the usual backend venv and `npm install`):

    .venv/bin/pip install -r marketing/requirements.txt
    .venv/bin/playwright install --with-deps chromium

What it does, with local Postgres running (`docker compose up -d --wait`):
copies the live demo shop (DEMO_SHOP_SLUG in the .env, see
marketing/demo_shop.py) into `social_commerce_demo`, builds the frontend
against a local API, starts that API, the built site and a photo server on
their own ports, then drives headless Chromium at an iPhone's 390 x 844 at
3x (1170 x 2532 PNGs) through a customer's orders and the seller's work on
them, in Khmer and in English:

    marketing/out/km/01_shop.png ... 22_customers.png
    marketing/out/en/...
    marketing/out/video/km_customer.mp4, km_01_shop.mp4 ...  (--video)

Every picture and clip is listed in docs/CODEBASE.md section 3. Each
picture is checked first: no console errors or failed requests, nothing
fetched from outside this machine, no debug words on screen, no loading
placeholders or toasts, and the Khmer font (Noto Sans Khmer) loaded. The
browser's clock is frozen and the new orders' times (and the times inside
their KHQR) are set to demo_shop.ORDER_TIME, so a second run gives the
same pictures. The videos show a circle on every tap; PACE times them.
"""

import argparse
import base64
import functools
import http.server
import json
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.request
from contextlib import ExitStack, contextmanager, nullcontext
from datetime import UTC, datetime, timedelta
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
FRONTEND = BACKEND.parent / "frontend"
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import demo_shop  # noqa: E402

from app.services.khqr import VALID_FOR, crc16  # noqa: E402

try:
    from playwright.sync_api import TimeoutError as PlaywrightTimeout
except ImportError:  # main() says how to install it
    PlaywrightTimeout = TimeoutError

API_PORT, WEB_PORT, PHOTO_PORT = 8011, 4180, 8091
API = f"http://localhost:{API_PORT}"
WEB = f"http://localhost:{WEB_PORT}"
PHOTOS = f"http://localhost:{PHOTO_PORT}"

VIEWPORT = {"width": 390, "height": 844}
SCALE = 3  # 1170 x 2532: sharp at 1080 x 1920
FPS = 30

# How the videos are paced, in seconds: change these to fit a voiceover.
PACE = {
    "hold": 1.0,  # the still frame at the start and the end of every clip
    "start": 0.5,  # after the still a clip starts on, before the first tap
    "look": 1.5,  # on a new screen, before the next tap
    "beat": 0.5,  # between taps on the same screen
    "tap": 0.3,  # the tap circle shows this long before the tap lands
    "type": 0.05,  # each letter typed
    "scroll": 1.0,  # one scroll down a page
    "qr": 1.5,  # on the KHQR, before "I've paid"
    "done": 1.5,  # on the screen a step ends on
    "hook": 6.0,  # the shop link clip's scroll down the products
}
CLIP_SECONDS = (5, 12)  # what the video scripts take for one step
HOOK_SCROLL = 2 * VIEWPORT["height"]  # how far down the products the hook goes

# The customer, as they'd type themselves in each language.
CUSTOMER = {
    "km": {
        "name": "ស្រីនាង សុខ",
        "phone": "089 765 432",
        "address": "ផ្ទះលេខ ២៥ ផ្លូវ ២៧១ សង្កាត់ទួលទំពូង ភ្នំពេញ",
    },
    "en": {
        "name": "Sreyneang Sok",
        "phone": "089 765 432",
        "address": "#25, St 271, Toul Tompoung, Phnom Penh",
    },
}
# Whose order the seller adds from a chat: a customer from before
# (demo_shop.EARLIER), so their name and address fill in.
CHAT_CUSTOMER = {"km": "077 456 123", "en": "092 345 671"}
# The button words the steps look for (frontend/src/i18n/messages).
TEXT = {
    "km": {
        "buy_now": "ទិញឥឡូវនេះ",
        "place_order": "បញ្ជាក់ការកុម្ម៉ង់",
        "i_paid": "ខ្ញុំបានបង់ហើយ",
        "accept": "ទទួល",
        "cash_handover": "បានដល់ដៃ និងបានទទួលសាច់ប្រាក់",
        "share": "ចែករំលែក",
        "one_more": "ច្រើនមួយ",
        "save_order": "រក្សាទុកការកុម្ម៉ង់",
        "receipt": "វិក្កយបត្រ",
    },
    "en": {
        "buy_now": "Buy now",
        "place_order": "Place order",
        "i_paid": "I've paid",
        "accept": "Accept",
        "cash_handover": "Delivered, cash received",
        "share": "Share",
        "one_more": "One more",
        "save_order": "Save order",
        "receipt": "Receipt",
    },
}
LOW_STOCK = 5  # the copy's low-stock level: the app's default
# Words that mean something leaked onto the screen.
DEBUG_WORDS = re.compile(
    r"\b(undefined|NaN|null|\[object|lorem|ipsum|todo|fixme|debug|test|perf)\b", re.IGNORECASE
)
# An order's row on the Orders tab (not "+ New order").
ORDER_ROW = "a[href*='/dashboard/orders/']:not([href$='/new'])"
CATEGORY_TABS = "nav:has(a[href*='/category/'])"
# Only this machine; "I've paid" opens the shop's chat, which isn't
# followed (no Telegram in the pictures).
LOCAL = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?/")
CHATS = re.compile(r"^https://(t\.me|m\.me|ig\.me)/")
# What on screen isn't finished yet: photos loading or still fading in
# (ProductImage fades them in once loaded), loading placeholders, toasts.
UNFINISHED = """(toasts) => {
    // On screen, drawn (not in a closed <details>), and not cut away by a
    // folded part (overflow hidden).
    const inView = (el) => {
        if (!el.checkVisibility()) return false
        let { top, bottom, left, right } = el.getBoundingClientRect()
        for (let box = el.parentElement; box; box = box.parentElement) {
            if (getComputedStyle(box).overflow === 'visible') continue
            const r = box.getBoundingClientRect()
            top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom)
            left = Math.max(left, r.left); right = Math.min(right, r.right)
        }
        return bottom > Math.max(top, 0) && top < innerHeight && right > left
    }
    const photos = [...document.images].filter(inView).filter((img) =>
        !img.complete || img.naturalWidth === 0 || getComputedStyle(img).opacity !== '1')
    const placeholders = [...document.querySelectorAll('.animate-pulse')].filter(inView)
    // An order's progress bar (shop/ShopOrder.tsx) fills a part at a time
    // up to its step: the one its list for screen readers marks current.
    const drawn = 'ol.sr-only:has(> li[aria-current=step]) + [aria-hidden]'
    const bars = [...document.querySelectorAll(drawn)].filter((bar) => {
        const steps = [...bar.previousElementSibling.children]
        const step = steps.findIndex((li) => li.getAttribute('aria-current') === 'step')
        return bar.querySelectorAll('.w-full').length !== step + 1
    })
    const shown = toasts ? [...document.querySelectorAll('[aria-live] > [role]')] : []
    const opacity = (img) => getComputedStyle(img).opacity
    return [
        ...photos.map((img) => `photo ${img.currentSrc || img.src} (opacity ${opacity(img)})`),
        ...placeholders.map(() => 'a loading placeholder'),
        ...bars.map(() => 'the order progress bar filling'),
        ...shown.map((t) => `toast "${t.textContent}"`),
    ]
}"""
# Videos only: a circle where the next tap lands. A popover, so it shows
# above an open sheet (<dialog> is drawn on top of the page otherwise).
TAP_CIRCLE = """window.oakTap = (x, y) => {
    const dot = document.createElement('div')
    dot.popover = 'manual'
    dot.style.cssText = `position: fixed; inset: auto; left: ${x - 24}px; top: ${y - 24}px;
        width: 48px; height: 48px; margin: 0; padding: 0; overflow: visible; pointer-events: none;
        border: 3px solid rgb(255 255 255 / .95); border-radius: 50%;
        background: rgb(15 23 42 / .28); box-shadow: 0 0 0 1.5px rgb(15 23 42 / .45)`
    document.body.append(dot)
    dot.showPopover()
    dot.animate(
        [
            { transform: 'scale(.6)', opacity: 0 },
            { transform: 'scale(1)', opacity: 1, offset: 0.25 },
            { transform: 'scale(1)', opacity: 1, offset: 0.6 },
            { transform: 'scale(1.25)', opacity: 0 },
        ],
        { duration: 900, easing: 'ease-out', fill: 'forwards' },
    ).finished.then(() => dot.remove())
}"""
# A scroll for the videos, eased in and out over `ms`, to put `selector`
# near the top (under the header) or `by` pixels further down.
GLIDE = """([selector, offset, by, ms]) => new Promise((done) => {
    const root = document.documentElement
    root.style.scrollBehavior = 'auto'
    const from = scrollY
    const to = selector
        ? document.querySelector(selector).getBoundingClientRect().top + scrollY - 72 + offset
        : from + by
    const end = Math.max(0, Math.min(to, root.scrollHeight - innerHeight))
    const start = performance.now()
    const step = (now) => {
        const t = Math.min(1, (now - start) / ms)
        scrollTo(0, from + (end - from) * (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2))
        if (t < 1) requestAnimationFrame(step)
        else done()
    }
    requestAnimationFrame(step)
})"""
TIMESTAMP = re.compile(r'"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))"')
KHQR_CODE = re.compile(r'"code":"(000201[^"]*)"')


class Failed(Exception):
    pass


def ms(name: str) -> float:
    return PACE[name] * 1000


def pin_khqr(code: str) -> str:
    """A KHQR with the times in it (made, valid until) set from
    demo_shop.ORDER_TIME, and its check digits made again, so the QR is
    the same every run (and past its date: nobody can pay with it)."""
    payload, fields = code[:-8], []  # without the CRC field, "6304" + 4
    while payload:
        tag, size = payload[:2], int(payload[2:4])
        fields.append((tag, payload[4 : 4 + size]))
        payload = payload[4 + size :]

    def tlv(tag: str, value: str) -> str:
        return f"{tag}{len(value):02d}{value}"

    def stamp(moment: datetime) -> str:
        return str(int(moment.timestamp() * 1000))

    made = demo_shop.ORDER_TIME
    times = tlv("00", stamp(made)) + tlv("01", stamp(made + VALID_FOR))
    pinned = "".join(tlv(tag, times if tag == "99" else value) for tag, value in fields) + "6304"
    return pinned + crc16(pinned)


def picks(copy: dict) -> tuple[dict, dict, tuple[dict, dict | None, int] | None]:
    """What the steps buy: the customer's two products (the newest with
    options, each in its middle option) and what the chat order takes
    down to low stock (`low_stock_pick`)."""
    products = copy["products"]
    with_options = [product for product in products if product["variants"]]
    if not with_options:
        raise Failed(
            "The live demo shop needs a product with options (sizes) for the customer's steps"
        )
    first, second = with_options[0], with_options[1 % len(with_options)]
    taken = {(p["slug"], demo_shop.middle_option(p)["name"]) for p in (first, second)}
    return first, second, low_stock_pick(products, taken)


def low_stock_pick(products: list[dict], taken: set) -> tuple[dict, dict | None, int] | None:
    """What a chat order can take down to LOW_STOCK with the fewest items
    (3 at most): (product, option or None, quantity); not one of `taken`
    (slug, option name), which the customer's orders buy."""
    found = []
    for place, product in enumerate(products):
        for option in product["variants"] or [None]:
            stock = option["stock_quantity"] if option else product["stock_quantity"]
            name = option and option["name"]
            if stock is not None and (product["slug"], name) not in taken:
                if LOW_STOCK < stock <= LOW_STOCK + 3:
                    found.append((stock, place, product, option))
    if not found:
        return None
    stock, _, product, option = min(found, key=lambda pick: pick[:2])
    return product, option, stock - LOW_STOCK


def search_words(name: str, names: list[str]) -> str:
    """The fewest words of `name`, in a row, that no other name has."""
    words = name.split()
    for size in range(1, len(words) + 1):
        for start in range(len(words) - size + 1):
            part = " ".join(words[start : start + size])
            if sum(part.casefold() in other.casefold() for other in names) == 1:
                return part
    return name


# --- the servers -------------------------------------------------------------


def port_free(port: int) -> bool:
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", port)) != 0


def wait_for(url: str, process: subprocess.Popen, what: str, seconds: float = 60) -> None:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise Failed(f"{what} stopped (exit {process.returncode}); see its output above")
        try:
            with urllib.request.urlopen(url, timeout=2):
                return
        except OSError:
            time.sleep(0.3)
    raise Failed(f"{what} didn't answer at {url}")


@contextmanager
def running(command: list[str], cwd: Path, env: dict[str, str], url: str, what: str):
    process = subprocess.Popen(command, cwd=cwd, env=env, stdout=subprocess.DEVNULL)
    try:
        wait_for(url, process, what)
        yield process
    finally:
        process.terminate()
        try:
            process.wait(10)
        except subprocess.TimeoutExpired:
            process.kill()


@contextmanager
def photo_server(folder: Path):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args) -> None:
            pass

    handler = functools.partial(Quiet, directory=str(folder))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PHOTO_PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield
    finally:
        server.shutdown()


def api_env(database_url: str) -> dict[str, str]:
    """The API on the demo database, with everything that reaches outside
    this machine off, whatever the .env says (real variables win over it)."""
    env = dict(os.environ)
    env.update(
        DATABASE_URL=database_url,
        ENVIRONMENT="development",
        CORS_ORIGINS=json.dumps([WEB]),
        RATE_LIMIT_ENABLED="false",
        SENTRY_DSN="",
        PUBLIC_API_URL="",
        PUBLIC_APP_URL="",
        BILLING_CRON_SECRET="",
        ADMIN_PHONES="",
    )
    for name in (
        "TELEGRAM_BOT_TOKEN",
        "TELEGRAM_BOT_USERNAME",
        "TELEGRAM_WEBHOOK_SECRET",
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET",
        "R2_PUBLIC_URL",
        "GOOGLE_CLIENT_ID",
        "FACEBOOK_APP_ID",
        "FACEBOOK_APP_SECRET",
    ):
        env[name] = ""
    return env


def build_site(out: Path) -> None:
    """The frontend as it ships (no dev overlays), calling the local API."""
    env = dict(os.environ)
    env.update(VITE_API_URL=API, VITE_SENTRY_DSN="")
    print("Building the frontend ...", flush=True)
    vite = FRONTEND / "node_modules" / ".bin" / "vite"
    if not vite.exists():
        raise Failed("No frontend/node_modules: run `npm install` in frontend/ first")
    subprocess.run(
        [str(vite), "build", "--outDir", str(out), "--emptyOutDir", "--logLevel", "error"],
        cwd=FRONTEND,
        env=env,
        check=True,
    )


def seed(copy: Path) -> None:
    subprocess.run(
        [sys.executable, str(HERE / "demo_shop.py"), "--copy", str(copy)]
        + ["--image-base", PHOTOS, "--quiet"],
        cwd=BACKEND,
        check=True,
    )


# --- the browser -------------------------------------------------------------


class Shots:
    """One language's run: a customer's phone and the seller's, through
    every step. Stills: a PNG of each screen. Filmed (`moving`): real
    motion, typing and a circle on each tap, and an MP4 of each step."""

    def __init__(self, browser, lang: str, out: Path, copy: dict, moving: bool = False) -> None:
        self.browser = browser
        self.lang = lang
        self.out = out
        self.moving = moving
        self.problems: list[str] = []
        self.in_flight: dict = {}  # page: the requests it's waiting on
        self.marks: list[float] = []  # where a filmed step's clip is cut
        # API times stamped from here on are the new orders'.
        self.started = datetime.now(UTC) - timedelta(seconds=5)

        self.shop = copy["shop"]
        self.shop_url = f"{WEB}/shop/{self.shop['slug']}"
        self.names = [product["name"] for product in copy["products"]]
        self.first, self.second, self.low = picks(copy)
        self.khqr = demo_shop.khqr_settings()[0] is not None
        self.order_a = self.order_b = self.order_c = ""
        self.token, self.seller_request = "", None  # the seller's, for the API (seller_login)

    def context(self):
        options = dict(
            viewport=VIEWPORT,
            screen=VIEWPORT,
            device_scale_factor=SCALE,
            is_mobile=True,
            has_touch=True,
            locale="km-KH" if self.lang == "km" else "en-US",
            timezone_id="Asia/Phnom_Penh",
            color_scheme="light",
            # Still pictures without animations caught halfway.
            reduced_motion="no-preference" if self.moving else "reduce",
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 "
                "(KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"
            ),
        )
        context = self.browser.new_context(**options)
        # Copying a link (Share on a laptop-like browser, with no share list).
        context.grant_permissions(["clipboard-read", "clipboard-write"], origin=WEB)
        context.clock.set_fixed_time(demo_shop.NOW)
        context.add_init_script(
            f"""try {{
                localStorage.setItem('sc.lang', {json.dumps(self.lang)});
                localStorage.setItem('sc.theme', 'light');
            }} catch {{}}"""
        )
        if self.moving:
            context.add_init_script(TAP_CIRCLE)
        context.route(lambda url: not LOCAL.match(url), self.outside)
        context.route(f"{API}/**", self.pin_times)
        page = context.new_page()
        page.on("console", self.console)
        page.on("pageerror", lambda e: self.problems.append(f"page error: {e}"))
        waiting = self.in_flight[page] = set()

        def request(r) -> None:
            # A new page: what the old one was loading is dropped, not
            # always with a "failed" (on film, while a clip is saved).
            if r.is_navigation_request() and r.frame == page.main_frame:
                waiting.clear()
            waiting.add(r)

        page.on("request", request)
        page.on("requestfinished", lambda r: waiting.discard(r))
        page.on("requestfailed", lambda r: self.request_failed(r, waiting))
        page.on(
            "response",
            lambda r: r.status >= 400 and self.problems.append(f"HTTP {r.status} {r.url}"),
        )
        return context, page

    def console(self, message) -> None:
        if message.type == "error":
            self.problems.append(f"console: {message.text}")

    def request_failed(self, request, waiting: set) -> None:
        waiting.discard(request)
        # Navigating away cancels what was loading: not a problem.
        if "ERR_ABORTED" not in (request.failure or "") and LOCAL.match(request.url):
            self.problems.append(f"request failed: {request.url} {request.failure}")

    def outside(self, route) -> None:
        if not CHATS.match(route.request.url):
            self.problems.append(f"fetched from outside this machine: {route.request.url}")
        route.abort()

    def pin_times(self, route) -> None:
        """The API's answers with the times stamped during this run (the
        new orders') set to demo_shop.ORDER_TIME, so they read the same
        every run; so are the times inside a KHQR."""
        response = route.fetch()
        if "json" not in response.headers.get("content-type", ""):
            return route.fulfill(response=response)
        pinned = demo_shop.ORDER_TIME.isoformat().replace("+00:00", "Z")

        def pin(match: re.Match) -> str:
            stamped = datetime.fromisoformat(match.group(1).replace("Z", "+00:00"))
            return f'"{pinned}"' if stamped >= self.started else match.group(0)

        body = TIMESTAMP.sub(pin, response.text())
        body = KHQR_CODE.sub(lambda m: f'"code":"{pin_khqr(m.group(1))}"', body)
        route.fulfill(response=response, body=body)

    # --- waiting until the screen is finished --------------------------------

    def settle(self, page, name: str, toasts: bool = True) -> None:
        # The app moves between pages without loading one, so the browser's
        # own "network idle" is long past: wait for its requests instead.
        waiting, quiet = self.in_flight[page], 0.2 if self.moving else 0.5
        began = quiet_since = time.monotonic()
        while waiting or time.monotonic() - quiet_since < quiet:
            if waiting:
                quiet_since = time.monotonic()
                if quiet_since - began > 15:
                    urls = sorted(request.url for request in waiting)
                    raise Failed(f"{self.lang} {name}: still loading {urls}")
            page.wait_for_timeout(50)
        page.evaluate("document.fonts.ready")
        try:
            page.wait_for_function(
                f"(toasts) => ({UNFINISHED})(toasts).length === 0", arg=toasts, timeout=15_000
            )
        except PlaywrightTimeout:
            waiting = page.evaluate(UNFINISHED, toasts)
            raise Failed(f"{self.lang} {name}: still waiting on {waiting}") from None
        # Two frames, so what just loaded is painted.
        page.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))")

    def check(self, page, name: str) -> None:
        text = page.evaluate("document.body.innerText")
        if found := DEBUG_WORDS.findall(text):
            self.problems.append(f"{name}: {', '.join(sorted(set(found)))} on screen")
        khmer = page.evaluate(
            """() => {
                const face = [...document.fonts].some(
                    (f) => /Noto Sans Khmer/i.test(f.family) && f.status === 'loaded')
                // Every element with Khmer letters of its own is drawn in it.
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
                const wrong = new Set()
                while (walker.nextNode()) {
                    const node = walker.currentNode
                    if (!/[\\u1780-\\u17FF]/.test(node.data)) continue
                    const family = getComputedStyle(node.parentElement).fontFamily
                    if (!/Noto Sans Khmer/i.test(family)) wrong.add(family)
                }
                const any = /[\\u1780-\\u17FF]/.test(document.body.innerText)
                return { face, wrong: [...wrong], any }
            }"""
        )
        if khmer["any"] and not khmer["face"]:
            self.problems.append(f"{name}: Khmer on screen but Noto Sans Khmer didn't load")
        if khmer["wrong"]:
            self.problems.append(f"{name}: Khmer drawn in {khmer['wrong']}")
        self.no_problems(name)

    def no_problems(self, name: str) -> None:
        if self.problems:
            raise Failed(f"{self.lang} {name}:\n  " + "\n  ".join(self.problems))

    def show(self, page, name: str, look: str = "look") -> None:
        """A step's screen: its PNG, or on film a moment to look at it."""
        if self.moving:
            self.look(page, name, look)
            return
        self.settle(page, name)
        self.check(page, name)
        path = self.out / f"{name}.png"
        page.screenshot(path=path, animations="disabled", caret="hide", scale="device")
        print(f"  {path.relative_to(BACKEND)}", flush=True)

    def look(self, page, name: str, pace: str = "look") -> None:
        """On film, a screen with no PNG of its own: finished, then a pause."""
        if self.moving:
            self.settle(page, name, toasts=False)
            page.wait_for_timeout(ms(pace))

    def wait(self, page, name: str) -> None:
        """A pause on film (PACE[name]); none for stills."""
        if self.moving:
            page.wait_for_timeout(ms(name))

    def scroll_to(self, page, selector: str, offset: int = 0) -> None:
        """Puts `selector` near the top (under the header): at once for a
        still, a scroll you can follow on film."""
        if self.moving:
            page.evaluate(GLIDE, [selector, offset, 0, ms("scroll")])
            return
        page.evaluate(
            """([selector, offset]) => {
                const el = document.querySelector(selector)
                const top = el.getBoundingClientRect().top + scrollY - 72 + offset
                document.documentElement.style.scrollBehavior = 'auto'
                scrollTo(0, Math.max(0, top))
            }""",
            [selector, offset],
        )

    def tap(self, page, target) -> None:
        """Taps `target` (a locator); on film, a circle shows where first."""
        target = target.first
        if self.moving:
            target.scroll_into_view_if_needed()
            box = target.bounding_box()
            middle = [box["x"] + box["width"] / 2, box["y"] + box["height"] / 2]
            page.evaluate("([x, y]) => window.oakTap(x, y)", middle)
            page.wait_for_timeout(ms("tap"))
        target.click()

    def type_into(self, page, selector: str, value: str) -> None:
        field = page.locator(selector).first
        self.tap(page, field)
        field.press_sequentially(value, delay=ms("type") if self.moving else 0)

    @staticmethod
    def button(page, name: str):
        """The button that reads `name` (on a phone, the pinned bar can
        repeat it off screen)."""
        return page.get_by_role("button", name=name, exact=True).filter(visible=True)

    # --- filming --------------------------------------------------------------

    @contextmanager
    def film(self, page, name: str, cuts: tuple[str, ...] = ()):
        """On a video run, films what the steps inside do as
        video/<lang>_<name>.mp4, from the screen as it stands; with `cuts`,
        also one clip per stretch between the marks (`mark`)."""
        if not self.moving:
            yield
            return
        self.settle(page, name, toasts=False)
        # Nothing caught moving in the still it starts on (an item flying
        # to the cart, a tap's circle); endless ones (the truck) aside.
        page.wait_for_function(
            """() => document.getAnimations().every((a) =>
                a.playState !== 'running' || a.effect?.getComputedTiming().endTime === Infinity)"""
        )
        recorder = Recorder(page, self.out / ".frames" / name)
        self.marks = [time.time()]
        yield
        recorder.stop()
        self.no_problems(name)
        clips = [(name, self.marks[0], None)]
        if cuts:
            stops = self.marks[1:] + [None]
            clips += zip(cuts, self.marks, stops, strict=True)
        for clip, start, end in clips:
            seconds = recorder.save(self.out / f"{self.lang}_{clip}.mp4", start, end)
            low, high = CLIP_SECONDS
            if clip != "customer" and not low <= seconds <= high:
                print(
                    f"    note: {seconds:.1f} s, the scripts take {low}-{high} s (PACE)", flush=True
                )
        recorder.discard()

    def mark(self) -> None:
        """Where the clip of the step just done ends and the next begins."""
        if self.moving:
            self.marks.append(time.time())

    # --- the steps -------------------------------------------------------------

    def open_shop(self, page) -> None:
        page.goto(self.shop_url)
        page.locator(CATEGORY_TABS).wait_for()

    def shop_link(self, page) -> None:
        """Video only (the hook; its stills are 01 and 02): the shop as a
        link opens it, its top, then down the products."""
        self.open_shop(page)
        # Every photo the scroll shows loaded first, so none pops in.
        for y in range(0, HOOK_SCROLL + 1, VIEWPORT["height"] // 2):
            page.evaluate("(y) => scrollTo(0, y)", y)
            self.settle(page, "00_shop_link", toasts=False)
        page.evaluate("scrollTo(0, 0)")
        with self.film(page, "00_shop_link"):
            self.wait(page, "start")
            page.evaluate(GLIDE, [None, 0, HOOK_SCROLL, ms("hook")])
            self.show(page, "00_shop_link", look="done")
        # Back to the top, or opening the shop again (01) starts where it was.
        page.evaluate("scrollTo(0, 0)")

    def pick_option(self, page, product: dict) -> None:
        option = demo_shop.middle_option(product)["name"]
        label = page.locator("fieldset label").filter(
            has_text=re.compile(rf"^{re.escape(option)}$")
        )
        self.tap(page, label)

    def customer(self, page) -> None:
        """01-06: a customer's first order on this phone, cash on delivery
        (order A); on film, one video and a clip per step."""
        words, me = TEXT[self.lang], CUSTOMER[self.lang]
        product = self.first
        self.open_shop(page)
        cuts = ("01_shop", "03_option", "05_checkout", "06_order_placed")
        with self.film(page, "customer", cuts):
            self.show(page, "01_shop")
            self.scroll_to(page, CATEGORY_TABS, offset=-8)
            self.show(page, "02_products")

            self.tap(page, page.locator(f"a[href$='/product/{product['slug']}']"))
            page.wait_for_url(f"**/product/{product['slug']}")
            self.show(page, "03_product")
            self.mark()

            self.scroll_to(page, "fieldset", offset=-160)
            self.pick_option(page, product)
            self.show(page, "04_option")
            self.mark()

            self.tap(page, page.get_by_role("button", name=words["buy_now"]))
            page.wait_for_url("**/cart")
            page.wait_for_load_state("networkidle")
            self.type_into(page, "input[autocomplete=name]", me["name"])
            self.type_into(page, "input[autocomplete=tel]", me["phone"])
            # Delivery (not pickup); the address box opens with it.
            self.tap(page, page.locator("label:has(input[name=delivery-choice])"))
            self.type_into(page, "[autocomplete=street-address]", me["address"])
            if self.khqr:  # cash alone isn't a choice: nothing to tap
                self.tap(page, page.locator("label:has(input[name=payment][value=cod])"))
            page.evaluate("document.activeElement?.blur()")
            if not self.moving:
                self.scroll_to(page, "input[autocomplete=name]", offset=-75)
            self.show(page, "05_checkout")
            self.mark()

            self.tap(page, page.get_by_role("button", name=re.compile(words["place_order"])))
            page.wait_for_url("**/order/**")
            self.show(page, "06_confirmation", look="done")
        self.order_a = page.url.rsplit("/", 1)[1]

    def seller_login(self, context) -> None:
        response = context.request.post(
            f"{API}/api/v1/auth/login",
            data={"login": demo_shop.PHONE, "password": demo_shop.PASSWORD},
        )
        if not response.ok:
            raise Failed(f"seller login: HTTP {response.status} {response.text()}")
        self.token = response.json()["access_token"]
        self.seller_request = context.request
        context.add_init_script("try { localStorage.setItem('sc.session', '1') } catch {}")

    def seller(self, page) -> None:
        """07-09 (stills): the new order on the Orders tab, open, and on
        the bell's list."""
        page.goto(f"{WEB}/dashboard/orders")
        new_order = page.locator(ORDER_ROW).first
        new_order.wait_for()
        self.show(page, "07_dashboard")
        self.tap(page, new_order)
        page.wait_for_url("**/dashboard/orders/*")
        self.show(page, "08_order")
        # The open order is a focused screen: the bell is on the list.
        page.go_back()
        self.tap(page, page.locator("a[href^='/dashboard/notifications']"))
        page.wait_for_url("**/dashboard/notifications**")
        self.show(page, "09_notifications")

    def watch_orders(self, page):
        """Film: the Orders tab, filmed from before the customer orders."""
        page.goto(f"{WEB}/dashboard/orders")
        page.locator(ORDER_ROW).first.wait_for()
        return Recorder(page, self.out / ".frames" / "order_arrives"), page.locator(
            ORDER_ROW
        ).count()

    def order_arrives(self, page, recorder, count: int) -> None:
        """Film: the customer's order arriving on the Orders tab (it looks
        for new orders every 30 s, so the clip starts a few seconds before
        it shows), and the seller opening it."""
        page.wait_for_function(
            f"document.querySelectorAll({json.dumps(ORDER_ROW)}).length > {count}",
            timeout=45_000,
            polling=100,
        )
        arrived = time.time()
        page.wait_for_timeout(2500)
        self.tap(page, page.locator(ORDER_ROW))
        page.wait_for_url("**/dashboard/orders/*")
        self.settle(page, "order_arrives", toasts=False)
        page.wait_for_timeout(ms("done"))
        recorder.stop()
        self.no_problems("order_arrives")
        recorder.save(self.out / f"{self.lang}_order_arrives.mp4", arrived - 3)
        recorder.discard()

    def second_order(self, page) -> None:
        """10-12: the same customer orders again on the same phone (their
        details remembered), pays by KHQR and taps "I've paid" (order B).
        Without the KHQR details in the .env they pay cash, with no
        pictures or clip: order B is still what 13 follows."""
        words, product = TEXT[self.lang], self.second
        page.goto(f"{self.shop_url}/product/{product['slug']}")
        self.pick_option(page, product)
        page.get_by_role("button", name=words["buy_now"]).click()
        page.wait_for_url("**/cart")
        page.wait_for_load_state("networkidle")
        # Delivery first (off camera on film): the clip is about paying.
        self.tap(page, page.locator("label:has(input[name=delivery-choice])"))
        if self.khqr:
            self.scroll_to(page, "label:has(input[name=payment])", offset=-110)
        with self.film(page, "10_khqr") if self.khqr else nullcontext():
            if self.khqr:
                self.wait(page, "start")
                self.tap(page, page.locator("label:has(input[name=payment][value=khqr])"))
                self.show(page, "10_khqr_checkout", look="beat")
            self.tap(page, page.get_by_role("button", name=re.compile(words["place_order"])))
            page.wait_for_url("**/order/**")
            if self.khqr:
                qr = f"img[alt*={json.dumps(demo_shop.khqr_name(self.shop['name']))}]"
                page.locator(qr).wait_for()
                self.scroll_to(page, qr, offset=-40)
                self.show(page, "11_khqr", look="qr")
                paid = page.locator("a, button").filter(
                    has_text=re.compile(f"^{re.escape(words['i_paid'])}")
                )
                if paid.first.evaluate("(el) => el.tagName") == "A":
                    # It opens the shop's chat too (not followed).
                    with page.expect_popup() as chat:
                        self.tap(page, paid)
                    chat.value.close()
                else:
                    self.tap(page, paid)
                paid.first.wait_for(state="detached")
                self.show(page, "12_khqr_paid", look="done")
        self.order_b = page.url.rsplit("/", 1)[1]

    def accept_to_complete(self, page) -> None:
        """14-15: the seller accepts order A, then "Delivered, cash
        received", and it completes by itself (paid and delivered, 02
        section 7.4)."""
        words = TEXT[self.lang]
        page.goto(f"{WEB}/dashboard/orders/{self.order_a}")
        self.button(page, words["accept"]).first.wait_for()
        with self.film(page, "14_accept_to_complete"):
            self.wait(page, "start")
            self.tap(page, self.button(page, words["accept"]))
            handover = self.button(page, words["cash_handover"])
            handover.first.wait_for()
            self.show(page, "14_accepted")
            self.tap(page, handover)
            handover.first.wait_for(state="detached")
            self.show(page, "15_completed", look="done")

    def send_second_order(self) -> None:
        """Order B on its way (not pictured), through the API the
        dashboard calls: accepted, paid if by KHQR, and with the driver."""
        steps = [("status", {"status": "accepted"})]
        if self.khqr:
            steps.append(("payment", {"status": "paid"}))
        steps.append(("delivery", {"status": "assigned"}))
        for part, body in steps:
            response = self.seller_request.patch(
                f"{API}/api/v1/seller/orders/{self.order_b}/{part}",
                data=body,
                headers={"Authorization": f"Bearer {self.token}"},
            )
            if not response.ok:
                raise Failed(f"order B's {part}: HTTP {response.status} {response.text()}")

    def tracking(self, page) -> None:
        """13: the customer opens the shop again and follows order B from
        the truck at its top."""
        self.open_shop(page)
        truck = page.locator(f"a[href$='/order/{self.order_b}']")
        truck.first.wait_for()
        with self.film(page, "13_tracking"):
            self.wait(page, "start")
            self.tap(page, truck)
            page.wait_for_url(f"**/order/{self.order_b}")
            self.show(page, "13_tracking", look="done")

    def share(self, page) -> None:
        """16: Share on a product, then where it'll be posted; the link
        for that place goes to the phone's share list (copied here: the
        headless browser has none)."""
        product_id = demo_shop.fixed_id(f"product/{self.first['slug']}")
        page.goto(f"{WEB}/dashboard/products")
        card = page.locator(f"a[href='/dashboard/products/{product_id}']")
        card.first.wait_for()
        with self.film(page, "16_share"):
            self.wait(page, "start")
            self.tap(page, card)
            page.wait_for_url(f"**/dashboard/products/{product_id}")
            self.look(page, "16_product")
            self.tap(page, self.button(page, TEXT[self.lang]["share"]))
            sheet = page.locator("dialog[open]")
            sheet.wait_for()
            self.show(page, "16_share_link")
            self.tap(page, sheet.get_by_role("button", name="Facebook"))
            sheet.wait_for(state="detached")
            self.wait(page, "done")

    def chat_order(self, page) -> None:
        """17-18: an order from a chat: the phone of a customer from before
        (their name and address fill in), a product, Save (order C). It
        takes the low-stock product down to the alert level, for 19-20."""
        words = TEXT[self.lang]
        if self.low:
            product, option, quantity = self.low
        else:
            product, option, quantity = self.first, demo_shop.middle_option(self.first), 1
        page.goto(f"{WEB}/dashboard/orders/new")
        name = page.locator("input[autocapitalize=words]")
        name.wait_for()
        with self.film(page, "17_chat_order"):
            self.wait(page, "start")
            self.type_into(page, "input[type=tel]", CHAT_CUSTOMER[self.lang])
            page.wait_for_function("(el) => el.value !== ''", arg=name.element_handle())
            self.type_into(page, "input[type=search]", search_words(product["name"], self.names))
            self.wait(page, "beat")
            self.tap(page, page.locator("li > button").filter(has_text=product["name"]))
            if option:
                chip = page.locator("li button").filter(
                    has_text=re.compile(f"^{re.escape(option['name'])}")
                )
                self.wait(page, "beat")
                self.tap(page, chip)
            for _ in range(quantity - 1):
                self.tap(page, page.get_by_role("button", name=words["one_more"]))
            page.evaluate("document.activeElement?.blur()")
            if not self.moving:
                # The customer it found, then what they're buying.
                page.evaluate("scrollTo(0, 0)")
            self.show(page, "17_chat_order_form", look="beat")
            self.tap(page, self.button(page, words["save_order"]))
            page.wait_for_url(re.compile(r"/dashboard/orders/[0-9a-f-]{36}$"))
            self.show(page, "18_chat_order", look="done")
        self.order_c = page.url.rsplit("/", 1)[1]

    def parcel_slip(self, page) -> None:
        """21: order C's parcel slip: ⋯ → Receipt."""
        with self.film(page, "21_parcel_slip"):
            self.wait(page, "start")
            self.tap(page, page.locator("button[aria-haspopup=menu]").filter(visible=True))
            self.wait(page, "beat")
            self.tap(page, page.get_by_role("menuitem", name=TEXT[self.lang]["receipt"]))
            page.wait_for_url("**/receipt")
            self.show(page, "21_parcel_slip", look="done")

    def low_stock(self, page) -> None:
        """19-20: the alert order C raised, on the bell's list, then on
        the product it opens."""
        product_id = demo_shop.fixed_id(f"product/{self.low[0]['slug']}")
        page.goto(f"{WEB}/dashboard/orders")
        bell = page.locator("a[href^='/dashboard/notifications']").filter(visible=True)
        bell.first.wait_for()
        with self.film(page, "19_low_stock"):
            self.wait(page, "start")
            self.tap(page, bell)
            page.wait_for_url("**/dashboard/notifications**")
            self.show(page, "19_low_stock_alert")
            self.tap(page, page.locator(f"a[href='/dashboard/products/{product_id}']"))
            page.wait_for_url(f"**/dashboard/products/{product_id}")
            self.show(page, "20_low_stock_product", look="done")

    def customers(self, page) -> None:
        """22: the Customers tab; on film, then a customer's page."""
        page.goto(f"{WEB}/dashboard/orders")
        tab = page.locator("a[href='/dashboard/customers']").filter(visible=True)
        tab.first.wait_for()
        with self.film(page, "22_customers"):
            self.wait(page, "start")
            self.tap(page, tab)
            page.wait_for_url("**/dashboard/customers")
            self.show(page, "22_customers")
            if self.moving:
                self.tap(
                    page, page.locator("a[href^='/dashboard/customers/']").filter(visible=True)
                )
                page.wait_for_url("**/dashboard/customers/*")
                self.look(page, "22_customer", "done")


def story(browser, lang: str, out: Path, copy: dict, moving: bool) -> None:
    """Every step in the order it happens, on two phones: the seller's and
    the customer's (one phone throughout, which remembers them)."""
    folder = out / ("video" if moving else lang)
    if moving:
        folder.mkdir(parents=True, exist_ok=True)
        shutil.rmtree(folder / ".frames", ignore_errors=True)
    else:
        shutil.rmtree(folder, ignore_errors=True)
        folder.mkdir(parents=True)
    run = Shots(browser, lang, folder, copy, moving)
    with ExitStack() as stack:
        seller, desk = run.context()
        stack.callback(seller.close)
        run.seller_login(seller)
        customer, phone = run.context()
        stack.callback(customer.close)
        if moving:
            run.shop_link(phone)
            arrives = run.watch_orders(desk)
        run.customer(phone)
        if moving:
            run.order_arrives(desk, *arrives)
        else:
            run.seller(desk)
        run.second_order(phone)
        run.accept_to_complete(desk)
        run.send_second_order()
        run.tracking(phone)
        run.share(desk)
        run.chat_order(desk)
        run.parcel_slip(desk)
        if run.low:
            run.low_stock(desk)
        run.customers(desk)
    if moving:
        shutil.rmtree(folder / ".frames", ignore_errors=True)


class Recorder:
    """Films a page with Chrome's screencast, at the phone's full
    resolution (Playwright's own videos are at 390 px wide), then makes
    MP4s of it with ffmpeg, which CapCut takes."""

    def __init__(self, page, frames: Path) -> None:
        self.frames: list[tuple[float, Path]] = []  # (wall-clock time, JPEG)
        self.folder = frames
        shutil.rmtree(frames, ignore_errors=True)
        frames.mkdir(parents=True)
        self.stopped = 0.0
        self.cdp = page.context.new_cdp_session(page)
        self.cdp.on("Page.screencastFrame", self.frame)
        self.cdp.send(
            "Page.startScreencast",
            {
                "format": "jpeg",
                "quality": 95,
                "maxWidth": VIEWPORT["width"] * SCALE,
                "maxHeight": VIEWPORT["height"] * SCALE,
            },
        )
        # The screen as it stands, before anything moves.
        deadline = time.monotonic() + 3
        while not self.frames and time.monotonic() < deadline:
            page.wait_for_timeout(20)

    def frame(self, event: dict) -> None:
        if self.stopped:  # one still on its way when filming stopped
            return
        path = self.folder / f"{len(self.frames):05d}.jpg"
        path.write_bytes(base64.b64decode(event["data"]))
        self.frames.append((event["metadata"]["timestamp"], path))
        self.cdp.send("Page.screencastFrameAck", {"sessionId": event["sessionId"]})

    def stop(self) -> None:
        self.stopped = time.time()
        self.cdp.send("Page.stopScreencast")

    def save(self, mp4: Path, start: float, end: float | None = None) -> float:
        """From `start` to `end` (wall-clock; the end of filming if None)
        at 30 frames a second, with the first and last frame held for
        PACE["hold"]; returns its length in seconds. Chrome sends a frame
        only when the screen changes, so each is held until the next."""
        import imageio_ffmpeg

        if not self.frames:
            raise Failed(f"no frames filmed for {mp4.name}")
        end = self.stopped if end is None else end
        moment, shown, frames = max(start, self.frames[0][0]), 0, []
        while moment <= end:
            while shown + 1 < len(self.frames) and self.frames[shown + 1][0] <= moment:
                shown += 1
            frames.append(self.frames[shown][1])
            moment += 1 / FPS
        hold = round(PACE["hold"] * FPS)
        frames = [frames[0]] * hold + frames + [frames[-1]] * hold
        ffmpeg = subprocess.Popen(
            [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error"]
            + ["-f", "image2pipe", "-framerate", str(FPS), "-i", "-"]
            # Even sizes for H.264; 1080 wide, as CapCut's 1080p projects.
            + ["-vf", "scale=1080:-2,setsar=1", "-c:v", "libx264", "-pix_fmt", "yuv420p"]
            + ["-crf", "18"]
            + ["-movflags", "+faststart", str(mp4)],
            stdin=subprocess.PIPE,
        )
        for path in frames:
            ffmpeg.stdin.write(path.read_bytes())
        ffmpeg.stdin.close()
        if ffmpeg.wait() != 0:
            raise Failed(f"ffmpeg couldn't make {mp4.name}")
        seconds = len(frames) / FPS
        print(f"  {mp4.relative_to(BACKEND)} ({seconds:.1f} s)", flush=True)
        return seconds

    def discard(self) -> None:
        shutil.rmtree(self.folder, ignore_errors=True)


@contextmanager
def demo_servers(work: Path):
    """The live demo shop copied, the built site, the API on the demo
    database and the photo server, running; yields the copy and a function
    that seeds the demo shop afresh from it."""
    busy = [port for port in (API_PORT, WEB_PORT, PHOTO_PORT) if not port_free(port)]
    if busy:
        raise Failed(f"ports in use: {busy} (another run still going?)")
    database_url = demo_shop.database_url(demo_shop.DEFAULT_DATABASE)  # refuses non-local
    print("Copying the live demo shop ...", flush=True)
    copy = demo_shop.fetch(work / "live")
    build_site(work / "site")
    print("Seeding the demo shop ...", flush=True)
    seed(work / "live")
    with ExitStack() as stack:
        stack.enter_context(photo_server(work / "live" / "photos"))
        stack.enter_context(
            running(
                [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(API_PORT)]
                + ["--log-level", "warning"],
                BACKEND,
                api_env(database_url),
                f"{API}/health",
                "The API",
            )
        )
        stack.enter_context(
            running(
                [str(FRONTEND / "node_modules" / ".bin" / "vite"), "preview"]
                + ["--port", str(WEB_PORT), "--strictPort", "--outDir", str(work / "site")],
                FRONTEND,
                dict(os.environ),
                WEB,
                "The site",
            )
        )
        yield copy, lambda: seed(work / "live")


def skipped(copy: dict) -> list[str]:
    """The steps this copy can't show, and why."""
    notes = []
    khqr, why_not = demo_shop.khqr_settings()
    if khqr is None:
        notes.append(f"10-12 (KHQR) skipped: {why_not}")
    if picks(copy)[2] is None:
        notes.append(
            f"19-20 (low stock) skipped: no product or option on the live shop has "
            f"{LOW_STOCK + 1}-{LOW_STOCK + 3} in stock, for an order to take it to {LOW_STOCK}"
        )
    return notes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--video", action="store_true", help="also record MP4s")
    parser.add_argument("--lang", nargs="+", choices=("km", "en"), default=["km", "en"])
    parser.add_argument("--out", type=Path, default=HERE / "out", help="where the files go")
    args = parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:  # the import at the top failed too
        sys.exit("Playwright isn't installed: see the setup lines at the top of marketing/shots.py")
    # Stopped from outside: still stop the servers and the browser.
    signal.signal(signal.SIGTERM, lambda *_: sys.exit("Stopped (SIGTERM)"))
    out = args.out.resolve()
    try:
        with ExitStack() as stack:
            copy, reseed = stack.enter_context(demo_servers(out / ".work"))
            notes = skipped(copy)
            for note in notes:
                print(f"Note: {note}", flush=True)
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch()
            stack.callback(browser.close)
            for lang in args.lang:
                print(f"Screenshots ({lang}):", flush=True)
                reseed()
                story(browser, lang, out, copy, moving=False)
            for lang in args.lang if args.video else ():
                print(f"Videos ({lang}):", flush=True)
                reseed()
                story(browser, lang, out, copy, moving=True)
    except Failed as error:
        sys.exit(f"Stopped: {error}")
    for note in notes:
        print(f"Note: {note}")
    print(f"Done: {out}")


if __name__ == "__main__":
    main()
