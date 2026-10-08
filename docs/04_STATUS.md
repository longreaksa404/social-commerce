# Project Status

> **Last updated:** 2026-10-08 (Render kept awake 7:00-midnight by a cron-job.org job)
> **Updated by:** Claude Code (edits this file directly)
>
> This file is the live source of truth for **what has actually been built**.
> `03_DEVELOPMENT.md` is the plan; this file is reality. If they disagree,
> this file wins for "what exists," `03_DEVELOPMENT.md` wins for "what's
> scoped to be built."
>
> Claude Code reads this file at the start of every session and updates it
> after meaningful progress.

---

## Current Phase

**Phase 9 — Polish, hardening, first real seller** (in progress since
2026-10-04; the work so far deployed 2026-10-04, CI passed)

Definition of done (in 03 since 2026-10-04): a real seller runs their
shop on the live site in Khmer, and a real customer's order goes from a
shared link to completed.

Phase 8 met its definition of done on 2026-10-04 and the founder closed
it after testing on the live site: a link made from a product's Share
button previewed with the product's name and photo, and opening it and
ordering showed the view and the order on the link's page. (Definition
of done now in 03.)

Phase 7 met its definition of done on 2026-10-03 and the founder closed
it after testing on the live site: a test order showed on the bell,
tapping it opened the order, and "View customer" showed the customer's
details and order history. (Definition of done now in 03.)

Phase 6 met its definition of done on 2026-10-03 and the founder closed
it after testing on the live site with their bot (ReaksaShopAlertBot):
Connect in Settings, a real Telegram alert for a test order, and "Ask
seller on Telegram" opening their own chat with the message typed.

Phase 5 met its definition of done on 2026-10-03 and the founder closed
it after testing on the live site: delivery fee, couriers, discount, an
order with the phone's location, the delivery walked to delivered, and
the order completed.

Phase 4 met its definition of done on 2026-10-03 and the founder closed
it: on the live site an order can be placed with cash on delivery, bank
transfer, or KHQR, and the seller can mark it paid. The founder scanned
a live KHQR order with their own bank app (their name and the exact
amount showed), marked it paid, and completed it.

Phase 3 met its definition of done on 2026-10-02 and the founder closed it
(by starting Phase 4): on the live site a customer checks out and sees a
confirmation; the seller sees the order and can accept/reject/advance it
along 02 §7.1. This was the manual end-to-end run 03 asks for before
Phase 4.

Phase 2 met its definition of done on 2026-10-02 and the founder closed it:
on the live site, `/shop/reaksa-store` shows the real product on a phone,
and its product link (tapped, or opened directly) shows that product.
Checked by the founder and in headless Chromium at 390px.

Phase 1 met its full definition of done on 2026-10-03: the last part,
adding a product image, works on the live site now that Cloudflare R2 is
set up (founder saw the photo in the shop on their phone). The rest was
deployed and tested by the founder on 2026-10-01.

Phase 0 met its definition of done on 2026-10-01: the deployed frontend
shows "API: ok" from the deployed backend.

---

## Done

> Corrected 2026-09-30: an earlier version of this list described work that
> was not actually in the repo. Everything below is committed on `main`.

- [x] Repo setup: monorepo (`backend/` + `frontend/`), root `.gitignore`,
      `.gitattributes` (`* text=auto eol=lf`), `.env.example`
- [x] Local Postgres 16 via root `docker-compose.yml` (host `localhost:5432`,
      credentials from the repo-root `.env`)
- [x] FastAPI skeleton: Pydantic settings from env vars, CORS locked to
      configured origins, health check at `GET /health`
- [x] SQLAlchemy 2.0 async base (`backend/app/db/base.py`, `session.py`):
      `Base`, `UUIDPrimaryKeyMixin`, `TenantMixin` (`store_id`)
- [x] Alembic (async) setup reading `DATABASE_URL` from settings
- [x] React + Vite + TypeScript + Tailwind v4 + TanStack Query skeleton; home
      page calls `GET /health` and shows "API: ok"
- [x] CI: `.github/workflows/ci.yml` (ruff, alembic upgrade, pytest against
      a Postgres service; oxlint + build for the frontend). Pushed, but the
      result on GitHub has not been checked yet (repo is private).
- [x] `DATABASE_URL` accepts Neon's plain `postgresql://...?sslmode=require`
      string and converts it for asyncpg
- [x] Sentry wired into backend (`SENTRY_DSN`) and frontend
      (`VITE_SENTRY_DSN`); each is off unless its DSN is set. Errors only,
      no tracing.
- [x] Deploy config: `backend/Dockerfile` + root `render.yaml` Blueprint
      (free web service, Singapore, deploys only after CI passes, runs
      `alembic upgrade head` on container start); `frontend/vercel.json`
      (SPA fallback); Node pinned to 24.x via `engines`. Docker image built
      and smoke-tested locally against Postgres.
- [x] **Deployed (2026-10-01):**
  - Frontend: https://social-commerce-eight.vercel.app (Vercel Hobby,
    root directory `frontend`, deploys on push to `main`)
  - Backend: https://social-commerce-api.onrender.com (Render free,
    Singapore, from `render.yaml`); `/health` ok, CORS allows the Vercel URL
  - Database: Neon free, Singapore, database `social_commerce`, direct
    (non-pooled) connection; migrations run against it on backend start
  - Sentry: projects `api` (FastAPI) and `web` (React), errors only
  - Domain + Cloudflare DNS: deferred to Phase 9

**Phase 1 (deployed 2026-10-01; founder-tested on the live site;
photos live 2026-10-03):**

- [x] **Cloudflare R2 live (2026-10-03):** bucket `social-commerce-images`
      (Standard class, free tier), public development URL
      `https://pub-dd493652428741dcac9a6b9257e6cb17.r2.dev`, CORS for PUT/GET
      from the Vercel site and `localhost:5173`, an Account API token with
      Object Read & Write on that bucket only. The five `R2_*` vars are in
      Render and the local `.env` (listed in `render.yaml` as
      `sync: false`). Photo uploaded on the live site and seen in the shop
      on the founder's phone.

- [x] Tables + migrations: `seller`, `store` (incl. `currency` USD/KHR),
      `refresh_token`, `category`, `product`, `product_variant` (with
      `store_id`). Enums are text + CHECK constraints.
- [x] RLS: NOLOGIN role `app_user` (created by the migration). Seller
      requests use `tenant_session()`: every transaction runs
      `SET LOCAL ROLE app_user` + `app.tenant_id`, so RLS applies even
      though the login role owns the tables. Auth uses `unscoped_session()`
      and filters by seller explicitly. Verified against a fresh
      non-superuser owner (Neon-like) Postgres.
- [x] Auth: `POST /api/v1/auth/register|login|refresh|logout`. Register
      creates seller + store. Access JWT 15 min (carries `store_id`),
      refresh JWT 7 days, single use; reuse revokes all the seller's
      sessions. bcrypt (directly, not passlib). Login/register/refresh rate
      limited per IP (slowapi). Errors use the 02 §6.3 envelope.
- [x] `GET/PATCH /api/v1/seller/store` (name, slug, description, currency)
- [x] Category CRUD with product counts; product CRUD with variants
      (replace-list semantics), soft delete, store-scoped category check
- [x] `POST /api/v1/seller/products/{id}/images`: presigned R2 PUT signed
      for exact type + size (JPEG/PNG/WebP, max 5 MB, max 5 images).
      Returns 503 until R2 settings exist.
- [x] Frontend: React Router; landing, login, register; guarded dashboard
      (Products, Categories, Settings); product list with filters; product
      form with variants and photo upload; category management; store
      settings with currency. Mobile-first.
- [x] 28 pytest tests (auth rotation/reuse/logout, tenant isolation via RLS
      and via API for store/categories/products, variants, image upload
      signing). Tests use their own `<db>_test` database.
- [x] Full flow clicked through in headless Chromium at phone size
      (register → categories → products with variants → currency → reload →
      logout/login); no unexpected console errors.

**Seller UI rework for phones (2026-10-01, founder-requested, pushed):**

- [x] App shell: bottom tab bar on phones, sidebar on desktop; product
      create/edit is a focused screen with a pinned Save bar. Log out moved
      to Settings → Account.
- [x] UI kit: 44px touch targets, 16px inputs (no iOS zoom), switches,
      show/hide password, currency symbol in price fields, toasts, bottom-
      sheet confirm dialog, skeleton loaders, retry on load errors, empty
      states. lucide-react icons.
- [x] Product form: photos first and pickable before the product exists;
      photos shrunk on the phone to max 1600px JPEG before upload; stock
      −/+ stepper; "Discard changes?" when leaving unsaved edits.
- [x] Product list filters in the URL; category product counts link to the
      filtered list.
- [x] Accessibility: axe-core reports no WCAG 2.1 A/AA violations on any
      screen; labels/hints wired with htmlFor/aria-describedby; primary
      button contrast 5.5:1.
- [x] Khmer product/category/store names checked with Noto Sans Khmer.
- [x] Dev: Vite and uvicorn --reload now poll (the repo is on a Windows
      drive where file-change events never arrive); needs a container
      rebuild to take effect.

**Phase 2 (deployed 2026-10-02; founder closed it on the live site):**

- [x] Public endpoints `GET /api/v1/shop/{store_slug}` (store + categories
      that have active products), `/products` (active products as cards:
      first photo, price or price range, in stock), `/products/{slug}`
      (photos, variants with their effective price and stock, category),
      `/categories/{slug}`. Only customer-safe fields (no SKU, status,
      payment/Telegram config). A deactivated seller's shop is 404.
- [x] Tenant isolation: the shop is found by slug on a short unscoped
      session; all catalog queries then run on a tenant session for that
      shop, so RLS applies to public reads too (02 §4.2 updated).
- [x] Rate limit: 300/min per IP shared across all storefront endpoints,
      checked before the shop lookup, so guessing slugs is limited too.
- [x] 10 pytest tests (38 total): cross-store isolation by slug, inactive
      products hidden, variant prices/stock, no private fields, deactivated
      shop, RLS role on shop sessions, rate limit on unknown slugs.
- [x] Frontend routes (02 §9.1): `/shop/:slug`, `/shop/:slug/product/:slug`,
      `/shop/:slug/category/:slug`. Header with store name; store page
      (description folded when long, category chips, 2/3/4-column grid,
      "Sold out" badge); product page (swipeable photos, variant chips with
      sold-out ones crossed out, price follows the chosen option, stock
      "In stock" / "Only N left" (≤5) / "Sold out", description); category
      page; not-found pages for shop/product/category; tab titles.
- [x] Settings → Shop link has an "Open shop" button.
- [x] Checked at 320/360/414/1280 px with Noto Sans Khmer: no horizontal
      scroll, axe-core finds no WCAG 2.1 A/AA violations, no console errors
      (besides expected 404s), riel prices, long Khmer names, empty shop,
      slow loading (skeletons), dropped request ("Try again" recovers).

**Phase 3 (deployed 2026-10-02; founder closed it on the live site):**

- [x] Tables + migration `8980a033af6d`: `customer` (per store, unique
      by phone), `order` (per-store `number` from 1001, `currency` copied
      from the store, `delivery_fee` 0 for now), `order_item` (name/price
      snapshots, `store_id` for RLS, `variant_id` cleared if the variant
      is deleted). RLS on all three, same policy as the catalog tables.
- [x] Guest checkout `POST /api/v1/shop/{slug}/orders`: prices and stock
      from the database; stock checked and taken in one statement per
      line; refused (409 `ORDER_TOTAL_CHANGED`) if the total differs from
      what the customer was shown; `PRODUCT_OUT_OF_STOCK` /
      `PRODUCT_UNAVAILABLE` name the cart line (`field: items.N`). Phones
      stored one way (`012 345 678`, `+855 12 345 678` → `012345678`).
      Own limit of 10 orders/min per IP on top of the shop's 300/min.
- [x] Tracking `GET /api/v1/shop/{slug}/orders/{id}?phone=`: 404 unless
      the phone matches (any spelling); no customer details in the reply.
- [x] Order state machine in `app/services/order.py` (02 §7.1 table).
      Reject/cancel put stock back; the order row is locked while its
      status changes, so a double tap can't return stock twice.
      `completed` is blocked until Phase 4 (02 §7.4 needs a payment).
      Automatic confirmation goes through the same transition as Accept.
- [x] Seller `GET /seller/orders` (newest first, status/date filters,
      paging, counts per status), `GET /seller/orders/{id}` (with
      `next_statuses`), `PATCH /seller/orders/{id}/status`;
      `order_confirmation_mode` in `GET/PATCH /seller/store`.
- [x] Fix: the product form now sends stock only when the seller changed
      it, so saving a form opened before an order came in no longer puts
      sold units back (`VariantIn.stock_quantity` omitted = unchanged).
- [x] Storefront: cart per shop on the device (header button with
      count); quantity + "Add to cart" on the product page; cart page
      re-checks price/stock and blocks checkout while a line is sold out,
      short, or gone; checkout (name, phone, address, note, review,
      pinned "Place order"); order page = confirmation + tracking with a
      progress list, phone asked only on another device; "Your orders"
      on the cart page lists orders placed on this device.
- [x] Seller: Orders tab (first tab and the dashboard's start page) with
      New / In progress / Delivered / Cancelled filters and counts,
      polling every 30 s; order detail with tap-to-call phone, note,
      items, and a pinned bar of the allowed next moves (Reject/Cancel
      ask first). Settings → Orders → "Accept new orders automatically".
- [x] 149 pytest tests (81 of them every order status pair): totals in
      exact decimals, stock taken/refused/returned, order numbers per
      store, currency kept, phone matching, tracking, tenant isolation
      (RLS and API), variant deleted after ordering, rate limit.
- [x] Clicked through in headless Chromium at 390 and 1280 px (customer
      and seller flows, price change during checkout, stock taken by
      another customer, wrong phone, storage blocked): axe-core finds no
      WCAG 2.1 A/AA violations; no console errors besides expected
      409/404 responses.

**Phase 4 (deployed 2026-10-03; founder closed it on the live site):**

- [x] Spike (Bakong/KHQR, 03 §3 Phase 4): a KHQR is an EMVCo QR payload
      built from the seller's Bakong ID, so **making one needs no Bakong
      account, API token, or call**. Only checking payments automatically
      needs the Bakong Open API (token from api-bakong.nbc.gov.kh, renewed
      every 90 days; reported to work only from Cambodian IPs). That stays
      post-MVP (02 §10.3), so nothing blocks KHQR in the MVP.
- [x] Table + migration `ccd5e33eba38`: `payment` (1:1 with order, with
      `store_id` for RLS like `order_item`). Existing orders got a pending
      cash-on-delivery payment for their total.
- [x] Payment settings in `store.payment_config` via `GET/PATCH
      /seller/store` (`payment_settings`): COD, bank transfer (bank, name
      on account, account number), KHQR (Bakong ID, name customers see:
      English letters, max 25). A method needs its details to be on; a
      shop needs at least one. New and existing shops take COD.
- [x] Checkout: `payment_method` is required and must be one the shop
      takes (409 `PAYMENT_METHOD_UNAVAILABLE` otherwise). The shop page
      lists method names only (`payment_methods`), no account details.
- [x] Order page (`ShopOrderOut.payment`): status, plus how to pay while
      the payment is pending and the order isn't rejected/cancelled: the
      bank account, or a KHQR code for the exact total with `#<order
      number>` as the bill number. Each code expires after 24 hours (KHQR
      requires an expiry once there's an amount); the page makes a fresh
      one on every load. Riel totals with cents get no code (the SDK
      refuses them too).
- [x] Payment state machine (02 §7.2) in `app/services/payment.py`:
      pending → paid | failed; nothing else in the MVP.
      `PATCH /seller/orders/{id}/payment` with an optional note
      (`reference`); `paid_at` set when paid; the order row is locked as
      for status changes. Recording a payment never changes the order
      status, or the other way round.
- [x] Completion rule (02 §7.4): `can_complete` = paid, or cash on
      delivery.
- [x] Frontend: Settings → Payments; checkout payment choice (nothing
      preselected when there's a choice); order page puts the payment
      first while it's due (KHQR picture with "Save QR code": share sheet
      on iPhone so it lands in Photos, a download elsewhere; bank account
      with copy buttons); seller order detail Payment card (Mark paid /
      Cash received with optional note, Payment failed after a confirm,
      hint when a delivered order waits for its payment); payment badge in
      the order list (Unpaid / Paid / Payment failed / COD).
- [x] 198 pytest tests (49 new): every payment status pair, the
      completion rule for every method × status, settings validation,
      method refused at checkout, totals on the payment, bank details
      hidden once paid or the order is off, tenant isolation (RLS and
      API), and KHQR strings identical to ones NBC's own SDK
      (`bakong-khqr` 1.0.20) generated.
- [x] Clicked through in headless Chromium at 390 and 1280 px: settings
      (bad Bakong ID shown under the field), checkout with each method,
      KHQR picture decoded back and **validated by NBC's SDK** (account,
      amount, currency, `#1001`, 24 h expiry), save QR, copy account and
      amount, seller marks paid with a note and completes, delivered +
      unpaid can't complete, payment failed, COD completes unpaid, method
      turned off mid-checkout. axe-core: no WCAG 2.1 A/AA violations; no
      console errors besides expected 409/422.

**Phase 5 (deployed 2026-10-03; founder closed it on the live site):**

- [x] Migrations `7461cde1fdf0` + `b2f4c81e9d03`: `delivery` (1:1 with
      order, `store_id` + RLS like `payment`, `courier`, `assignee_note`,
      `created_at`/`updated_at`); existing orders got a not-assigned
      delivery for their method. `order.discount` (in the money CHECK),
      `order.delivery_lat` / `delivery_lng` (both or neither) /
      `delivery_address_note`, and `store.discount_config`.
- [x] Settings via `GET/PATCH /seller/store`: `delivery_settings` (one
      `fee` for any delivery, free delivery from an amount and/or a number
      of items, own delivery on/off, up to 10 `couriers` such as J&T
      Express / VET Express, pickup on/off with its address) and
      `discount_settings` (up to 5 rules "X off once the items reach Y").
      A shop needs own delivery, a courier, or pickup; pickup needs an
      address; courier names must differ; a discount can't exceed its
      threshold. New and existing shops: free own delivery, no discounts.
      The shop page (`delivery`, `discounts`) lists them.
- [x] Pricing in `app/services/pricing.py`: total = items − discount +
      delivery fee. The biggest discount reached applies (they never add
      up), capped at the items. Fee = the shop's one fee, whoever
      delivers; 0 for pickup or when a free-delivery rule applies (judged
      on the items before the discount). The storefront repeats it
      in `frontend/src/lib/pricing.ts` (must change together); checkout
      still refuses a total that differs (`ORDER_TOTAL_CHANGED`).
- [x] Checkout: `delivery_method` required; `courier` (one of the shop's,
      or null for its own delivery); for delivery the typed address, the
      phone's GPS location (`delivery_lat`/`lng`), or both, plus an
      optional `delivery_address_note`. `DELIVERY_METHOD_UNAVAILABLE` /
      `DELIVERY_OPTION_UNAVAILABLE` (409) when the seller changed them
      mid-checkout. A pickup keeps the customer's saved address.
- [x] Delivery state machine (02 §7.3) in `app/services/delivery.py`:
      not_assigned → assigned → picked_up → in_transit → delivered |
      failed, **failed → assigned (retry)**; pickup: not_assigned →
      delivered. `PATCH /seller/orders/{id}/delivery` with an optional
      driver note; the order row is locked as for status changes. Never
      reads or sets the order's or the payment's status.
- [x] Completion (02 §7.4): `can_complete` = delivery delivered AND
      (paid or COD). `ORDER_NOT_DELIVERED` / `ORDER_NOT_PAID`.
- [x] Customer order page: delivery card (who delivers or the pickup address, status
      in the customer's words; the driver note is seller-only), items /
      discount / delivery / total; pickup orders read "Ready to collect",
      "Handed over", "Collected".
- [x] Frontend: Settings → Delivery (fee, free rules, own delivery,
      couriers with one-tap J&T Express / VET Express, pickup) and
      Discounts; cart shows the discount and "Add $X more to get $Y off";
      checkout: shop delivery / courier / pickup in one list, "Use my
      current location", address (optional once located), address note,
      free-delivery note, breakdown, "Total before delivery" until chosen;
      seller order detail: Delivery card ("Send with VET Express", Book
      courier / Assign with a note, Picked up, On the way, Delivered,
      Delivery failed, Try again, Customer collected; hint when it holds
      up completion), address note and "Open in Google Maps"; list badges
      for pickup and failed deliveries.
- [x] 365 pytest tests (167 new): every delivery status pair per method,
      the completion rule for every payment method × payment status ×
      delivery status, pricing (fees, both free-delivery rules at their
      boundaries, best discount, discount before/after fee, cap, riel),
      checkout with own delivery / courier + GPS / free / discount /
      pickup, refused choices,
      changed fee, settings validation, tenant isolation (RLS and API).
- [x] Clicked through in headless Chromium at 390 and 1280 px: settings
      saved and reloaded, duplicate area shown by its field, three orders
      ($12 + $2.50 to Provinces; 4 items: $48 − $5, free delivery; pickup
      $12), seller assigns, fails, retries, delivers, completes; pickup
      collected; reworked flow (couriers, GPS, one fee) re-checked at 390
      px. axe-core: no WCAG 2.1 A/AA violations; no console errors.

**Checkout location map (2026-10-03, founder's request; deployed, founder-tested on the live site with location blocked on their iPhone):**

- [x] `frontend/src/shop/MapPicker.tsx` (loaded on demand) replaces "Use
      my current location" and the blocked-location help box. Checked in
      headless Chromium at iPhone size with location allowed and blocked:
      map opens, ◎, drag, zoom, confirm, address becomes optional; no
      console errors.

**Phase 6 (deployed 2026-10-03; founder closed it on the live site):**

- [x] Migration `3867d44e4db7`: `store.telegram_username` and the
      `notification_log` table from 02 §5.2 (RLS like the other tenant
      tables). Built now rather than in Phase 7, because 02 §12.1 has
      every Telegram alert write a row.
- [x] Bot API over plain `httpx` (`app/services/telegram.py`), not
      python-telegram-bot: sendMessage plus one /start command don't need
      a framework. Off until `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`
      and `TELEGRAM_WEBHOOK_SECRET` are set. The webhook is registered
      with Telegram at startup only where `PUBLIC_API_URL` is set
      (production), so a laptop never takes the bot over.
- [x] Connecting: `POST /seller/store/telegram/link` returns
      `t.me/<bot>?start=<code>`. The code is signed, not stored (store id
      + 30-minute expiry + HMAC from `JWT_SECRET`, 43 characters).
      `POST /api/v1/telegram/webhook` checks the secret-token header (404
      otherwise), and `/start <code>` in a private chat saves the chat on
      the store and replies "Connected to <shop>". Anything else gets
      help text; groups are ignored. `DELETE /seller/store/telegram`
      disconnects. If the seller blocks the bot, the next alert
      disconnects the store.
- [x] Alerts (`app/services/notifications.py`), only for things the seller
      didn't do: each new order (number, items, discount, delivery fee,
      total, payment and delivery method, customer name and phone,
      address or "location shared", note, "Open order" button; "(accepted
      automatically)" in automatic mode), and low stock when an order
      takes a product or option to 5 or fewer, or sells it out (once at
      each step, not on every sale). Sent after the response
      (BackgroundTasks); each writes a `notification_log` row (sent /
      failed + error). A failure never touches the order.
- [x] "Ask seller": the seller's Telegram username in `GET/PATCH
      /seller/store` (`@name`, `name`, `t.me/name` all saved as `name`;
      empty clears), public on the shop page. The chat id stays private.
- [x] Frontend: Settings → Telegram ("Connect Telegram", fetched ahead
      so a phone doesn't block the new tab; the page polls until the chat
      connects, then shows Connected / Disconnect; "Your Telegram
      username"). Product page: "Ask seller on Telegram" under Add to
      cart opens `t.me/<username>?text=…` with "Hi! I'd like to ask about
      <product (option)>: <link>". Hidden without a username.
- [x] 404 pytest tests (39 new): link codes (round trip, expiry,
      forged, swapped signature), webhook secret, connect only that store,
      groups ignored, settings, username normalizing and refusal, the
      low-stock crossing rule, alert text (escaping, riel, automatic
      mode), no alert without a chat, blocked bot, tenant isolation of
      the log (RLS) and of disconnect (API).
- [x] Clicked through in headless Chromium at 390 and 1280 px with a
      fake bot and the webhook called directly: connect → Connected
      without a reload, bad username shown by its field, username kept,
      Ask seller link and pre-filled text, an order's alerts logged as
      failed (this container can't reach Telegram) while the order went
      through, disconnect, no button without a username. axe-core: no
      WCAG 2.1 A/AA violations; no console errors.
- [x] **Checked with real Telegram by the founder (2026-10-03):**
      Connect, the new-order alert arriving, and "Ask seller" opening
      their chat with the message pre-filled on their iPhone. Android
      pre-fill not checked yet (if it doesn't, the chat still opens,
      just empty).

**Phase 7 (deployed 2026-10-03; founder closed it on the live site):**

- [x] Migration `aa40287b7688`: `notification_log.read_at` (decided
      2026-10-03: read on one device is read on all) and an index on
      `(store_id, channel, sent_at)`.
- [x] Web notifications: every order saves a `web` row in
      `notification_log` in the order's own transaction, whether or not
      Telegram is connected, plus a low-stock row when it takes a product
      or option to 5 or fewer or sells it out: the same two events as the
      Telegram alerts. The row keeps the order as placed (number,
      customer name, units, total, currency, accepted automatically) or
      the products (id, name, left).
- [x] `GET /seller/notifications` (newest first, paged, with the unread
      count), `GET /seller/notifications/unread` (the bell), `POST
      /seller/notifications/read` with `up_to` = the newest one the seller
      was shown, so one arriving meanwhile stays unread.
- [x] `GET /seller/customers` (whoever ordered last first, paged, total):
      orders, last order, and what they spent = every order except
      rejected and cancelled ones, including orders still on their way
      (decided 2026-10-03), per currency in case the shop changed
      currency. `q` finds part of a name (any case, Khmer too) or part of
      a phone typed any way (`012 345`, `+855 12 345`, `12-345`).
- [x] `GET /seller/customers/{id}`: name, phone, latest address, customer
      since, orders, spent, and their orders newest first (the latest
      100 if there are more).
- [x] Frontend: bell with a red count in the phone's top bar and the
      sidebar, checked every 30 s and when the seller comes back to the
      app. Notifications page: "New order #1001 · Dara · 2 items ·
      $24.00" opens the order, "Running low · Silk Shirt: 4 left" opens
      the product (several products: the product list); opening it marks
      them read on every device, while new ones stay highlighted until
      the seller leaves the page. Customers tab (second; five tabs on
      phones): search box (kept in the URL), name, phone, orders, last
      order, spent. Customer page: tap-to-call, latest address, customer
      since, orders and spent (with a note when rejected or cancelled
      orders are left out), their orders as in the Orders tab. An order's
      Customer card has "View customer". Back arrows return to where the
      seller came from (the customer, the notifications, the search).
- [x] 429 pytest tests (25 new): notifications saved with and without
      Telegram, auto-accepted flag, low stock after its order with
      product ids, paging, marking read only what was shown, tenant
      isolation (API and RLS) of notifications, customers and a
      customer's page; spent leaves out rejected orders, per currency;
      search by name, Khmer, phone spellings, `%` not a wildcard; the
      latest-orders cap.
- [x] Clicked through in headless Chromium at 320, 390 and 1280 px:
      empty bell and list, an order and its low-stock notification,
      badge count, list marks read, a second device sees it read and
      then a newer one unread, back arrows; customers list (Khmer name,
      +855 phone), search by name / phone / Khmer, no match, a
      customer's page, order ↔ customer links, search kept coming back,
      another shop's customer not found. axe-core: no WCAG 2.1 A/AA
      violations; no console errors.

**Phase 8 (deployed 2026-10-03; founder closed it on the live site 2026-10-04):**

- [x] Migration `883276fadeed`: `shareable_link` (as 02 §5.2, `target_id`
      with no foreign key since it points at a product or a category;
      token unique) and `link_event` (as 02 §5.2 plus `store_id` for RLS;
      an order counts for one link at most). RLS on both.
- [x] `GET /seller/links` (newest first, latest 200, each with views and
      orders), `POST /seller/links` (shop, product or category + where
      it's posted + optional name; the same page, place and name returns
      the existing link; a hidden product can't be shared),
      `GET /seller/links/{id}/stats` (counts + the orders it brought,
      latest 100). A link's address is the page's own address +
      `?l=<8-char token>`, built from the current slugs; null while the
      product is hidden or the category deleted.
- [x] `POST /shop/{slug}/track-view {token}`: 204 at once, the view is
      written after the response (BackgroundTasks); unknown or another
      shop's token is ignored. Own limit 60/min per IP on top of the shop
      limit.
- [x] Checkout takes `link` (the token the device remembered): the order
      gets the link's `source` and a `link_event(order)` in the order's
      transaction. Another shop's token does nothing.
- [x] Shop: opening a page with `?l=` counts a view (once per device per
      link per 30 min, so reloads don't count) and remembers the link for
      that shop; an order on the device within 7 days counts for the last
      link opened (decided 2026-10-03).
- [x] Dashboard: bottom tabs are now Orders, Customers, Products, Links,
      Settings (decided 2026-10-03); Categories is a button on Products
      (and stays in the desktop sidebar). Links tab: each link with what it
      opens, where it's posted, views and orders. New link: what it opens,
      Facebook / TikTok / Instagram / Telegram / Messenger / Other (typed),
      optional name. A link's page: the address with Copy, Share (phone's
      share sheet) and Open (without the token, so the seller's own look
      isn't counted), views, orders, the orders themselves. Share buttons
      on a product, each category and Settings → Shop link. An order that
      came through a link says "Came through your TikTok link".
- [x] Link previews (decided 2026-10-03, closes the Phase 2 proposal):
      `frontend/middleware.ts` (Vercel Routing Middleware on `/shop/*`).
      Preview bots (Facebook/Messenger, Telegram, TikTok, WhatsApp, ...)
      get `index.html` with `og:` title, description (price · shop ·
      description) and photo from the storefront API; people pass
      through untouched. API slower than 6 s (Render asleep) → the generic
      card. Adds `@vercel/functions`. Uses `VITE_API_URL`, which Vercel
      already has.
- [x] 438 pytest tests (9 new): link addresses per target, the same link
      twice, hidden product refused, stats kept when the target goes
      away, views and orders per link and `order.source`, another shop's
      token ignored, bad token, tenant isolation (API and RLS).
- [x] Clicked through in headless Chromium (iPhone size, and 320 px for
      the tabs) against the local dev servers: Share on a product → TikTok
      + name → link page; customer opens it, reload not counted twice,
      checkout → the link shows 1 view and 1 order, the order says "Came
      through your TikTok link". Middleware run locally against the built
      app: product and shop cards filled in, unknown product → generic
      card, Facebook's in-app browser passed through.

**Phase 9 so far (deployed 2026-10-04; founder to check on the live site):**

- [x] Security review against 02 §13. Fixed: rate limits were keyed on
      the first `X-Forwarded-For` entry, which the client writes and
      Render keeps (Render only appends), so a made-up header gave every
      request a fresh budget. Now keyed on `CF-Connecting-IP` (set by
      Render's Cloudflare edge), falling back to the connection's address
      when absent (`client_ip` in `app/core/ratelimit.py`). Also: login
      password / refresh token bodies have a maximum length; the frontend
      sends `frame-ancestors 'none'` / `X-Frame-Options: DENY` and
      `nosniff` (`frontend/vercel.json`). Checked and fine: bcrypt and
      timing, token rotation and reuse, every seller route on
      `TenantDb`, no raw SQL, uploads signed per product, webhook secret,
      input lengths, React escaping (no raw HTML), preview-card escaping.
      Git history: only the known Telegram token (revoke at launch).
      `/docs` stays public (the endpoints are in the app's JavaScript
      anyway).
- [x] Manual regression checklist: `docs/REGRESSION_CHECKLIST.md` (03 §7).
- [x] Khmer / English switch, Khmer by default (decided 2026-10-02). All
      of the platform's own text is in `frontend/src/i18n/messages/*.ts`
      as `{ en, km }` pairs side by side (the build fails if one is
      missing); components use `useT()`. Choice per device (`sc.lang`),
      sets `<html lang>`. Switch: shop header (one button showing the
      other language), landing, login, register, Settings. API errors are
      translated on the frontend by exact message, then code
      (`apiErrors.ts`). Khmer dates are spelled out by the app
      ("4 តុលា 2026", 24-hour): Chrome builds without Khmer locale data
      would show English. Link-preview cards and `index.html` in Khmer.
      **The Khmer was written by Claude: the founder still has to read
      it** (in the app, or in the message files).
- [x] Light / dark mode (decided 2026-10-02): follows the phone; Settings
      → Language and theme has Auto / Light / Dark (per device,
      `sc.theme`). Dark mode flips the color scales in `index.css`, so
      classes are written for light mode; fills that must not flip use
      `bg-surface`, `bg-raised`, `bg-accent`, `bg-brand`, `bg-danger`
      (rules at the top of `index.css`). Applied before the first paint
      by a script in `index.html`. The KHQR code is an image: always
      black on white.
- [x] Polish: 320 px with Khmer (five tabs fit; shop name fits beside the
      language button; one-line Add to cart); after 4 s of loading the
      shop, login, register and session restore say the first visit can
      take a minute (Render free wakes up).
- [x] Small photo copies (closes the Phase 2 proposal, decided
      2026-10-04): the phone uploads a ~480 px JPEG next to each new
      photo (`<name>-m.<ext>` + `<name>-s.jpg`); grid, cart and lists use
      it, older photos and a missing copy fall back to the photo. No data
      model change; `POST .../images` takes `thumbnail_size`.
- [x] Nightly database backup (decided 2026-10-04):
      `.github/workflows/backup.yml` dumps Neon at 02:00 Phnom Penh into a
      private R2 bucket; skips until its secrets exist. Setup and restore:
      `docs/BACKUPS.md` (restore tested locally).
- [x] 443 pytest tests (5 new: client IP for rate limits, thumbnail
      signing). axe-core: no WCAG 2.1 A/AA violations on any screen in
      Khmer and English, light and dark; no console errors. Clicked
      through in headless Chromium at 320/360 px with a Khmer test shop.

**Phase 9 UX pass (founder's request 2026-10-04, all four items approved;
deployed 2026-10-04, founder to check on the live site):**

- [x] Shop: the shop and product pages show how buying works before
      checkout: delivery fee and free-delivery rule, who delivers, free
      pickup and where, ways to pay, bill discounts (`ShopInfo`; no API
      change). Product page on phones: quantity + Add to cart pinned to
      the bottom; the quantity buttons hide while the item can't be added
      (the reason fits one line in Khmer at 320 px).
- [x] Shop logo: `POST /api/v1/seller/store/logo` signs an upload into
      `stores/<id>/logo/`; `PATCH /seller/store` takes `logo_url` (only
      from that folder; null removes it). Settings → Shop: Add / Change /
      Remove logo, cropped on the phone to a 256 px square JPEG, saved at
      once. Shown in the shop header and the dashboard header. No data
      model change (`store.logo_url` existed).
- [x] Settings is a menu: the shop (logo, name), then Orders, Payments,
      Delivery, Discounts, Telegram, Shop link, each row saying what's set
      now. Each opens `/dashboard/settings/<part>` with only its fields
      and a pinned Save bar; it saves only its own part. Language, theme
      and Log out stay on the menu.
- [x] Seller's order page: a summary first (total, item count, and the
      order, payment and delivery statuses on their own lines; tapping
      payment or delivery scrolls to its card), then items, customer,
      delivery, payment. Wider with two columns on a laptop. The three
      statuses are only shown side by side (02 §7 unchanged).
- [x] Product form: one row per option (name · stock · price · delete),
      headings once; two lines each below 18rem (320 px phones). SKU
      fields only after "Add SKU codes", or when an option has one.
- [x] 445 pytest tests (2 new: logo signing and attach; another store's
      logo or a product photo refused). axe-core: no violations on any
      screen (Khmer light, English dark, 320/390/1280 px). Clicked
      through in headless Chromium: logo upload and remove (R2 upload
      intercepted), saving a settings page, discard prompt, shop-link
      prompt, order jump links and back arrow, accepting an order, saving
      edited options. No console errors.
- [x] Light / dark button for customers (founder's request 2026-10-04):
      moon / sun beside the language button in the shop header; per
      device (`sc.theme`); switching to what the phone shows goes back to
      following the phone. Customers still start with their phone's
      setting. At 320 px a long shop name in the header is cut short
      (the full name is the page title just below). Deployed 2026-10-04.
- [x] Order tracking for customers (founder's request 2026-10-04, all
      four items approved): a bar at the top of the shop's pages while an
      order placed on this phone is in progress ("Order #1001 · Being
      prepared · Not paid yet"; several: "3 orders in progress"); a
      "Your orders" page (`/shop/:slug/orders`) with each order's status
      and total, linked from the bar, the cart and the order page; the
      order page checks every 30 s while open and in progress and says
      "Updated 12:36"; "Ask about this order on Telegram" with the order
      number typed in. Frontend only, through the existing tracking
      endpoint and the phone the device remembered. Checked in headless
      Chromium: bar with one and three orders, the list, the open order
      page changing from "Confirmed" to "Being prepared" by itself after
      the seller moved it; axe clean. Deployed 2026-10-04.

**Phase 9 UX pass 2 (founder's request 2026-10-04: "easy to use, simple
but modern, effects for some actions"; all four parts approved;
deployed 2026-10-04, founder to check on the live site):**

- [x] Motion basics, shop and dashboard: a new page fades in, cards rise
      into place, loading boxes shimmer, product photos fade in over the
      grey (and show the placeholder if they won't load), the shop grid
      comes in one after another, toasts slide in and out, the confirm
      sheet slides up. Plain CSS keyframes in `index.css` and the Web
      Animations API, no animation library. A phone set to reduce motion
      gets none of it.
- [x] Shop effects: Add to cart flies a round copy of the photo along a
      curve into the header's cart button, whose bag and count bump as
      it lands (from the button when the photo is scrolled away); a
      short vibration on Android (iPhones don't allow it). After Place
      order: the circle pops in, the tick draws itself, then confetti,
      once per order (`sessionStorage`, so a reload doesn't repeat it).
      The order page's current step pulses slowly.
- [x] Dashboard effects: Accept / Mark paid / Delivered / ... pop the
      status that moved (summary and card), with a short vibration;
      completing an order bursts confetti from the button. An order that
      arrives while the Orders tab is open (30 s check) slides in on a
      fading amber, not on first load, a filter change or "Show more".
      The bell rings and its count pops when the count goes up. The
      bottom tabs' pill grows into the tab opened. Save (settings,
      product) pops a tick beside "All changes saved".
- [x] Easier screens: the cart shows bars filling toward the next
      discount and toward free delivery ("Add $21.50 more for free
      delivery", or "Add 2 more items ..." for an items rule, whichever
      is closer; then "Your delivery is free."), with the total and
      Checkout pinned to the bottom on phones. Fixed: a cart line's
      total stuck out of the card at 320 px for amounts like $66.00; it
      now moves under the -/+ buttons. Checkout's parts are numbered
      1-4. The shop page shows the logo big and round beside the shop's
      name, on a soft green that fades into the page. Softer cards
      everywhere (shadow and faint outline instead of a grey border); a
      soft green glow on the landing, login and register pages.
- [x] Found on the live check: where `r2.dev` is blocked (the work
      network, some office Wi-Fi), the shop logo showed a broken image.
      It now falls back to the shop icon (shop header and page,
      dashboard header), as product photos fall back to the grey
      placeholder.
- [x] Kantumruy Pro for all Khmer text (founder approved 2026-10-04):
      one variable file with every weight and only the Khmer letters,
      57 KB (estimated ~40 KB when the founder was asked), self-hosted from
      `@fontsource-variable/kantumruy-pro`; downloaded once, the first
      time a phone shows Khmer. Latin letters and numbers stay in the
      phone's font. Static files would be ~23 KB per weight, ~93 KB for
      the four weights the app uses, so the variable file is smaller.
- [x] Checked in headless Chromium: frames of every effect (flight path
      traced into the cart at 390 and 1280 px, tick and confetti, a
      reload not repeating it, badge pops, completion confetti, a new
      order arriving, the bell, the tab pill, the save tick); every
      screen at 320 px Khmer, 390 px English light and dark, 1280 px;
      the browser confirms Khmer is drawn in Kantumruy Pro and Latin in
      the system font; nothing sticks out of a card at 320 px; axe-core:
      no WCAG 2.1 A/AA violations (Khmer light 320 px, English dark 390
      px); no console errors. No backend change.

**Phase 9 layout pass (founder's request 2026-10-04: "improve and review
again with layout for the whole project. i also want full width"; full
width = phones edge to edge, the founder's choice over a full-width
laptop layout; deployed 2026-10-04, founder to check on the live
site):**

- [x] Phones: cards and lists are full-width white blocks with a line
      above and below and grey gaps between them, like a phone app;
      from tablet width (640 px) up they stay rounded, inset cards. One
      change in `cardClass` (`components/styles.ts`), so every card
      follows. List rows (orders, products, customers, links,
      notifications, cart) have 16 px at the sides on phones so their
      text lines up with the page titles; labels beside cards lost their
      extra 4 px there. The shop's order bar is a strip under the
      header; the cart's discount and free-delivery boxes are strips;
      the product description is its own block.
- [x] Wide screens: the order page's action bar and the Save bars
      (product form, settings pages) and checkout's Place order float
      at the bottom of the column while scrolling, instead of sitting
      at the very end of long pages. The laptop layout otherwise stays
      as it was (centered column, no full width).
- [x] Reviewed every screen at 320 px (Khmer), 390 px (English, light
      and dark), 768 and 1440 px. A script checked on all 34 screens at
      320 and 390 px that each card runs exactly edge to edge and
      nothing scrolls sideways. axe-core: no WCAG 2.1 A/AA violations
      (Khmer light 320 px, English dark 390 px); no console errors.

**Phase 9 load test (founder's request 2026-10-06: "how strong of
performance this project can handle?"; committed, not pushed):**

- [x] Fix: password checks (bcrypt) run in a worker thread
      (`core/security.py`). On the event loop, one seller logging in
      froze every shop for ~2.5 s on Render's 0.1 CPU (a login took
      6.9 s under load in the test). Test: the server keeps serving
      during a check. 447 pytest tests.
- [x] `backend/loadtest/` (Locust 2.46.7, own `requirements.txt`, not in
      CI or the Docker image; how to run in its `README.md`): `seed.py`
      makes a test shop through the API (30 products, a third with
      sizes, a Facebook link); `locustfile.py` = customers who open the
      link, view 1-3 products (3-10 s a page), 1 in 10 orders, plus one
      seller polling the dashboard every 30 s; people grow one step a
      minute and each run ends with one line per step; `race.py` = 30
      orders at once for the last 5 units.
- [x] **Run locally (2026-10-06)** on the production Docker image limited
      to Render's CPU and memory (`--cpus`, `--memory 512m`), local
      Postgres, rate limits off. "People" = customers in the shop at the
      same moment; ok = 95% of answers under 1 s, none failed.

      | CPU (Render plan) | Fine up to | Requests/s there | Over the limit |
      |---|---|---|---|
      | 0.1 (free) | **40 people** (95% under 0.3 s) | 10 | 60 people: 95% take 2.7 s; at 100, 8.8 s. Tops out at ~14.5 requests/s |
      | 0.5 (Starter, $7/month) | **200 people** (95% under 0.3 s) | 50 | 300 people: still 95% under 0.6 s, 72 requests/s |

      Memory ~90 MB of 512 MB throughout. Race: 5 orders placed, 25
      told sold out, 0 left (**PASS**), 30 answers in 4.5 s at 0.1 CPU.
      Starting the server at 0.1 CPU (migrations + Python) takes ~35 s,
      which is part of the wait after Render's free plan sleeps.

---

## In Progress

**Redesign of the whole frontend** (founder asked 2026-10-06; a full
redesign, calm look). Steps, each committed on its own:

1. [x] Foundations: Navy brand colour (light and dark), emerald kept
   for success only, Kantumruy Pro for Latin letters and numbers too.
2. [x] Customer shop (mockup approved 2026-10-06, changes 1–11; search
   logged for later): + on product photos, a cart bar at the bottom,
   the shop name once, delivery / payment as tags (light / dark tried
   at the bottom, back in the header 2026-10-07 at the founder's
   choice); Buy now on the product page; the cart and checkout are one
   page (`/cart`; `/checkout` forwards there), returning customers see
   their name and phone as one line, the total on Place order. Phones:
   the cart and order page run edge to edge (founder asked).
3. [x] The customer's order page and order list (founder picked from
   options 2026-10-07: celebration thank-you with the customer's name and
   what's left to do; KHQR card first with "Save QR to photos" as the main
   button on phones and a big code to scan on laptops; a progress bar that
   fills step by step with a truck driving to the current step; the shop
   with a Telegram button beside it; items folded into one line; laptops
   in two columns; Your orders with each order's photo, what was bought,
   and status / paid tags). API: tracked order items carry the product's
   current photo.
4. [x] Seller orders (founder picked 1A 2B 3A 4A 5A 6A, 2026-10-07):
   rows led by what was bought (photo, item name, customer, number,
   time, tags; New in blue, apart from amber "not paid"); the list by
   day under the status tabs; Accept / Reject on new orders right in the
   list; an order opens with a "To do" card (its next step and buttons,
   plus a payment to check or a driver to assign); the three statuses
   as one strip (order, delivery, payment; a dot on what waits on the
   seller; founder's later pick B); laptops show
   the list with the open order beside it. API: order rows carry the
   biggest line, line count and its photo.
   Also from the founder's review: the Orders title and underline
   tabs on one line on laptops; closed orders say so in red; jumping to
   a card flashes it; back returns to the tab it came from.
   Order rows reworked 2026-10-08 (founder picked 1B 2B 3A 4A 5B):
   no Accept / Reject in the list any more (they're in the open
   order's To do card, and accepting or rejecting there opens the next
   new order; not when it was opened from a customer's or a link's
   page); the customer's name leads, with the item, number and time
   below; statuses as quiet words ("● New · Unpaid") instead of tags; a
   soft bag tile when the item has no photo; the open order marked by a
   navy line down its left edge; no arrow.
   Same day (founder picked 2A 3A 4A): customers without the round
   letter pictures; Categories with a "New category" button that opens
   a labelled form (the old top box read as search) and one ⋯ menu per
   row (Share link, Rename, Delete); the real platform logos in their own
   colours wherever a link's place shows.
5. [x] Rest of the dashboard (founder picked 1B+1C 2A 3C 4A 5B 6A,
   2026-10-08): products as a photo wall (cards as tall as the photo)
   or a list / sortable table, the seller's choice, with stock tags;
   the product form on one cleaner page; customers as a sortable table
   on laptops and a profile with Call and Copy phone; links as cards
   with Copy and their numbers; settings menu beside the open setting
   on laptops.
6. [x] Login and Register (7B: split in two on laptops, the ស្រួល
   Sroul Order brand everywhere, the ស favicon) and the start page
   (founder picked F from six, 2026-10-08: deep navy with ស្រួល in very
   large letters, one line on what it's for, Create your store / Log in).

The redesign is complete and pushed (2026-10-08, with the bcrypt fix and
load test). Founder: check CI and the live site once Vercel and Render
have redeployed.

Phase 9, waiting on the founder:

- **Live load test**, once, before the first real seller, from home
  (`backend/loadtest/README.md` "On the live site"): time the wait
  after 20 quiet minutes, rate limits off in Render, seed + Locust +
  race, rate limits back on, hide the test shop. Send Claude the
  summary lines.

- **Domain:** buy **sroul.com** on Cloudflare (brand chosen
  2026-10-06, not bought yet; Domains → Register domain, in the same
  account as R2). First check that "Sroul" is free as a Facebook page
  name and @sroul on TikTok, Instagram and Telegram. Then: this
  product on `order.sroul.com` (Vercel + Render custom domains,
  Cloudflare DNS), `sroul.com` forwards to it for now, R2 photos on
  `images.sroul.com` (existing photo and logo URLs need rewriting in
  the database, or saving a product with old photos is refused as
  "Invalid product image"), the refresh token moved to an httpOnly
  cookie, `PUBLIC_API_URL` / `PUBLIC_APP_URL` / `CORS_ORIGINS` updated.
- **Backups:** the bucket, token and five GitHub secrets
  (`docs/BACKUPS.md`).
- **Read the Khmer** and send corrections.
- **Live check of the rate-limit fix** after deploying (see Notes).
- **First real seller:** who, their products, walkthrough; revoke the
  Telegram bot token at launch; final end-to-end pass on the live site.

---

## Known Issues / Blockers

- Company laptop blocks Windows `.exe` launchers; all dev happens inside the
  devcontainer (or GitHub Codespaces if Docker is blocked). Personal laptop
  uses the same devcontainer.
- Postgres data lives in a per-machine Docker volume and does not sync
  between machines; schema comes from Alembic migrations, seed data from
  scripts (seed script to be added in a later phase).
- The repo is bind-mounted from the Windows `C:` drive (9p), so file
  access in the container is slow (Vite starts in ~15 s, builds ~15 s).
  Cloning the repo inside WSL (e.g. `~/code`) and opening that folder in
  the devcontainer would make dev much faster and make polling
  unnecessary. Founder to decide.
- Commits must be authored with an email on the `longreaksa404` GitHub
  account, or Vercel (Hobby) blocks the deploy. Set per repo with
  `git config user.email longchansamanakreaksa@gmail.com`; the container's
  global `~/.gitconfig` has the work email. Repeat on each machine.
- **Render auto-deploy fixed (2026-10-03).** Until then no push had ever
  auto-deployed the backend (every deploy was "Manual"): each push ended
  with a docs-only commit and the `backend/**` build filter skipped it.
  With the filter removed, the push of `7f6fcfe` deployed by itself
  ("Auto-Deploy" in Render, after CI). Every push now redeploys the
  backend after CI passes.

---

## Open Technical Decisions Pending Confirmation

Resolved:

- [x] **Repo structure: Monorepo**
- [x] **Hosting provider: Render** (fixed monthly pricing)
- [x] **Object storage: Cloudflare R2** (zero egress fees)
- [x] **Local dev environment: devcontainer** (image-based, Python 3.12,
      Node LTS, Docker-in-Docker). Postgres 16 runs from the root
      `docker-compose.yml` inside the container. `backend/.python-version`
      = 3.12 for Render and CI.
- [x] **Tenant column naming:** every tenant table uses `store_id`
      (= tenant_id = store.id); RLS reads session setting `app.tenant_id`.
- [x] **Managed Postgres: Neon free plan** (2026-10-01). Render's free
      Postgres is deleted after 30 days and its cheapest paid tier is
      $6/month; Neon free is $0 with no expiry (0.5 GB). Region: Singapore.
- [x] **Health endpoint: stays at `GET /health`** (2026-10-01), outside
      `/api/v1/`, as an infrastructure probe.
- [x] **Node version: 24** (2026-10-01), in the devcontainer, CI, and Vercel.
- [x] **Domain + Cloudflare DNS: deferred to Phase 9** (2026-10-01). Use the
      free `*.onrender.com` and `*.vercel.app` URLs until then.
- [x] **Guest checkout, no customer accounts** (2026-10-02). Customers are
      per store and matched by phone (02 §5.4).
- [x] **Order tracking = order link + the phone used at checkout**
      (2026-10-02, 02 §8). The device that placed the order remembers the
      phone.
- [x] **Removed variants stay hard-deleted** (2026-10-02); order lines
      keep their name/price snapshots and lose only the link.
- [x] **Stock is taken when the order is placed and returned on
      reject/cancel** (2026-10-02). Not reserved in the cart.
- [x] **Orders get a per-store number (#1001…) and keep the store's
      currency** (2026-10-02; founder took the recommendation).
- [x] **Payment details show right after ordering** (2026-10-02), before
      the seller accepts; a rejected paid order is refunded by the seller.
- [x] **KHQR in Phase 4, generated on our server from the seller's Bakong
      ID; every payment confirmed by hand** (2026-10-02).
- [x] **Delivery fee: one fee per shop, the same for every address and
      every courier, plus optional free delivery from an amount or a
      number of items; pickup is free** (2026-10-03). Replaces the
      per-area fees built first: a customer could pick the cheaper area.
      Closes "Delivery fee handling" in 01 §46.
- [x] **Customer location: a pin on a map** (2026-10-03, founder's
      request; replaces "GPS, no map on screen" decided earlier the same
      day, after location blocked on the founder's iPhone left no way
      forward). "Pin my location on the map" opens a full-screen map
      (Leaflet + OpenStreetMap tiles: $0, no account or API key); the pin
      stays in the middle and the customer moves the map under it; ◎ jumps
      to the phone's location when allowed. Typed address, pin, or both;
      the seller opens the pin in Google Maps. No backend or data model
      change. If OSM's free tiles stop being enough, move to a free-tier
      tile service (needs an account).
- [x] **Couriers, manual: the seller lists the couriers they send with
      (J&T Express, VET Express, ...); the customer picks one; the seller
      books it and notes the branch / tracking number** (2026-10-03). No
      courier API integration (post-MVP, 02 §14).
- [x] **Bill discounts in Phase 5** (2026-10-03, founder's request): fixed
      amount off once the items reach a threshold; the biggest applies.
      No codes, percentages, or per-product discounts.
- [x] **Completing an order needs the delivery delivered** as well as the
      payment rule (2026-10-03; 03 said so, 02 §7.4 didn't).
- [x] **A failed delivery can be retried** (failed → assigned, 2026-10-03).
- [x] **`delivery` gets `store_id` (RLS), `created_at`, `courier`; order
      gets `discount`, `delivery_lat`/`lng`, `delivery_address_note`; fee,
      rules, couriers and pickup in `store.delivery_config`; discounts in
      `store.discount_config`** (2026-10-03).
- [x] **Khmer / English switch and light / dark mode in Phase 9**
      (2026-10-02, founder's request). Not built before then; Phases 5–8
      stay English-only and light-only. Language: all of the platform's
      own text (shop and dashboard, incl. error messages, translated on
      the frontend by error code); what the seller types is shown as
      typed. Switch in the shop header, login page and seller Settings,
      remembered per device; **default Khmer**. Theme: follows the
      phone's setting, with a Light / Dark / Auto switch; the KHQR code
      stays dark on light so bank apps can scan it. No backend or data
      model change expected.

- [x] **"Ask Seller" opens the seller's own Telegram** (2026-10-03,
      founder chose it over a bot relay): `t.me/<username>?text=` with the
      product and its link typed in; the seller answers from their normal
      account and sees the customer's. The username is in Settings; no
      username, no button. The bot is only for alerts.
- [x] **Telegram alerts only for what the seller didn't do** (2026-10-03):
      new order and low stock / sold out. Cancellation, payment and
      delivery changes are the seller's own taps in the MVP, so they send
      nothing. Revisit if customers can cancel or payments are confirmed
      automatically.
- [x] **`store.telegram_username`**, and `notification_log` built in
      Phase 6 (2026-10-03).
- [x] **Notifications read on one device are read on all**
      (2026-10-03): `notification_log.read_at`, null = unread.
- [x] **A customer's "spent" = every order except rejected and
      cancelled ones, including orders still on their way** (2026-10-03).
      Seller-only; customers never see it.

- [x] **Shareable links are saved, named links** (2026-10-03): the seller
      makes one per place they post (shop / product / category + where +
      optional name); its address is the page's own + `?l=<token>`.
      Replaces the hand-typed `?src=&campaign=` of 02 §9.1.
- [x] **An order counts for the last link opened on that device in the
      last 7 days** (2026-10-03) and gets its `source`. A view counts once
      per device per link per 30 minutes.
- [x] **Links tab replaces Categories in the bottom tabs** (2026-10-03);
      Categories is a button on Products.
- [x] **Link previews built with Phase 8** (2026-10-03), as Vercel Routing
      Middleware for preview bots only.
- [x] **`link_event` gets `store_id`** (2026-10-03, CLAUDE.md hard rule 1,
      like `delivery` and `order_item`).

- [x] **Domain: a .com bought on Cloudflare** (2026-10-04).
- [x] **Brand: Sroul (ស្រួល, "easy"); this product is Sroul Order**
      (2026-10-06, replaces khmerorder.com from 2026-10-05, which was
      never bought). One brand for all of the founder's projects, so
      marketing builds one name: each product is "Sroul + a plain
      word" on its own subdomain (`order.sroul.com`; later e.g.
      `pay.sroul.com`), and `sroul.com` is the brand's home (forwards
      to Sroul Order until there's a second product). The product is
      on `order.` from the start because shop links stay in Facebook
      posts forever and must never move. One domain, sroul.com
      ($10.46/year, same to renew): the founder's view is that most
      people write ស្រួល as "sroul" (the dictionary form is "srual";
      srual.com is free if that spelling is ever wanted; sruol, srol
      and srul .com are taken). Always show ស្រួល next to "Sroul". The
      seller's shop stays the brand inside the shop. Picked over Lak
      Dach (លក់ដាច់, lakdach.com: only fits selling tools), Sramoch
      (ស្រមោច, ant: hard to spell, sromoch.com owned by someone else)
      and English names (single words like solution.com are all owned;
      the free ones were Easy855, Boss855, Hello855, Coconut Kit,
      Elephant Kit, Mango Stall); Tinh Lak dropped (too close to Tinh
      Tinh and TENH24). No Cambodian app or company named Sroul or
      Srual found.
- [x] **Render stays on the free plan, kept awake by day** (2026-10-08;
      replaces "revisit if slow" from 2026-10-04; set up and test-run
      by the founder the same day): a free cron-job.org job calls
      `/health` every 10 minutes, 7:00-23:50 Phnom Penh time (until
      midnight, since customers mostly order at night), so only a
      visit between ~0:05 and 7:00 after 15 quiet minutes waits for
      Render to wake. That uses ~530 of Render's 750 free hours a
      month; all day would use ~744, and the founder ran out of them
      that way on an earlier project. The other 3 services in the
      Render workspace (old, unused) are suspended so they can't share
      the hours (checked 2026-10-08: 31.47 hours used, 20 MB of 5 GB
      bandwidth). `/health` doesn't touch the database, so Neon
      still sleeps. **Move to Starter ($7/month)** when the seller is
      earning, when another free service is added to the Render account
      (they share the hours), or past ~40 people in the shop at once
      (the free plan's limit in the load test). Not chosen: Cloudflare
      Workers ($5; our database code would need rewriting, since Python
      Workers don't support async SQLAlchemy yet) and a Contabo VPS
      (saves $0-2 a month over Starter, but the founder would run and
      secure the server).
- [x] **Small photos for the product grid: built in Phase 9**
      (2026-10-04; closes the Phase 2 proposal).
- [x] **Nightly database backup to a private R2 bucket via GitHub
      Actions** (2026-10-04, founder took the recommendation). Not in 03
      before.
- [x] **Kantumruy Pro for Khmer text** (2026-10-04, founder approved
      with the UX pass 2), self-hosted, Khmer letters only.
- [x] **Phones: cards run edge to edge; the laptop keeps its centered
      column** (2026-10-04, founder's choice; a full-width laptop layout
      was offered and not chosen).
- [x] **Brand colour Navy, calm look** (2026-10-06, founder chose from 14
      calm options after rejecting a colourful set): one quiet colour
      (#1f3350) on white and grey; green only for success.
- [x] **Kantumruy Pro for Latin letters and numbers too** (2026-10-06,
      founder chose it over the phone's font; +33 KB once per phone).
- [x] **Redesign approach** (2026-10-06): a full redesign, one area at a
      time; for each layout change Claude shows a mockup first and the
      founder approves before it is built.

---

## Decisions Made This Session (not yet reflected in 01/02/03)

Applied to 02/03 on 2026-10-08 (at the founder's request): Kantumruy
Pro for all text (02 §2 Fonts row) and the frontend redesign (03 Phase 9
row, 14 hrs; subtotal ~114 hrs; §4 totals: Phase 9 114 hrs, total ~342
hrs). The load test row below is still not in 03.

Not yet in 03 (founder said yes 2026-10-06): **load test before the
first real seller.** Proposed 03 Phase 9 row, after "Layout pass":
"| Load test before the first seller (`backend/loadtest/`: locally at
Render's CPU, then once on the live site) and the bcrypt fix it found
| 4 |"; subtotal ~118 hours; §4: Phase 9 118, total ~346 hrs.

Not yet in 02/03 (founder said yes 2026-10-08): **Render kept awake by
day.** 02 §3 Backend hosting row, the Render cell: "**Render** (Docker
deploy of FastAPI; free web service, Singapore, for the MVP; stays free
for the first seller, decided 2026-10-04; a free cron-job.org call to
`/health` every 10 minutes keeps it awake from 7:00 to midnight Phnom
Penh time, decided 2026-10-08, so only a visit after midnight following
15 quiet minutes waits up to a minute, and the app says so; Starter ($7/month) once the
seller is earning or another free Render service is added)". 03 Phase 9
"Decided (2026-10-04)" note: after "(the app says when the server is
waking up)" add "; a free cron-job.org ping keeps it awake from 7:00
to midnight (2026-10-08)".

Applied to 03 on 2026-10-04 (at the founder's request): the layout pass
(03 Phase 9 row, subtotal ~100 hrs, §4 totals: Phase 9 100 hrs, total
~328 hrs).

Applied to 02/03 on 2026-10-04 (at the founder's request): UX pass 2
(02 §2 fonts and motion rows; 03 Phase 9 row, subtotal ~97 hrs, §4
totals: Phase 9 97 hrs, total ~325 hrs).

Applied to 02/03 on 2026-10-04 (at the founder's request): the shop's
light / dark button (02 §2, 03 Phase 9 light / dark row) and customer
order tracking (02 §8 the device's orders, §9.1 `/orders`; 03 Phase 9
row, subtotal ~87 hrs, §4 totals: Phase 9 87 hrs, total ~315 hrs).

Applied to 02/03 on 2026-10-04 (at the founder's request): the Phase 9
UX pass (02 §5.2 `logo_url`, §6.2 the logo endpoint and `logo_url` on
PATCH, §11 shop logo; 03 Phase 9 UX row, subtotal ~80 hrs, §4 totals:
Phase 9 80 hrs, total ~308 hrs).

Applied to 01/02/03 on 2026-10-04 (at the founder's request): the
Phase 9 decisions so far (01 §40 Khmer / English built; 02 §2 languages
and light / dark rows, §3 Render stays free and the Cloudflare domain,
§9.3 Khmer preview cards, §11 small photo copies, §13 client IP for rate
limits and framing, §15 nightly backups; 03 Phase 9 tasks, decisions and
definition of done, §4 totals: Phase 9 ~65 hrs, total ~293 hrs, §7
regression checklist, §8 backups).

- Development moved from a Claude Project chat to Claude Code. Docs live in
  `docs/` in the monorepo; `CLAUDE.md` is at the repo root.
- `01_PROJECT.md` renamed to `01_PRODUCT.md` to match cross-references.
- Hour estimates are now an upper bound. Time tracking dropped (2026-10-02):
  `docs/TIME_LOG.md` removed; actual hours are not logged.
- Notion kanban dropped; Phase task tables in 03 are the checklist.

Applied to 01/02/03 on 2026-10-04 (at the founder's request): the
Phase 8 decisions (01 §20.1; 02 §1.3, §5.2 `shareable_link` /
`link_event`, §6.2 `track-view`, §9.1–9.3; 03 Phase 8 previews task,
decisions and definition of done, §4 totals: Phase 8 ~17 hrs, total
~288 hrs).

Applied to 01/02/03 on 2026-10-03 (at the founder's request): the
Phase 7 decisions (customer "spent" in 01 §16; web notifications in 01
§19 and 02 §12.1; `notification_log.read_at` in 02 §5.2; the customer
and notification endpoints in 02 §6.2; the Phase 7 definition of done in
03).

Applied to 01/02/03 on 2026-10-03 (at the founder's request): the
Phase 6 decisions ("Ask seller" opens the seller's own Telegram in 01
§11, §27, §46 and 02 §12.2; alerts only for new orders and low stock in
01 §19 and 02 §12.1; httpx in 02 §3; `store.telegram_username` in 02
§5.2; the two Telegram endpoints in 02 §6.2; webhook registration in 02
§12.3; 03 Phase 6 tasks and definition of done, `notification_log`
moved from Phase 7; §4 totals: Phase 6 ~17 hrs, Phase 7 ~11 hrs, total
~284 hrs) and the checkout map (01 §26, 02 §5.2 `delivery_lat` /
`delivery_lng`).

Applied to 01/02/03 on 2026-10-03 (at the founder's request): the
Phase 5 decisions (01 §26, §28, §46; 02 §5.2 `store.delivery_config` /
`discount_config`, `order.discount` / location / address note, the
`delivery` table, §7.3 retry, §7.4 completion, §14; 03 Phase 5 tasks and
§4 totals: Phase 5 ~24 hrs, total ~288 hrs).

Applied to 01/02/03 on 2026-10-03 (at the founder's request): the
Phase 3 decisions (guest checkout and tracking by link + phone in 01 §24,
§46 and 02 §5.4, §8; `order.number`, `order.currency`,
`order_item.store_id`, customer unique by phone, `variant_id` ON DELETE
SET NULL in 02 §5.2; stock taken at ordering in 02 §14) and the Phase 4
decisions (01 §25, §46; 02 §5.2 `payment.store_id` and the
`payment_config` shape, §7.2, §10; 03 Phase 4 spike result and §9 risk).

Applied to 02/03 on 2026-10-02 (at the founder's request): Neon instead of
Render Postgres; domain/DNS moved from Phase 0 to Phase 9; migrations at
container start; `currency` on `store`, `store_id` on `product_variant`,
the `refresh_token` table, the `app_user` RLS role note, and bcrypt instead
of passlib.

Applied to 01/03 on 2026-10-02 (at the founder's request): Khmer / English
switch and light / dark mode as Phase 9 tasks (03 §3, totals in §4: Phase 9
~60 hrs, total ~278 hrs); 01 §40 now lists only languages beyond those two.

---

## Notes

- Backend deps are pinned to exact versions in `backend/requirements.txt`
  and `requirements-dev.txt` (no separate lock file).
- The backend test client dependency is `httpx2` (Starlette deprecated
  plain `httpx` for its TestClient).
- The Vite template now ships oxlint instead of ESLint; kept as is.
- RLS convention for new tenant tables (Phase 3+): in the table's
  migration, `GRANT SELECT, INSERT, UPDATE, DELETE ... TO app_user`,
  `ENABLE ROW LEVEL SECURITY`, and a `tenant_isolation` policy on
  `store_id` (copy from the `ccd7d9bce820` migration). Seller endpoints use
  the `TenantDb` dependency; anything on `UnscopedDb` must filter by hand.
- The refresh token is kept in localStorage (access token in memory only).
  Move it to an httpOnly cookie once a custom domain puts app and API on
  the same site (Phase 9). Refreshes are serialized across tabs.
- Removing a product photo only unlinks it; the file stays in R2. Fine at
  MVP volume.
- Variants removed from a product are deleted; `order_item.variant_id`
  is then set to NULL (decided 2026-10-02).
- Placing an order locks the store row until commit, so checkouts in one
  store run one at a time (unique order numbers, one customer per phone).
  Fine at MVP volume.
- A customer's name and address are overwritten by their latest order;
  each order keeps its own `delivery_address`.
- No idempotency key on placing an order: if the connection drops after
  the server saved it, a retry makes a second order. The seller can
  reject the duplicate. Revisit if it happens.
- slowapi checks only one decorated limit per request, so the order
  limit calls its limiter directly (`check_limit` in
  `app/core/ratelimit.py`).
- Completion (02 §7.4) is taken literally: a cash-on-delivery order can
  complete even if its payment was marked failed. The seller decides.
- A payment can't be undone once marked paid or failed (02 §7.2 has no
  way back); both ask first. If sellers mis-tap in practice, an "undo"
  would be a deliberate change to 02 §7.2.
- KHQR codes are made in `app/services/khqr.py` (no dependency); the
  tests pin it to strings from NBC's SDK. The frontend draws them with
  `uqr`. The KHQR card's red header is plain text "KHQR", not NBC's logo
  file.
- Payment details on the order page are the store's current ones, not a
  copy from ordering time, and disappear if the seller turns the method
  off (the customer is told to ask the shop).
- A pickup order still goes through the order's own `ready → shipped →
  delivered` steps (02 §7.1 is the same for both methods); the customer
  reads them as "Ready to collect / Handed over / Collected". If sellers
  find the extra taps annoying, a shorter order path for pickup would be
  a deliberate change to 02 §7.1.
- Couriers are matched by name at checkout; renaming one while a
  customer is checking out makes them choose again.
- The map's ◎ button needs https (or localhost): it works on the Vercel
  site, not on a phone opening the dev server by LAN IP. Moving the map
  by hand works everywhere. Confirm stays off until the map was moved
  (or ◎ found the phone) and is zoomed to street level (16+), so a pin
  can't be the default middle of Phnom Penh. The map (Leaflet, 45 KB
  gzipped) loads only when opened; if that file can't load (connection,
  or a deploy since the page opened) the customer is told to type the
  address.
- The courier's tracking number goes in the seller's note, which the
  customer doesn't see. Showing a tracking number to the customer would
  be a small addition if sellers want it.
- Store slugs are global; product/category slugs are unique per store.
  Names with no Latin letters (e.g. Khmer only) get a short random slug.
- Storefront pages call `useShop` themselves instead of waiting for the
  layout, so a product link costs one round trip. New public endpoints go
  under `/shop/{store_slug}` (`app/api/shop.py`) and use the `Shop` /
  `ShopDb` dependencies; the router-level rate limit covers them.
- Low stock for alerts is 5 or fewer, the same line as the shop's "Only
  N left" (`LOW_STOCK` in `notifications.py` and `ShopProduct.tsx`).
  Seller edits and returned stock never alert.
- Telegram's webhook wakes the sleeping Render free service; the first
  update can time out and Telegram retries it, so a /start reply may
  take up to a minute after a quiet spell. Alerts are sent by our side
  and aren't affected.
- A "Connect Telegram" link works for 30 minutes and for anyone who has
  it; it is only shown to the logged-in seller. Connecting again moves
  alerts to the new chat (one chat per store).
- Bundle: 188.3 KB gzipped JS + 12.2 KB CSS after the layout pass; 188 KB JS + 12 KB CSS after UX pass 2 (184.6 + 10.4 KB
  before it), plus the 57 KB Khmer font, once per phone; 182 KB after the Phase 9 UX pass; 178 KB with both languages and dark mode (Phase 9),
  162 KB after Phase 8, 159 KB after Phase 7, 156 KB after Phase 6, 155 KB after Phase 5, 149 KB after Phase 4 (141 KB after Phase 3, 131 KB
  after Phase 2), mostly
  React DOM, React Router and TanStack Query. Lazy-loading the seller dashboard was measured (saves ~8 KB for
  customers) and skipped for now; revisit when later phases make the
  dashboard bigger (it would also need a reload-on-stale-chunk fallback).
- **Before launch (Phase 9): revoke the Telegram bot token.** It was
  committed by mistake in `5b147df` (reverted in `8514d9b`) and pushed, so
  it stays in the private repo's history. Founder chose to revoke at
  launch: @BotFather → `/revoke` → ReaksaShopAlertBot, put the new token in
  Render's `TELEGRAM_BOT_TOKEN`, redeploy, reconnect in Settings → Telegram.
  The token goes only in Render / `.env`, never in code.
- The bell checks for notifications every 30 s on every dashboard screen
  (the Orders tab did already), but only while the tab is visible. While a
  seller has the dashboard open, Render and Neon stay awake: faster for
  the seller, and it uses Neon's free compute hours. Fine for one seller;
  watch Neon's usage page once there are several.
- `notification_log` keeps every row. Delete old ones only if it ever
  matters (one row per order plus low-stock ones, small).
- Five tabs on phones: at 320 px the labels fit in English and Khmer
  (checked 2026-10-04).
- **Rate-limit fix, live check after deploying:** 11 wrong-password
  logins within a minute from one phone, each with a different made-up
  `X-Forwarded-For` header (e.g. with curl), must end in a 429. If
  `CF-Connecting-IP` were missing on Render, behavior is as before (no
  worse). Claude's own attempt to probe production was blocked by the
  permission check.
- Translations: new or changed text goes into both languages in
  `frontend/src/i18n/messages/`; a new backend error message also needs
  its Khmer in `apiErrors.ts` (otherwise Khmer shows a general line).
  Telegram alerts (backend) are still English only.
- Anyone can still create a store at `/register` (03 says onboarding is
  manual for now). Founder to decide whether to close sign-up before
  launch.
- A customer's page lists their latest 100 orders; older ones are still
  in the Orders tab.
- Back arrows on the order and customer pages go to the `back` the link
  passed in its state (`useBackTo`), else to their list.
- **Load test numbers in shop terms (local, 2026-10-06):** a simulated
  visit lasts ~20 s and makes ~5 requests, so "40 people at once" ≈ 2
  new visitors a second ≈ **~120 people tapping a link per minute** on
  the free plan, **~600 per minute** on Starter. A post that 300 people
  tap in its first 10 minutes (30 a minute) is well inside the free
  plan; a viral post or a TikTok live that brings 1,000 taps in 5
  minutes is not. Local numbers; the live test confirms them.
- Load test: 10 of 3,535 requests failed with "connection reset" at
  0.1 CPU (none in the settled half of the 10-40 people steps), and
  13 of 15,595 at 0.5 CPU (11 of
  them in the first half of a step, while 50 more people arrive within
  5 s). Nothing in the server log. Probably uvicorn closing an idle
  keep-alive connection (after 5 s) just as the test client reuses it,
  which happens more often when the server is slow; browsers retry
  these. If the live test shows errors (502s) at normal load, raise
  uvicorn's `--timeout-keep-alive` in the Dockerfile.
- Render's free workspace also includes **5 GB of bandwidth a month**
  (charged beyond it); 20 MB used by 2026-10-08. The API only sends JSON
  (photos come from R2), so that's well over 100,000 shop visits a month.
- **cron-job.org job (keeps Render awake 7:00-midnight)**, in the
  founder's cron-job.org account: URL
  `https://social-commerce-api.onrender.com/health`, GET; crontab
  `*/10 7-23 * * *` in the job's time zone Asia/Bangkok (same clock as
  Phnom Penh); responses not saved. Alerts by email: on failure after
  3 failures in a row, on success after a failure, on being disabled.
  The 7:00 call reaches a sleeping server: cron-job.org gives up after
  30 s or rejects Render's waking-up answer ("output too large", seen
  in the first test run), but the call still wakes it and the 7:10
  one succeeds (test run on an awake server: 200 OK in 236 ms).
  cron-job.org turns a job off after 25 failures in a row. Pinging less
  often saves nothing: Render counts hours awake, not calls, and 15
  quiet minutes put it to sleep.
- Free-tier limits to revisit before the first real seller (Phase 9): the
  Render free web service sleeps after 15 min idle (slow first request;
  from 7:00 to midnight the cron-job.org job keeps it awake);
  Neon free keeps only a 6-hour restore window, not daily backups. When the
  service moves to a paid instance, switch migrations to `preDeployCommand`.
- `*.r2.dev` is blocked by the company network's filter (Cisco Umbrella,
  which answers with its own 404), so product photos look broken on the
  work laptop, locally and live. Check photos on the phone or at home.
  Other office/school filters may block `r2.dev` for customers too, and
  Cloudflare rate-limits it as a development URL. **Phase 9, with the
  domain:** connect a custom domain to the bucket (e.g. `images.<domain>`)
  and change `R2_PUBLIC_URL`; no code change. Photos uploaded before
  then keep their `r2.dev` address, so switch before real sellers add
  many photos.
- **Similar app in Cambodia: Kommong** (kommong.com, App Store and
  Google Play), found while choosing the domain (2026-10-05). Its site
  says it records orders and manages stock for sellers. Avoid
  "kommong" in any name.
- Links: counts are per device, so a customer who opens the link on
  their phone and orders on a laptop isn't counted; the seller tapping
  their own link in TikTok counts as a view (the dashboard's Open button
  doesn't). Preview bots don't run JavaScript, so they never count.
- Link previews: Facebook caches a link's card; if it was first shared
  while Render was asleep it may keep the generic card for a while
  (Facebook's Sharing Debugger can refresh it). Making a link in the
  dashboard wakes Render, so sharing right after is fine. Changing a
  product's link name still breaks links already shared, tracked or not.
- Links are never deleted (no endpoint); the Links page shows the latest
  200. Add archiving if sellers make many.
- Effects (UX pass 2): `components/effects.ts` (confetti, vibration,
  reduced motion), `shop/fly.ts` (photo to the cart), `useBump` (an
  effect when a value changes, not on first show). Animations that
  leave a transform behind would pin the fixed bottom bars inside a
  card to it, so entrance animations use `backwards` fill. The order
  placed confetti is remembered per browser tab (`sessionStorage`).
- Use Neon's **direct** connection string, not the pooled (`-pooler`) one:
  asyncpg's prepared statements don't work through PgBouncer by default.

---

## Requirements Log (quick-reference)

| Date | Source | Request | Status |
|---|---|---|---|
| 2026-10-06 | Founder (shop redesign) | Search in the shop | Logged for later; build when a seller has 30+ products. Details in 03 §6. |
| 2026-10-02 | Founder (testing Phase 4) | One-tap pay for several banks (ABA, ACLEDA, Wing): open the customer's bank app with the amount filled in, and mark it paid automatically | Validate First: ask first sellers which banks their customers use, whether they're a registered business, and whether they'd pay per-payment fees. Details in 03 §6. |

---

## Next Up

1. Founder: check the layout pass (live since 2026-10-04). On your
   phone: the shop, the cart and the dashboard
   with cards running to the screen edges; on the laptop, an order or a
   product: the buttons stay at the bottom while you scroll.
2. Founder: check UX pass 2 on your phone (live since 2026-10-04):
   add something to the cart (the photo flies into the bag),
   watch the cart's bars, place an order (tick and confetti), and in the
   dashboard accept it and walk it to Completed (confetti). Read the
   new Khmer lines (cart: free delivery) and see the Khmer font.
3. Founder: on your phone, order something from your shop, go back to
   the shop (the bar at the top), open Your orders, leave the order open
   while you accept it on another device (it updates within 30 s); try
   the moon / sun button in the shop header.
4. Founder: check the UX pass on your phone (live since 2026-10-04): the
   shop's delivery/payment box, Add to cart pinned on a product, add a
   logo in Settings → your shop (the first real logo upload to R2), the
   Settings menu, an order's summary, a product's options. Read the new
   Khmer with the rest.
5. Founder: read the Khmer on the live site; try dark mode; run the
   rate-limit check (Notes).
6. Founder: check "Sroul" is free on Facebook, TikTok, Instagram and
   Telegram, then buy sroul.com (chosen 2026-10-06); then Claude does
   DNS, `order.sroul.com`, R2 photo domain, cookie sessions.
7. Founder: backup bucket, token and secrets (`docs/BACKUPS.md`).
8. First real seller: data, walkthrough, `docs/REGRESSION_CHECKLIST.md`
   Part A on the live site, revoke the Telegram token.
9. Founder: the live load test from home (the bcrypt fix is live)
   (`backend/loadtest/README.md`); send Claude the
   summary lines. Decide Render free vs Starter with those numbers.
