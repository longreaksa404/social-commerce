# Performance Audit (pre-launch)

> **Phase 1 (audit) done 2026-10-09.** Phase 2 (fixes) waits for the
> founder's approval of the findings in section 4 and the device results
> (section 9). Nothing in the app has changed; the only code added is the
> audit's tooling in `backend/loadtest/` (`seed_perf.py`, `measure.py`,
> commit `77fbca2`).

---

## 1. How this was measured

- **Data:** `backend/loadtest/seed_perf.py` in a local database of its own
  (`social_commerce_perf`), never production. 20 shops; the big one,
  `perf-big`, has 500 products (a third with 2-4 options, 1-4 photos each),
  2,000 customers, 5,000 orders over a year (each with items, payment,
  delivery, a web and a Telegram notification row), 40 links with 21,000
  views. The other 19 shops have 25 products, 60 customers and 150 orders
  each, so every table also holds other shops' rows.
- **Backend:** `backend/loadtest/measure.py`: 30 timed requests per endpoint
  after 5 warm-ups. Counts SQL statements (from SQLAlchemy) and round trips to
  Postgres (a proxy counts each batch the driver sends that waits for an
  answer). Three setups:
  1. in-process on this laptop, Postgres on the same machine;
  2. the same with 2 ms added to every round trip (roughly Render to Neon;
     the real figure is unmeasured, section 8);
  3. the production Docker image limited to Render's free CPU (`--cpus 0.1`,
     512 MB), timed over HTTP.
- **Frontend:** the production build (Sentry on, as on Vercel) served with
  brotli like a CDN; stand-in photos at the sizes the app uploads (photo
  ~285 KB at 1600 px, small copy ~40 KB at 480 px, logo 13 KB). Lighthouse
  12.8 mobile (its default simulated Slow 4G + 4x CPU), 3 runs per page,
  median shown. Customer pages with an empty cache and storage; seller pages
  logged in with the HTTP cache emptied first. Request traces, WebKit and
  Chromium flows with Playwright (installed in a scratch folder, not added to
  the repo).
- **Caveats:**
  - This laptop (Intel Core Ultra 5 125U) is slow and its speed varies:
    bcrypt cost 12 takes 604 ms here vs ~250 ms on a typical server core, and
    Lighthouse's CPU benchmark read 790-1,940 between runs. Local
    `--cpus 0.1` is therefore **slower than Render's 0.1 CPU**: the
    2026-10-06 load test on this machine topped out at ~14.5 requests/s at
    0.1 CPU; today the same kind of load topped out at ~6. Treat the 0.1 CPU
    numbers as an upper bound, and compare before/after pairs.
  - The live site couldn't be checked from here: the office network
    intercepts TLS (04 Notes), so headers would show the proxy's, not
    Vercel's, Render's or R2's. Section 8 has the commands to run from home.
  - Lighthouse's login page did not paint in 3 of 5 headless runs (the other
    2 scored 86); it's on the device checklist instead.

---

## 2. Surface map

Every endpoint each page calls (from Playwright request traces and the
code). **Public** = no login (`/shop/{slug}/*`, rate limited 300/min per IP).

### Customer pages (all public)

| Page | Endpoints |
|---|---|
| Shop `/shop/:slug` (often with `?l=`) | `GET /shop/{slug}`, `GET /shop/{slug}/products` (every active product, no paging), `POST /shop/{slug}/track-view` (with `?l=`), `GET /shop/{slug}/orders/{id}?phone=` for up to 3 recent orders on the device (order bar) |
| Product `/shop/:slug/product/:slug` | `GET /shop/{slug}`, `GET /shop/{slug}/products/{slug}` (+ order bar) |
| Category `/shop/:slug/category/:slug` | `GET /shop/{slug}`, `GET /shop/{slug}/categories/{slug}` |
| Cart + checkout `/shop/:slug/cart` | `GET /shop/{slug}`, `GET /shop/{slug}/products/{slug}` per cart line (price/stock re-check), `POST /shop/{slug}/orders` |
| Order `/shop/:slug/order/:id` | `GET /shop/{slug}`, `GET /shop/{slug}/orders/{id}?phone=` (every 30 s while in progress), `POST /shop/{slug}/orders/{id}/paid` |
| Your orders `/shop/:slug/orders` | `GET /shop/{slug}`, `GET /shop/{slug}/orders/{id}?phone=` per order on the device |

Static: one JS file (all pages), one CSS file, two font files (Khmer,
Latin), photos from R2. The map (Leaflet) loads only when opened. No
third-party scripts on shop pages.

### Seller pages (login; session restore is `POST /auth/refresh`)

| Page | Endpoints |
|---|---|
| Every screen with the tab bar (layout) | `GET /seller/store`, `GET /seller/notifications/unread` (every 30 s), `GET /seller/account` (role), **`GET /seller/products`** (only to know whether the shop has a product, for the Settings tab's dot) |
| Orders (start page) | `GET /seller/orders?limit=50[&status=…]` (every 30 s) |
| Order detail | `GET /seller/orders/{id}`; `PATCH …/status`, `…/payment`, `…/delivery`, `POST …/cash-handover` |
| New order (from chat) | `GET /seller/products`, `GET /seller/customers?q=<phone>`, `GET /seller/customers/{id}`, `POST /seller/orders` |
| Customers / customer | `GET /seller/customers[?q=]`, `GET /seller/customers/{id}` |
| Products / product form | `GET /seller/products`, `GET /seller/categories`, `GET /seller/products/{id}`, `POST`/`PATCH /seller/products`, `POST /seller/products/{id}/images` |
| Categories | `GET`/`POST`/`PATCH`/`DELETE /seller/categories` |
| Links / link / new link | `GET /seller/links`, `GET /seller/links/{id}/stats`, `POST /seller/links` (+ products, categories) |
| Notifications | `GET /seller/notifications`, `POST /seller/notifications/read` |
| Settings | `GET /seller/store`, `GET /seller/account`, `PATCH /seller/store`, `POST /seller/store/logo`, Telegram link/disconnect, `/seller/staff`, `GET /seller/orders/export`, account endpoints |

Not called by the app: `GET /seller/stats` (kept for the future dashboard).
Auth pages: `POST /auth/login`, `/auth/register`, `/auth/phone-checks`,
`/auth/google`, `/auth/oauth/{provider}`, password reset.

---

## 3. Baseline

### 3.1 Backend, every endpoint

`perf-big`, 30 runs each. SQL counts every statement, including the 2 that
scope each tenant transaction to the shop ("RLS"). DB trips = round trips to
Postgres. Local = in-process on this laptop.

| Endpoint | Who | SQL (RLS) | DB trips | Size raw / gz (KB) | p50 / p95 local (ms) | p95 +2 ms/trip | p50 / p95 at 0.1 CPU |
|---|---|---|---|---|---|---|---|
| `GET /seller/store` | seller | 3 (2) | 8 | 1.3 / 0.7 | 14 / 16 | 39 | 101 / 190 |
| `GET /seller/account` | seller | 2 (0) | 7 | 0.1 / 0.1 | 13 / 16 | 37 | 102 / 190 |
| `GET /seller/orders` (All, 50) | seller | 9 (2) | 14 | 27.0 / 5.5 | 46 / 59 | 108 | 402 / 494 |
| `GET /seller/orders` (New) | seller | 9 (2) | 14 | 27.0 / 5.5 | 48 / 74 | 114 | 403 / 495 |
| `GET /seller/orders` (page 10) | seller | 9 (2) | 14 | 26.7 / 5.6 | 48 / 70 | 95 | 492 / 502 |
| `GET /seller/orders/{id}` | seller | 9 (2) | 14 | 2.4 / 0.9 | 29 / 37 | 80 | 300 / 390 |
| `GET /seller/customers` | seller | 5 (2) | 10 | 9.9 / 2.8 | 28 / 32 | 67 | 204 / 294 |
| `GET /seller/customers?q=` (name) | seller | 5 (2) | 10 | 9.7 / 2.8 | 31 / 39 | 68 | 208 / 297 |
| `GET /seller/customers?q=` (phone) | seller | 5 (2) | 10 | 0.2 / 0.2 | 30 / 36 | 63 | 199 / 288 |
| `GET /seller/customers/{id}` | seller | 11 (2) | 16 | 5.5 / 1.5 | 33 / 42 | 86 | 396 / 491 |
| `GET /seller/products` | seller | 4 (2) | 9 | **499.9 / 72.8** | 75 / 197 | 228 | **788 / 2,386** |
| `GET /seller/products/{id}` | seller | 4 (2) | 9 | 1.0 / 0.6 | 20 / 27 | 45 | 110 / 193 |
| `GET /seller/categories` | seller | 3 (2) | 8 | 1.7 / 0.5 | 14 / 17 | 41 | 107 / 189 |
| `GET /seller/links` | seller | 7 (2) | 12 | 12.2 / 3.2 | 60 / 68 | 98 | 251 / 357 |
| `GET /seller/links/{id}/stats` | seller | 12 (2) | 17 | 19.4 / 4.4 | 52 / 56 | 119 | 498 / 593 |
| `GET /seller/notifications` | seller | 4 (2) | 9 | 6.0 / 1.7 | 22 / 29 | 50 | 190 / 200 |
| `GET /seller/notifications/unread` | seller | 3 (2) | 8 | 0.0 / 0.0 | 17 / 19 | 41 | 102 / 188 |
| `GET /seller/staff` | seller | 1 (0) | 6 | 0.0 / 0.0 | 11 / 14 | 30 | 98 / 102 |
| `GET /seller/stats?period=month` | seller | 4 (2) | 9 | 0.7 / 0.3 | 20 / 23 | 51 | 200 / 297 |
| `GET /seller/orders/export` (this month, 1,075 orders) | seller | 10 (2) | 15 | 57.2 / 54.7 | **280 / 456** | 463 | **3,099 / 5,193** |
| `GET /seller/orders/export` (a year, 4,975 orders) | seller | 37 (2) | 42 | 483.9 / 457.9 | **3,180 / 3,434** | 3,457 | **~36,400** (p50) |
| `PATCH /seller/orders/{id}/status` (accept) | seller | 12 (4) | 22 | 1.3 / 0.7 | 45 / 57 | 166 | 395 / 412 |
| `PATCH /seller/orders/{id}/payment` | seller | 12 (4) | 22 | 2.0 / 0.9 | 45 / 53 | 165 | 390 / 399 |
| `PATCH /seller/orders/{id}/delivery` | seller | 12 (4) | 22 | 1.6 / 0.8 | 45 / 69 | 161 | 370 / 404 |
| `POST /seller/orders/{id}/cash-handover` | seller | 13 (4) | 23 | 2.0 / 0.9 | 47 / 68 | 166 | 393 / 502 |
| `POST /seller/orders` (from chat) | seller | 22 (4) | 32 | 1.2 / 0.6 | 64 / 71 | 229 | 590 / 699 |
| `POST /seller/notifications/read` | seller | 4 (2) | 9 | 0.0 / 0.0 | 18 / 25 | 58 | 111 / 186 |
| `PATCH /seller/products/{id}` | seller | 5 (2) | 10 | 0.8 / 0.5 | 20 / 27 | 56 | 189 / 201 |
| `POST /seller/products` | seller | 4 (2) | 9 | 0.3 / 0.2 | 18 / 26 | 54 | 114 / 200 |
| `PATCH /seller/store` | seller | 4 (2) | 9 | 1.1 / 0.6 | 18 / 29 | 53 | 109 / 195 |
| `POST /seller/links` (existing) | seller | 5 (2) | 10 | 0.3 / 0.2 | 17 / 21 | 56 | 199 / 296 |
| `GET /shop/{slug}` | customer, public | 4 (2) | 14 | 1.4 / 0.5 | 21 / 34 | 75 | 151 / 200 |
| `GET /shop/{slug}/products` | customer, public | 5 (2) | 15 | **165.0 / 31.5** | 66 / 199 | 264 | **693 / 2,593** |
| `GET /shop/{slug}/products/{slug}` | customer, public | 6 (2) | 16 | 0.7 / 0.4 | 23 / 30 | 80 | 248 / 304 |
| `GET /shop/{slug}/categories/{slug}` | customer, public | 6 (2) | 16 | 13.8 / 3.0 | 27 / 33 | 91 | 298 / 302 |
| `GET /shop/{slug}/orders/{id}?phone=` | customer, public | 10 (2) | 20 | 1.9 / 0.7 | 35 / 41 | 103 | 388 / 408 |
| `POST /shop/{slug}/orders` | customer, public | 19 (4) | 34 | 0.8 / 0.5 | 63 / 81 | 215 | 510 / 609 |
| `POST /shop/{slug}/track-view` | customer, public | 4 (2) | 14 | 0.0 / 0.0 | 18 / 26 | 66 | 106 / 196 |
| `POST /shop/{slug}/orders/{id}/paid` | customer, public | 9 (2) | 19 | 0.0 / 0.0 | 34 / 63 | 103 | 294 / 386 |
| `POST /auth/login` | auth | 3 (0) | 8 | 0.3 / 0.3 | 586 / 715 | 691 | 6,164 / 6,497 |
| `POST /auth/refresh` | auth | 5 (0) | 10 | 0.3 / 0.3 | 27 / 32 | 60 | 175 / 248 |

What the numbers say:

- **No N+1 anywhere.** Statement counts don't grow with the page: 50 orders
  take 9 statements, as does one. The year export's 37 are relationship
  loads in batches of 500 ids.
- **At 0.1 CPU, latency comes in ~100 ms steps.** The CPU quota is handed
  out in 100 ms slices, so any request needing more than ~10 ms of CPU waits
  for the next slice. Even `GET /seller/staff` (1 query) takes ~100 ms there.
  CPU per request decides speed on the free plan.
- **Round trips:** every pooled connection checkout costs 3 trips for
  SQLAlchemy's pre-ping (it wraps the ping in BEGIN/ROLLBACK), and every
  tenant transaction 2 more for the RLS settings plus BEGIN and
  COMMIT/ROLLBACK. A shop page (`GET /shop/{slug}`) makes 14 trips for 2
  real queries, because it opens two sessions (find the shop by slug, then
  the shop-scoped one). This only matters with distance to the database
  (column "+2 ms/trip"); CPU difference measured within noise.
- Login is bcrypt cost 12 by design (in a thread since 2026-10-06).

### 3.2 Database

`EXPLAIN ANALYZE` as `app_user` with the tenant set (so RLS applies):

| Query | Time | Plan |
|---|---|---|
| Orders page (50 newest) | 0.8 ms | index `(store_id, number)` |
| Orders by status | 0.4 ms | index `(store_id, status)` |
| Order counts per status | 2.3 ms | index-only `(store_id, status)`, 5,070 rows |
| Order items for 50 orders | 0.8 ms | index `(store_id, order_id)` per order |
| Customers page (with order count, last order) | 9.4 ms | aggregates all 5,070 orders, then sorts |
| Links counts | 19.5 ms | seq scan of 21,000 link events (grows with views) |
| Unread count (the bell, every 30 s) | 3.9 ms | seq scan of the notification log |
| "Customer says paid" lookup (every order view/change) | 3.9 ms | scans the shop's 11,000 notification rows, filtering JSON |
| Shop product cards | 1.2 ms | 496 rows |
| Next order number (checkout) | 0.06 ms | index-only, backward |

- **RLS is evaluated once per query, not per row**: the policy shows as a
  "One-Time Filter"; inside joins it becomes an index key
  (`store_id = current_setting(...)`), which is cheap.
- Every tenant table has indexes leading with `store_id` for its filters and
  sort orders. Six foreign keys have no index *leading* with the key column
  (`product.category_id`, `product_variant.product_id`,
  `order.customer_id`, `order_item.order_id`, `order_item.product_id`,
  `link_event.link_id`), but each has a `(store_id, key)` index, and every
  runtime query filters by `store_id`. Only parent deletes would scan:
  deleting a category, and the founder's `erase-shop`. Not worth an index
  now.
- Setting the tenant costs 2 statements (`SET LOCAL ROLE`, `set_config`) per
  transaction: ~0.4 ms locally, 2 trips on Neon.
- Pool: SQLAlchemy defaults (5 + 10 overflow, 30 s wait), `pool_pre_ping`.
  Neon **direct** connection (04 Notes: asyncpg's prepared statements break
  through Neon's pooler; staying direct is right).

### 3.3 Burst test (local only)

50 customers arriving in one shop at the same moment; each opens the link,
views 1-3 products (2-5 s between taps), 30% order (pickup, cash). 3
minutes. Locust from `backend/loadtest/.venv` with a burst scenario kept in
a scratch folder (the repo's `locustfile.py` reads your load-test shop's
`.shop.json`, which I didn't touch).

| Setup | Requests | Failed | Median | p95 | Max | Notes |
|---|---|---|---|---|---|---|
| 500-product shop, full laptop CPU | 3,958 | 4 (0.1%) | 32 ms | 337 ms | 2.3 s | 4 "connection reset" on reused keep-alive connections; 1 lock-wait sample in ~360 |
| 500-product shop, 0.5 CPU (Render Starter) | 3,401 | 5 | 410 ms | 1.7 s | 5.4 s | place order p95 2.9 s; no pool errors |
| 500-product shop, 0.1 CPU (Render free) | 604 | 8 | 10.1 s | 27.8 s | 49 s | **4 × 500: DB pool exhausted** (`QueuePool limit of size 5 overflow 10 reached … timeout 30`); 35 lock-wait samples (checkout store lock) |
| 25-product shop, 0.1 CPU | 1,118 | 0 | 5.4 s | 12.9 s | 25 s | saturated at ~6 requests/s |

**Flash checkout:** 50 orders sent at the same instant, plus 50 product
reads. Every order succeeded (no stock or numbering error), but checkouts
run one at a time (the store row lock, 04 Notes) and **hold a DB connection
while they wait**, so the reads queue for a connection too:

| CPU | All done | Orders p95 | Reads p95 |
|---|---|---|---|
| Full laptop CPU | 2.8 s | 2.7 s | 2.2 s |
| 0.5 | 4.6 s | 4.5 s | 3.7 s |
| 0.1 | 31.7 s | 31.3 s | 27.3 s (the pool gives up at 30 s) |

### 3.4 Frontend

**JavaScript per route** (production build, Sentry on as on Vercel):

| Route | JS files | JS gzipped | Seller dashboard code included |
|---|---|---|---|
| Any shop page | 1 | 254.5 KB (Vite reports 262.4 KB; brotli as served ~210 KB) | yes, all of it |
| Login, dashboard | 1 | the same file | — |

No route is code-split (only the map is). Lighthouse counts 115-120 KB of
unused JS on every shop page. Largest parts (minified): react-dom 203 KB,
dashboard code 144 KB, translations 126 KB (both languages, every area),
react-router 95 KB, shop code 73 KB, Sentry 86 KB, legal pages' text 23 KB,
TanStack Query 38 KB.

Experiment in a scratch copy (not the app): with the dashboard and the
login / sign-up / legal pages loaded per route, shop pages need **208 KB**
gzipped; with Sentry also loaded after the page shows, **179 KB** (−30%).
Under 150 KB would also need the translations split by area (estimated
~150-155 KB).

**Lighthouse mobile** (median of 3; score range in brackets):

| Page | Score | FCP | LCP | TBT | CLS | Weight | LCP element / what delays it |
|---|---|---|---|---|---|---|---|
| Shop, 500 products (cold, `?l=`) | **37** (35-39) | 2.6 s | 5.9 s | 2,900 ms | 0 | 998 KB (JS 210, font 89, photos 515, API 172) | first grid photo, `loading="lazy"`; waits 4.6 s to start |
| Shop, 25 products (cold) | 61 (54-63) | 2.6 s | 6.5 s | 291 ms | 0 | 1,265 KB (photos 944) | first grid photo, lazy; waits 5.1 s |
| Product (2 photos) | 57 (56-58) | 2.2 s | 5.3 s | 661 ms | 0 | 881 KB (photos 567) | first photo (eager, high priority); waits 4.2 s for JS, then API |
| Product with options | 58 (55-60) | 2.2 s | 4.6 s | 786 ms | 0 | 606 KB | first photo |
| Category | 53 (48-56) | 2.6 s | 6.7 s | 458 ms | 0 | 1,349 KB | first grid photo, lazy; waits 5.5 s |
| Cart + checkout (2 items) | 63 (62-65) | 2.6 s | 3.4 s | 817 ms | 0 | 408 KB | text, after data |
| Order page | 68 (66-71) | 2.6 s | 3.1 s | 591 ms | 0 | 327 KB | text, after data |
| Login | 86 in 2 of 5 runs | — | — | — | — | — | did not paint in 3 headless runs |
| Dashboard: Orders | **46** (43-58) | 2.5 s | 6.5 s | 1,097 ms | 0 | 911 KB (**API 548**) | an order row's photo (lazy) |
| Dashboard: order detail | 52 (49-56) | 2.3 s | 6.5 s | 870 ms | 0 | 912 KB (API 549) | "To do" heading, after data |
| Dashboard: new order | 58 (58-64) | 2.3 s | 6.2 s | 600 ms | 0.019 | 855 KB (API 531) | text, after data |
| Dashboard: Products | **38** (38-43) | 2.5 s | 9.9 s | 1,515 ms | 0 | 2,160 KB (photos 1,324, API 524) | first grid photo (lazy); 7.1 s of script rendering 500 cards |

Lighthouse also flags `preconnect` to the API and photo hosts (~150 ms
each under its throttling) and the one CSS file as render-blocking (12 KB,
normal).

**Request traces** (Playwright, phone size):

- Customer opening the shop link cold: 23 requests, 1,033 KB (JS 210, CSS
  12, fonts 89, API 167 of which the product list 165, photos 555 for 15
  small copies). Scrolling the grid: 42 more small copies, 1.6 MB. All grid
  photos are the ~40 KB small copies; lazy loading works.
- A product with 4 photos downloads **all 4 full-size photos (1.1 MB) on
  open**: photos 2-4 are lazy, but inside the swipe gallery the browser
  loads them at once, competing with photo 1 (the LCP).
- A seller session of 9 in-app screens (open dashboard, an order, back,
  Products, a product, back, Customers, a customer, Links, Settings, Orders)
  downloaded `GET /seller/products` (511 KB) **5 times (2.6 MB)**,
  `GET /seller/store` 11 times and `GET /seller/account` 6 times. The tab bar
  remounts when you come back from a full-screen page, and `useSetup()`
  (`dashboard/settings/setup.ts`) asks for the whole product list to know if
  there is at least one product; queries have no `staleTime`, so every mount
  refetches.
- Polling: the Orders tab refetches its first page (26 KB) and the bell every
  30 s while visible, as designed.

**Status changes:** tapping Accept shows the button's spinner after **9 ms
(Chromium) / 13 ms (WebKit)**; the order moves on screen when the server
answers (~460-500 ms with a simulated 400 ms server). Meets the 100 ms
target.

**Images:** phones shrink photos to 1600 px JPEG (~300 KB) before upload and
make a ~480 px copy (~40 KB) that grids and lists use (04, 2026-10-04).
Uploads set no `Cache-Control` on R2 objects (`services/images.py` signs only
type and size); what `images.oaksolve.com` sends is unverified (section 8).
JPEG only (WebP would be smaller, but Safari's canvas can't encode WebP
everywhere: not proposed).

**Fonts:** Kantumruy Pro, self-hosted, split by `unicode-range` (Khmer 57 KB,
Latin 33 KB), `font-display: swap`, CLS 0 on every page. Fine.

### 3.5 Cold start (API)

At 0.1 CPU locally the container answered `/health` **105 s** after start:
`alembic upgrade head` with nothing to do took **21 s**, `import app.main`
**47 s** (boto3 + sentry_sdk alone ~11 s; boto3 is ~15% of the import time
and is only needed to sign uploads). Render's own wake-up comes on top and
is unmeasured from here; per 04, the cron-job.org ping keeps it awake
7:00-midnight.

---

## 4. Findings, ranked by measured impact

Effort in hours; risk low / med / high. None needs a migration unless said.
Only F3 needs money, and it is not implemented without your decision.

| # | Finding | Who | Measured | Proposed fix | Effort | Risk | Migr. | Money |
|---|---|---|---|---|---|---|---|---|
| F1 | Dashboard downloads the whole product list on open and again on most screens | Seller; iOS + Android | 511 KB (73 KB gz) per fetch, 5× in 9 screens = 2.6 MB; 0.8-2.4 s server CPU each at 0.1 CPU (slowing every shop meanwhile); Orders page Lighthouse 46 with 548 KB of API | `useSetup()` stops refetching the list on every mount (`staleTime` on that query, `select` a yes/no); first load still fetches once | 1 | low | no | no |
| F2 | One JS file for every page: customers download the whole seller dashboard and Sentry before the shop shows | Customer (first visit, cold); both | 254.5 KB gz on every shop page, ~120 KB unused; split experiment: 208 KB (routes), 179 KB (+ Sentry after first paint) | Load dashboard and auth/legal pages per route (React Router `lazy`), reload once if a chunk is missing after a deploy; start Sentry after the first render | 3-4 | med | no | no |
| F3 | Render's free CPU can't absorb a burst: pool runs out, 500 errors | Customer + seller; both | 50 customers at once, 0.1 CPU: median 10 s, p95 28 s, 4 × 500 (pool timeout); 25-product shop: p95 12.9 s. At 0.5 CPU: p95 1.7 s, no pool errors | **Render Starter, $7/month** (5× CPU). Code fixes F1 and F7 (and F8, if chosen) lower CPU per visit but won't reach the target on 0.1 | 0 (plan switch) | low | no | **$7/month** |
| F4 | API answers aren't compressed by the app | Both; both | Shop product list 165 → 31.5 KB with gzip; seller list 500 → 73 KB; orders 27 → 5.5 KB. gzip level 5 costs ~2 ms (shop list) / ~8 ms (seller list) of CPU at full speed. On Slow 4G, 165 KB ≈ 0.8 s vs 0.15 s. **Live unverified** (Render's edge may already compress: command in section 8) | Starlette's `GZipMiddleware` (built in, no new dependency), level 5, from 1 KB. Only if your curl shows no `content-encoding` | 0.5 | low | no | no |
| F5 | First grid photos are lazy-loaded though one is the page's main image (LCP) | Customer (also seller lists); both | Shop LCP 5.9-7.2 s, of which 4.6-5.5 s waiting for the photo to start; 25-product shop: 5.1 of 6.5 s; category page 5.5 of 6.7 s | Pass the existing `eager` to the first ~4 cards of `ProductGrid` (and first rows of the seller's lists) | 0.5 | low | no | no |
| F6 | Product page downloads every full-size photo at once | Customer; both | 4-photo product: 1.1 MB on open; photo 1 (LCP) shares the bandwidth; product LCP 5.3 s | `fetchpriority="low"` on photos 2+ (photo 1 already high), so photo 1 goes first | 0.5 | low | no | no |
| F7 | Exporting orders freezes the whole API while it runs | Everyone (one server for all shops); seller waits too | This month (1,075 orders): 0.28 s local, **3.1-5.2 s at 0.1 CPU**; a year (4,975): 3.2 s local, **~36 s at 0.1 CPU**, all on the event loop (2.3 s building ORM objects + 1.1 s writing the file, local) | Build the file in a worker thread and load only the columns it needs (one query, no ORM objects); same file contents | 2-3 | low-med | no | no |
| F8 | Shop and seller grids render every product at once | Customers of big shops, sellers with many products; Android low-end most | 500 products: shop TBT 2.9-3.8 s (25 products: 0.29 s); seller Products 7.1 s of script, TBT 1.5 s | Render cards as you scroll. **Needs a layout decision:** the photo wall uses CSS columns, which fill column by column (with 500 products the right column starts around #250), so adding cards while scrolling would reshuffle what's on screen. Rows, or columns filled left-right-left, would allow it | 3-5 | med | no | no |
| F9 | Seller screens refetch the shop and account on every screen | Seller; both | `GET /seller/store` 11× and `/seller/account` 6× in 9 screens; ~100-200 ms server each at 0.1 CPU (UI doesn't wait: cached data shows) | `staleTime` (e.g. 5 min) on store, account and categories: only the seller changes them, and saves already update the cache | 0.5 | low | no | no |
| F10 | Slow cold start | First visitor after the API sleeps (0:05-7:00), after deploys; Telegram webhook | 105 s locally at 0.1 CPU: no-op migration 21 s, imports 47 s (boto3 ~15%) | Import boto3 only when signing an upload (−~15% of import time). Skipping the no-op migration is a deploy-script change: defer to the paid plan's pre-deploy step (already planned in 04) | 0.5 | low | no | no |
| F11 | Checkouts in one shop run one at a time and hold DB connections while waiting | Customers in a flash sale | 50 at the same instant: last order after 2.8 s (full CPU) / 31.7 s (0.1 CPU); reads wait for connections up to 27.7 s. Normal burst: 1 lock wait in ~360 samples | Order numbers from a per-shop counter and a customer upsert instead of locking the store row. Changes checkout's concurrency design: **defer** until a flash sale happens (04 says "fine at MVP volume") | 4-6 | high | yes | no |
| F12 | 3 round trips per DB session for the pool's ping, 2 per transaction for RLS | Both; both | Shop page 14 trips for 2 queries; checkout 34. +2 ms per trip adds 40-130 ms. CPU effect within noise | One statement for both RLS settings; ping only connections idle for a while. Touches the RLS hook: **measure the real Render→Neon latency first** (section 8); worth it only above ~3 ms | 2 | med | no | no |
| F13 | Notification and link counts scan more rows as the shop grows | Seller | Bell count 3.9 ms (every 30 s), "customer says paid" 3.9 ms (every order view/change), Links 19.5 ms; they grow with orders and views (rows are never deleted) | Partial index for unread web notifications; expression index for the paid claim; covering index for link counts. **Defer** until a shop has ~20k orders | 1 | low | yes | no |
| F14 | Keep-alive "connection reset" under load | Both | 4 of 3,958 requests locally (5 of 3,401 at 0.5 CPU): uvicorn closes an idle connection after 5 s as the client reuses it | `--timeout-keep-alive` longer than Render's proxy's. **Defer** to the live load test (04 already says: raise it if the live test shows 502s) | 0.25 | low | no | no |
| F15 | Seller list/detail endpoints over 300 ms at 0.1 CPU | Seller | Orders 400-500 ms, order 300-390, customer 400-490, link stats 500-590 at 0.1 CPU; 30-60 ms at full CPU | Starter (F3) solves it; trimming ORM work is possible later. **Defer** | — | — | no | — |
| F16 | Inputs drop to 14 px from 640 px wide, so an iPhone in landscape zooms on focus | Customer, seller; iOS | Code: `components/ui.tsx` input class `sm:text-sm`; every iPhone is ≥640 px wide in landscape. Unmeasured on a device | Keep 16 px up to `lg`; checklist step 5 confirms first | 0.25 | low | no | no |
| F17 | Blurred, see-through fixed bars over long scrolling lists | Both; older iPhones, low-end Android | Code: `backdrop-blur` on the shop header, dashboard header and tab bar, pinned bars. Unmeasured: headless Chromium draws in software | Only if the device checklist shows scroll jank: opaque bars (a visual change, your call) | 0.5 | low | no | no |

Things I'd **not** do:

- **Optimistic status changes:** the spinner already shows in ~10 ms, and
  the app deliberately takes the next allowed steps from the server
  (`next_statuses`) instead of copying the state machines (CODEBASE §4). An
  optimistic update would have to copy them.
- **Lower bcrypt's cost** to speed up login (6 s at 0.1 CPU): security over
  a once-a-week wait.
- **Raise the DB pool size:** at 0.1 CPU the pool runs out because requests
  wait for CPU while holding connections; more connections would only queue
  more work.

---

## 5. Targets: which are realistic here

| Target | Today | Verdict |
|---|---|---|
| Reads p95 < 300 ms warm | Met locally (except export and the 500-product lists at ~200 ms). At 0.1 CPU: lists and details 300-600 ms, product lists 2.4-2.6 s | Realistic on Starter; **not on the free plan** with a 500-product shop |
| Writes < 500 ms | Locally ≤ 81 ms. At 0.1 CPU: checkout 510-609 ms, chat order 590-699 ms | Realistic on Starter; borderline on free |
| ≤ 10 queries per request | Reads: all ≤ 10 except customer page 11, link stats 12 (both counting the 2 RLS statements). Writes 12-22 | **Unrealistic for writes**: checkout has ~15 statements of real work (inserts, stock per line). Suggest ≤ 10 for reads, and track round trips |
| Customer LCP < 2.5 s cold, throttled | 3.1-7.2 s; FCP alone 2.2-2.6 s (HTML, then 210 KB JS, CSS, fonts) | **Unrealistic for a client-rendered app** on Lighthouse's Slow 4G: the photo's address comes from the API after the JS runs. After F2, F4, F5, F6 I'd expect ~4 s. Under 2.5 s needs the shop pages prerendered on the server (an architecture change, not proposed) |
| Customer route JS < 150 KB gz, no dashboard code | 254.5 KB, all dashboard code | F2 gets 179 KB and no dashboard code; 150 KB also needs translations split by area (another ~3-4 h) |
| Seller Lighthouse ≥ 85 | 38-58 | **Unrealistic** under Lighthouse's default throttling for this dashboard (API data before content); after F1, F2, F4, F5 I'd expect ~65-75. Suggest 70 |
| Seller first-route JS < 200 KB gz | 254.5 KB | About at the line with F2 including the deferred Sentry: ~179 KB shared + ~20 KB of Orders-page chunks (estimate) |
| Burst: 50 customers, no errors, p95 < 1 s | Full CPU: p95 337 ms, 4 resets. 0.1 CPU: p95 28 s, 500s. 0.5 CPU: p95 1.7 s | **Not on the free plan.** Starter + F1/F4/F7 is the realistic route; re-test |
| Status change visible < 100 ms | 9-13 ms (spinner) | **Met** |

---

## 6. Checked and fine

- No N+1 queries; paging exists where lists grow (orders, customers,
  notifications); links (200), a customer's orders (100) and a link's
  orders (100) are capped.
- RLS policy evaluated once per query; tenant indexes lead with `store_id`;
  tenant isolation unaffected by anything proposed here.
- Blocking work: bcrypt in a thread; R2 signing is local (no network) with a
  cached client; Telegram and Google calls are async or in a thread; only the
  export blocks (F7).
- CLS ≈ 0 on every page; no third-party scripts on shop pages; the map loads
  only when opened; Google's script only on the login pages.
- WebKit (iPhone 13 profile) and Chromium (Pixel 7 profile): shop, product,
  add to cart, checkout, order page, seller login, orders, order detail and
  Accept all work, no console errors, no sideways scroll.
- Grids and lists use the ~40 KB small photo copies; lazy loading works
  below the fold.

---

## 7. iOS and Android

**Minimum versions the build supports: iOS / iPadOS 16.4 and Android
Chrome / WebView 111** (both March 2023). Vite 8 targets `chrome111`,
`safari16.4`, `ios16.4` (its default, `baseline-widely-available`), and
Tailwind 4's CSS targets Safari 16.4, Chrome 111, Firefox 128. Every in-app
browser on iPhone (Facebook, TikTok, Instagram, Telegram) uses the iPhone's
own WebKit, so the iOS version is what matters there. Phones stuck on iOS
15 (iPhone 6s, 7, SE 1st gen) are unsupported: colours with transparency,
shadows and the chosen-option highlight at checkout (`:has()`) may not show.
Worth knowing for second-hand iPhones in Cambodia; the device checklist asks
for the iOS version.

Code review for Safari and in-app browsers:

| Concern | Finding |
|---|---|
| Viewport height jumping with the toolbar | `min-h-dvh` (only a minimum, no jump); `h-dvh` only on the laptop sidebar. Fine |
| Inputs under 16 px (zoom on focus) | 16 px on phones in portrait; 14 px from 640 px, i.e. iPhone landscape (F16) |
| Fixed / sticky bars with the keyboard open | Pinned bars (Place order, Save, Add to cart) are `position: fixed` at the bottom. Android in-app browsers (Facebook, Instagram) resize the page for the keyboard, so the bar can sit on the keyboard over the field being typed in; iOS can briefly float it mid-screen while scrolling. Unmeasured: checklist step 5 |
| Safe-area insets | Top inset on sticky headers, bottom on every fixed bar. Fine |
| Scroll containers | One horizontal photo gallery per product; no nested vertical scrollers on phones |
| Heavy effects on long lists | `backdrop-blur` on headers and bars over long lists (F17); one CSS animation per grid card, staggered for the first 8 only; reduced motion respected |
| Hover-only interactions | None found (hover is decoration only) |
| Image formats | JPEG everywhere; uploads accept JPEG/PNG/WebP (iOS 14+ shows WebP). HEIC is converted when the browser can decode it |
| Browser features | Web Locks has a fallback; `navigator.share` / `clipboard` used with fallbacks; `crypto.randomUUID`, `findLast`, `Object.hasOwn`, `<dialog>` all within iOS 16.4. In-app browsers: Save QR code (download on Android) and opening Telegram need a device check (checklist steps 6-7) |
| Local dev in Safari | Safari doesn't keep `Secure` cookies on `http://localhost`, so a reload logs you out on the dev server (dev only; live is https) |

Playwright isn't in the repo, so these runs used a copy in a scratch
folder (as earlier sessions did); nothing was added to `package.json`.

---

## 8. Infrastructure (report only, nothing changed)

| Item | What's known | Unverified, command to run from home |
|---|---|---|
| Render | Free plan, Singapore (`render.yaml`); 0.1 CPU, 512 MB; sleeps after 15 min, kept awake 7:00-midnight by cron-job.org (04) | Cold start: after 0:15, with no visits for 20 min: `curl -s -o /dev/null -w "%{time_total} s\n" https://api.oaksolve.com/health` |
| Neon | Free plan, Singapore (04), direct connection; compute sleeps after 5 min idle (its wake-up adds to the first query) | Render→Neon latency can't be read without a shell on Render. Same region, so ~1-2 ms per round trip is expected |
| API compression | The app sends none (measured). Render's edge may compress | `curl -s -o /dev/null -D - -H "Accept-Encoding: gzip, br" https://api.oaksolve.com/api/v1/shop/<your-shop>/products \| grep -iE "content-encoding\|content-length\|cf-cache-status"`: no `content-encoding` line → F4 applies |
| Vercel static assets | `vercel.json` sets no cache header for `/assets/*` (hashed file names) | `curl -sI "https://order.oaksolve.com$(curl -s https://order.oaksolve.com/ \| grep -o '/assets/index-[^"]*\.js')" \| grep -iE "cache-control\|x-vercel-cache\|content-encoding"`: if it says `max-age=0`, repeat visits re-check every file (one round trip each); a year with `immutable` for `/assets/` is a 5-line `vercel.json` change |
| R2 photos | Uploaded without `Cache-Control` | `curl -sI <a photo URL from your shop> \| grep -iE "cache-control\|cf-cache-status\|age"` |
| Live Lighthouse (customer) | — | Paste `https://order.oaksolve.com/shop/<your-shop>` into https://pagespeed.web.dev (mobile), or `npx lighthouse https://order.oaksolve.com/shop/<your-shop> --only-categories=performance --output=html --output-path=./lh-shop.html` |

Send me the output lines; I'll add them here.

---

## 9. Manual device checklist

**Phones:** one iPhone and one Android phone. Note the model, iOS / Android
version, and network (4G or Wi-Fi). Use 4G for at least one full pass.

**Browsers:** on each phone, Safari (iPhone) or Chrome (Android), and the
in-app browsers of Facebook, TikTok and Instagram: post or message your
shop link to yourself and tap it there. Use your own test shop on the live
site (the 500-product shop exists only in the lab).

| # | Flow | Watch for |
|---|---|---|
| 1 | Tap your shop link in Facebook / TikTok / Instagram (first time, or after clearing data) | Seconds until products show (count). Blank white screen? Photos appear in place or jump? Header stays put? Sideways scroll? |
| 2 | Scroll the shop to the bottom and back | Smooth or stuttering, especially under the top header. Photos fill in while scrolling? |
| 3 | Open a product with several photos; swipe through them | Seconds until the first photo shows. Swipe smooth? The pinned Add to cart bar stays at the bottom? |
| 4 | Tap + on a grid photo, then Add to cart on a product | Photo flies into the cart smoothly; the cart bar appears; Android vibrates |
| 5 | Cart: type name, phone and address with the keyboard open; tap a field again after scrolling; turn the iPhone sideways and tap a field | Page zooms in on tap (iPhone, also in landscape)? Does the Place order bar sit over the field you're typing in? Page jumps when the keyboard opens or closes? Map opens and moves smoothly? |
| 6 | Place order (KHQR), then on the order page: Save QR code, I've paid | Seconds from tap to the order page; confetti smooth. Save QR: iPhone share sheet → Photos; Android: does the file save inside Facebook/Instagram/TikTok? I've paid opens Telegram? |
| 7 | Open the order link again later from Telegram's in-app browser | Loads without asking for the phone on the same phone; updates by itself within 30 s after you change it in the dashboard |
| 8 | Seller: open the dashboard on 4G (logged in from before, after an hour away) | Seconds until the order list shows; bell count; scroll the list under the tab bar: smooth? |
| 9 | Seller: open a new order → Accept → Delivered, cash received → Complete | Button reacts instantly on tap; seconds until each step shows; confetti; vibration on Android |
| 10 | Seller: Products tab, scroll the photo wall; open a product, take a photo with the camera, Save | Scroll smoothness; seconds for the photo to upload on 4G; Save bar with the keyboard open |

**Results** (fill in: ✅ fine, ⚠️ slow/odd + seconds or a short note, ❌ broken):

| # | iPhone Safari | iPhone Facebook | iPhone TikTok | iPhone Instagram | Android Chrome | Android Facebook | Android TikTok | Android Instagram |
|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |
| 4 | | | | | | | | |
| 5 | | | | | | | | |
| 6 | | | | | | | | |
| 7 | | | | | | | | |
| 8 | | | | | | | | |
| 9 | | | | | | | | |
| 10 | | | | | | | | |

Phones used: iPhone ___ (iOS ___), Android ___ (Android ___, Chrome ___).

---

## 10. Phase 2: before and after

Waiting for approval. Each approved finding gets one commit, its numbers
re-measured with the same tools (`measure.py`, Lighthouse, the traces), the
full test suite run, and the checklist flows to re-run if it touches layout
or input.

| Finding | Commit | Before | After | Tests | Re-run on phones |
|---|---|---|---|---|---|
| F1 setup check stops refetching the product list | "Dashboard: the setup check stops asking for the whole product list on every screen" | The audit's 9-screen seller trace: `GET /seller/products` **5× (2,500 KB)**, on opening the dashboard, back to Orders, the Products tab, back to Products, Settings | **3× (1,500 KB)**: opening the dashboard (the setup check's one fetch) and the 2 visits to the Products screen, which still fetches on every visit to show current stock. "Once" would also need a freshness window on the Products screen (not approved). Settings tab dot for a new shop, saved in either order (product first, or delivery and payments first): shows until all three are saved, clears at once after the last, same as before | 614 backend pass; oxlint, `tsc -b` and build pass | 8, 10 |
| F9 shop, account and categories fresh for 5 minutes | "Dashboard: shop settings, account and categories count as fresh for 5 minutes" | Same 9-screen trace, after F1: `GET /seller/store` **11×**, `/seller/account` **6×**, `/seller/categories` **3×**; 34 API requests in all | `/seller/store` **1×**, `/seller/account` **1×**, `/seller/categories` **1×**; 19 API requests in all. Saved on this device and shown at once (checked in the browser, same as before): shop name on the Settings menu and the top bar, a new category in the list and the product form, the account name, the setup dot (both orders as for F1) | 614 backend pass; oxlint, `tsc -b` and build pass | 8, 9 |
| F5 first photos load at once | "Grids and lists: the first 4 photos load at once" | Lighthouse mobile, 3 runs each, before and after taken in turn (the first photo's wait = Lighthouse's "load delay"). Seller Products (500): LCP **13.3 s** (photo waits 12.4 s), score 34. Shop, 25 products: LCP 6.4 s (waits 5.4 s), score 55. Shop, 500: LCP 7.4 s (waits 5.8 s). Category: LCP 6.5 s (waits 5.4 s). Seller Orders: LCP 10.8 s (a row's text) | Seller Products: LCP **7.0 s** (waits 6.2 s), score 36. Shop, 25: LCP 6.2 s (waits 5.1 s), score 54. Shop, 500: LCP 7.6 s (waits 5.1 s; the rest is the grid's rendering, F8). Category: LCP 6.5 s (waits 5.3 s). Orders: LCP 10.5 s, unchanged (its LCP is text, after the data). So: a clear win on the seller's product wall; on the shop the photo starts ~0.3-0.7 s sooner but LCP moves within run-to-run noise, because the photo's address only arrives with the API answer after the JS has run (F2) | 614 backend pass; oxlint, `tsc -b` and build pass | 1, 2, 8, 10 |

---

## 11. Deferred, with reasons

- **F11 checkout lock:** a design change to checkout concurrency (high
  risk); only a flash sale of dozens of orders in seconds hits it.
- **F12 round trips:** touches the RLS hook; worth it only if Render→Neon is
  slower than ~3 ms per round trip.
- **F13 indexes:** a few ms today; revisit at ~20k orders in one shop.
- **F14 keep-alive:** wait for the live load test (04 Next Up).
- **F15 seller endpoints at 0.1 CPU:** solved by Starter (F3) if chosen.
- **Shop pages prerendered on the server** (the only way to an LCP under
  2.5 s on Slow 4G): an architecture change, not proposed.
