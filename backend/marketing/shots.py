"""Marketing screenshots (and optional MP4s) of Oak Order's core flow, from
a demo shop on this machine. Development only: it never touches the live
API, the Neon database or R2.

    cd backend && .venv/bin/python marketing/shots.py --photos ~/oak-photos [--video]

One-time setup (beside the usual backend venv and `npm install`):

    .venv/bin/pip install -r marketing/requirements.txt
    .venv/bin/playwright install --with-deps chromium

What it does, with local Postgres running (`docker compose up -d --wait`):
seeds the demo shop (marketing/demo_shop.py) into `social_commerce_demo`,
builds the frontend against a local API, starts that API, the built site
and a photo server on their own ports, then drives headless Chromium at
an iPhone's 390 x 844 at 3x (1170 x 2532 PNGs) through the customer's
order and the seller's view of it, in Khmer and in English:

    marketing/out/km/01_shop.png ... 09_notifications.png
    marketing/out/en/...
    marketing/out/video/{km,en}_customer.mp4, {km,en}_order_arrives.mp4  (--video)

Each picture is checked first: no console errors or failed requests, no
debug words on screen, no loading placeholders or toasts, and the Khmer
font (Noto Sans Khmer) loaded. The browser's clock is frozen and the new
order's times are set to demo_shop.ORDER_TIME, so a second run gives the
same pictures.
"""

import argparse
import base64
import functools
import http.server
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.request
from contextlib import ExitStack, contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
FRONTEND = BACKEND.parent / "frontend"
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import demo_shop  # noqa: E402

try:
    from playwright.sync_api import TimeoutError as PlaywrightTimeout
except ImportError:  # main() says how to install it
    PlaywrightTimeout = TimeoutError

API_PORT, WEB_PORT, PHOTO_PORT = 8011, 4180, 8091
API = f"http://localhost:{API_PORT}"
WEB = f"http://localhost:{WEB_PORT}"
PHOTOS = f"http://localhost:{PHOTO_PORT}"
SHOP = f"{WEB}/shop/{demo_shop.SLUG}"

VIEWPORT = {"width": 390, "height": 844}
SCALE = 3  # 1170 x 2532: sharp at 1080 x 1920
FPS = 30

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
# The few button words the steps look for (frontend/src/i18n/messages).
TEXT = {
    "km": {"buy_now": "ទិញឥឡូវនេះ", "place_order": "បញ្ជាក់ការកុម្ម៉ង់"},
    "en": {"buy_now": "Buy now", "place_order": "Place order"},
}
# Words that mean something leaked onto the screen.
DEBUG_WORDS = re.compile(
    r"\b(undefined|NaN|null|\[object|lorem|ipsum|todo|fixme|debug|test|perf)\b", re.IGNORECASE
)
# An order's row on the Orders tab (not "+ New order").
ORDER_ROW = "a[href*='/dashboard/orders/']:not([href$='/new'])"
# What on screen isn't finished yet: photos loading or still fading in
# (ProductImage fades them in once loaded), loading placeholders, toasts.
UNFINISHED = """() => {
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
    const toasts = [...document.querySelectorAll('[aria-live] > [role]')]
    const opacity = (img) => getComputedStyle(img).opacity
    return [
        ...photos.map((img) => `photo ${img.currentSrc || img.src} (opacity ${opacity(img)})`),
        ...placeholders.map(() => 'a loading placeholder'),
        ...toasts.map((t) => `toast "${t.textContent}"`),
    ]
}"""
TIMESTAMP = re.compile(r'"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))"')


class Failed(Exception):
    pass


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


def seed(photos: Path, serve_dir: Path) -> None:
    subprocess.run(
        [
            sys.executable,
            str(HERE / "demo_shop.py"),
            "--photos",
            str(photos),
            "--serve-dir",
            str(serve_dir),
            "--image-base",
            PHOTOS,
            "--quiet",
        ],
        cwd=BACKEND,
        check=True,
    )


# --- the browser -------------------------------------------------------------


class Shots:
    """One language's run: a customer's and a seller's phone."""

    def __init__(self, browser, lang: str, out: Path, moving: bool = False) -> None:
        self.browser = browser
        self.lang = lang
        self.out = out
        self.moving = moving  # filmed: real motion and typing, no screenshots
        self.problems: list[str] = []
        self.in_flight: set = set()  # requests the page is waiting on
        # API times stamped from here on are the new order's.
        self.started = datetime.now(UTC) - timedelta(seconds=5)

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
        context.clock.set_fixed_time(demo_shop.NOW)
        context.add_init_script(
            f"""try {{
                localStorage.setItem('sc.lang', {json.dumps(self.lang)});
                localStorage.setItem('sc.theme', 'light');
            }} catch {{}}"""
        )
        context.route(f"{API}/**", self.pin_times)
        page = context.new_page()
        page.on("console", self.console)
        page.on("pageerror", lambda e: self.problems.append(f"page error: {e}"))
        page.on("request", lambda r: self.in_flight.add(r))
        page.on("requestfinished", lambda r: self.in_flight.discard(r))
        page.on("requestfailed", self.request_failed)
        page.on(
            "response",
            lambda r: r.status >= 400 and self.problems.append(f"HTTP {r.status} {r.url}"),
        )
        return context, page

    def console(self, message) -> None:
        if message.type == "error":
            self.problems.append(f"console: {message.text}")

    def request_failed(self, request) -> None:
        self.in_flight.discard(request)
        # Navigating away cancels what was loading: not a problem.
        if "ERR_ABORTED" not in (request.failure or ""):
            self.problems.append(f"request failed: {request.url} {request.failure}")

    def pin_times(self, route) -> None:
        """The API's answers with the times stamped during this run (the
        new order's) set to demo_shop.ORDER_TIME, so they read the same
        every run."""
        response = route.fetch()
        if "json" not in response.headers.get("content-type", ""):
            return route.fulfill(response=response)
        pinned = demo_shop.ORDER_TIME.isoformat().replace("+00:00", "Z")

        def pin(match: re.Match) -> str:
            stamped = datetime.fromisoformat(match.group(1).replace("Z", "+00:00"))
            return f'"{pinned}"' if stamped >= self.started else match.group(0)

        route.fulfill(response=response, body=TIMESTAMP.sub(pin, response.text()))

    # --- waiting until the screen is finished --------------------------------

    def settle(self, page, name: str) -> None:
        # The app moves between pages without loading one, so the browser's
        # own "network idle" is long past: wait for its requests instead.
        quiet_since = time.monotonic()
        while self.in_flight or time.monotonic() - quiet_since < 0.5:
            if self.in_flight:
                quiet_since = time.monotonic()
            page.wait_for_timeout(50)
        page.evaluate("document.fonts.ready")
        try:
            page.wait_for_function(f"() => ({UNFINISHED})().length === 0", timeout=15_000)
        except PlaywrightTimeout:
            waiting = page.evaluate(UNFINISHED)
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
        if self.problems:
            raise Failed(f"{self.lang} {name}:\n  " + "\n  ".join(self.problems))

    def shot(self, page, name: str) -> None:
        self.settle(page, name)
        self.check(page, name)
        path = self.out / f"{name}.png"
        page.screenshot(path=path, animations="disabled", caret="hide", scale="device")
        print(f"  {path.relative_to(BACKEND)}", flush=True)

    def scroll_to(self, page, selector: str, offset: int = 0) -> None:
        """Puts `selector` near the top (under the header), without smooth scrolling."""
        page.evaluate(
            """([selector, offset]) => {
                const el = document.querySelector(selector)
                const top = el.getBoundingClientRect().top + scrollY - 72 + offset
                document.documentElement.style.scrollBehavior = 'auto'
                scrollTo(0, Math.max(0, top))
            }""",
            [selector, offset],
        )

    # --- the steps -------------------------------------------------------------

    def customer(self, page, type_slowly: bool = False) -> None:
        words, me = TEXT[self.lang], CUSTOMER[self.lang]
        options = next(p for p in demo_shop.CATALOG if p.get("options"))
        index = demo_shop.CATALOG.index(options)
        still = not self.moving

        page.goto(SHOP)
        if still:
            self.shot(page, "01_shop")
            self.scroll_to(page, "nav:has(a[href*='/category/'])", offset=-8)
            self.shot(page, "02_products")
        else:
            page.wait_for_timeout(1500)
            page.mouse.wheel(0, 500)
            page.wait_for_timeout(1500)

        page.locator(f"a[href$='/product/product-{index + 1}']").first.click()
        page.wait_for_url(f"**/product/product-{index + 1}")
        if still:
            self.shot(page, "03_product")
        else:
            page.wait_for_timeout(1500)

        option = page.locator("fieldset label").filter(has_text=re.compile(rf"^{options['pick']}$"))
        if still:
            self.scroll_to(page, "fieldset", offset=-160)
        else:
            option.scroll_into_view_if_needed()
            page.wait_for_timeout(600)
        option.click()
        if still:
            self.shot(page, "04_option")
        else:
            page.wait_for_timeout(1200)

        page.get_by_role("button", name=words["buy_now"]).click()
        page.wait_for_url("**/cart")
        page.wait_for_load_state("networkidle")
        delay = 70 if type_slowly else 0
        fields = (
            ("input[autocomplete=name]", me["name"]),
            ("input[autocomplete=tel]", me["phone"]),
            ("[autocomplete=street-address]", me["address"]),
        )
        for selector, value in fields[:2]:
            self.type_into(page, selector, value, delay)
        # Delivery (not pickup); the address box opens with it.
        page.locator("label:has(input[name=delivery-choice])").first.click()
        self.type_into(page, *fields[2], delay)
        page.locator("label:has(input[name=payment][value=cod])").click()
        page.evaluate("document.activeElement?.blur()")
        if still:
            self.scroll_to(page, "input[autocomplete=name]", offset=-75)
            self.shot(page, "05_checkout")
        else:
            page.wait_for_timeout(1500)

        page.get_by_role("button", name=re.compile(words["place_order"])).click()
        page.wait_for_url("**/order/**")
        if still:
            self.shot(page, "06_confirmation")
        else:
            page.wait_for_timeout(4000)

    @staticmethod
    def type_into(page, selector: str, value: str, delay: int) -> None:
        field = page.locator(selector).first
        field.scroll_into_view_if_needed()
        field.click()
        field.press_sequentially(value, delay=delay)

    def seller_login(self, context) -> None:
        response = context.request.post(
            f"{API}/api/v1/auth/login",
            data={"login": demo_shop.PHONE, "password": demo_shop.PASSWORD},
        )
        if not response.ok:
            raise Failed(f"seller login: HTTP {response.status} {response.text()}")
        context.add_init_script("try { localStorage.setItem('sc.session', '1') } catch {}")

    def seller(self, page) -> None:
        page.goto(f"{WEB}/dashboard/orders")
        new_order = page.locator(ORDER_ROW).first
        new_order.wait_for()
        self.shot(page, "07_dashboard")
        new_order.click()
        page.wait_for_url("**/dashboard/orders/*")
        self.shot(page, "08_order")
        # The open order is a focused screen: the bell is on the list.
        page.go_back()
        page.locator("a[href^='/dashboard/notifications']").first.click()
        page.wait_for_url("**/dashboard/notifications**")
        self.shot(page, "09_notifications")


def screenshots(browser, lang: str, out: Path) -> None:
    folder = out / lang
    shutil.rmtree(folder, ignore_errors=True)
    folder.mkdir(parents=True)
    run = Shots(browser, lang, folder)
    with ExitStack() as stack:
        customer, page = run.context()
        stack.callback(customer.close)
        run.customer(page)
        seller, page = run.context()
        stack.callback(seller.close)
        run.seller_login(seller)
        run.seller(page)


class Recorder:
    """Films a page with Chrome's screencast, at the phone's full
    resolution (Playwright's own videos are at 390 px wide), then makes an
    MP4 of it with ffmpeg, which CapCut takes."""

    def __init__(self, page, frames: Path) -> None:
        self.frames: list[tuple[float, Path]] = []  # (wall-clock time, JPEG)
        self.folder = frames
        frames.mkdir(parents=True)
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
        self.stopped = 0.0

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

    def save(self, mp4: Path, start: float | None = None) -> None:
        """30 frames a second from `start` (wall-clock; the first frame if
        None): Chrome sends a frame only when the screen changes, so each
        is held until the next."""
        import imageio_ffmpeg

        if not self.frames:
            raise Failed(f"no frames filmed for {mp4.name}")
        moment = self.frames[0][0] if start is None else max(start, self.frames[0][0])
        ffmpeg = subprocess.Popen(
            [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error"]
            + ["-f", "image2pipe", "-framerate", str(FPS), "-i", "-"]
            # Even sizes for H.264; 1080 wide, as CapCut's 1080p projects.
            + ["-vf", "scale=1080:-2,setsar=1", "-c:v", "libx264", "-pix_fmt", "yuv420p"]
            + ["-crf", "18"]
            + ["-movflags", "+faststart", str(mp4)],
            stdin=subprocess.PIPE,
        )
        shown = 0
        while moment <= self.stopped:
            while shown + 1 < len(self.frames) and self.frames[shown + 1][0] <= moment:
                shown += 1
            ffmpeg.stdin.write(self.frames[shown][1].read_bytes())
            moment += 1 / FPS
        ffmpeg.stdin.close()
        if ffmpeg.wait() != 0:
            raise Failed(f"ffmpeg couldn't make {mp4.name}")
        print(f"  {mp4.relative_to(BACKEND)}", flush=True)


def videos(browser, lang: str, out: Path) -> None:
    """The customer's order as they'd tap it, and the seller's Orders tab
    as it arrives (the tab looks for new orders every 30 s, so that clip
    starts a few seconds before the order shows)."""
    folder = out / "video"
    folder.mkdir(exist_ok=True)
    frames = folder / ".frames"
    shutil.rmtree(frames, ignore_errors=True)
    run = Shots(browser, lang, out, moving=True)

    seller, seller_page = run.context()
    run.seller_login(seller)
    seller_page.goto(f"{WEB}/dashboard/orders")
    seller_page.locator(ORDER_ROW).first.wait_for()
    arrives = Recorder(seller_page, frames / "seller")
    count = seller_page.locator(ORDER_ROW).count()

    customer, page = run.context()
    films = Recorder(page, frames / "customer")
    run.customer(page, type_slowly=True)
    films.stop()
    customer.close()

    seller_page.wait_for_function(
        f"document.querySelectorAll({json.dumps(ORDER_ROW)}).length > {count}",
        timeout=45_000,
        polling=100,
    )
    arrived = time.time()
    seller_page.wait_for_timeout(2500)
    seller_page.locator(ORDER_ROW).first.click()
    seller_page.wait_for_timeout(3000)
    arrives.stop()
    seller.close()
    if run.problems:
        raise Failed(f"{lang} video:\n  " + "\n  ".join(run.problems))

    films.save(folder / f"{lang}_customer.mp4")
    arrives.save(folder / f"{lang}_order_arrives.mp4", start=arrived - 3)
    shutil.rmtree(frames)


@contextmanager
def demo_servers(photos: Path, work: Path):
    """The built site, the API on the demo database and the photo server,
    running; yields a function that seeds the demo shop afresh."""
    busy = [port for port in (API_PORT, WEB_PORT, PHOTO_PORT) if not port_free(port)]
    if busy:
        raise Failed(f"ports in use: {busy} (another run still going?)")
    database_url = demo_shop.database_url(demo_shop.DEFAULT_DATABASE)  # refuses non-local
    build_site(work / "site")
    print("Seeding the demo shop ...", flush=True)
    seed(photos, work / "photos")
    with ExitStack() as stack:
        stack.enter_context(photo_server(work / "photos"))
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
        yield lambda: seed(photos, work / "photos")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--photos", type=Path, required=True, help="folder with the product photos")
    parser.add_argument("--video", action="store_true", help="also record MP4s")
    parser.add_argument("--lang", nargs="+", choices=("km", "en"), default=["km", "en"])
    parser.add_argument("--out", type=Path, default=HERE / "out", help="where the files go")
    args = parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:  # the import at the top failed too
        sys.exit("Playwright isn't installed: see the setup lines at the top of marketing/shots.py")
    photos = args.photos.expanduser().resolve()
    if not photos.is_dir():
        sys.exit(f"No such folder: {photos}")
    out = args.out.resolve()
    try:
        with ExitStack() as stack:
            reseed = stack.enter_context(demo_servers(photos, out / ".work"))
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch()
            stack.callback(browser.close)
            for lang in args.lang:
                print(f"Screenshots ({lang}):", flush=True)
                reseed()
                screenshots(browser, lang, out)
            for lang in args.lang if args.video else ():
                print(f"Videos ({lang}):", flush=True)
                reseed()
                videos(browser, lang, out)
    except Failed as error:
        sys.exit(f"Stopped: {error}")
    print(f"Done: {out}")


if __name__ == "__main__":
    main()
