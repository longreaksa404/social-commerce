# Project Status

> **Last updated:** 2026-10-18 (sign-up check fixes, not pushed: the founder's 7 picks from the sign-up check page, one commit each, see In Progress, "Sign-up check fixes": the phone number comes first on Sign up, and Google, Facebook and TikTok are a small row of logos under the Sign up and Log in forms; what the seller typed survives a reload while they're in Telegram; a Khmer shop name gets an amber "type a link in English letters"; "this number already has a shop" shows in the box with a Log in button; on laptops the price shows without scrolling; the Verified box is plain; before that the same day, delivery and couriers combined, not pushed: checkout offers Delivery or Pickup, with the shop's couriers as an optional pick under Delivery, "Shop chooses" first; the seller picks their driver or a courier in the Send sheet; Settings → Delivery is one Delivery switch with the fee and couriers under it, and chat orders are Delivery or Pickup; new shops start at $2 delivery (8,000៛ for riel); before that the same day, address from the map pin, not pushed: after pinning, checkout shows a small map of the pin and fills in the address box from it, in English or Khmer; before that the same day, shorter texts, not pushed: about 140 hints, empty pages, banners, popups and help steps cut to one short sentence in English and Khmer, see In Progress, "Shorter texts"). 2026-10-17 (UI check fixes, not pushed: the founder's 20 picks from the UI check page, one commit each, see In Progress, "UI check fixes"; the biggest: small Khmer text 13px, underlined links that clear Khmer letters, calmer dark-mode colours, status tags as words, one stand-in for missing photos, laptop pages at one left edge with the bell and share at the top right; less explaining text everywhere; the font is Noto Sans Khmer + Inter (pick A); before that the same day, UX check fixes, all 30 built and pushed (`8a836bd`): one commit each, see In Progress, "UX check fixes"; the biggest: new products no longer start sold out, the customer's order reads Delivered once delivered, a new shop's Orders tab starts with its setup list, "Says paid" in the order list, Accept keeps the order open, payment before shipping for KHQR and bank, one-tap "Cash received, complete" and "Delivered, complete", a share button beside the bell; two API changes, no migrations). 2026-10-16 (Open shop starts the free trial, not pushed: a new shop is in setup, with no time limit and no orders, until the owner taps Open shop, which asks first and starts the 30-day trial; customers see "Opening soon"). 2026-10-15 (shop colour and cover photo, not pushed: eight colours a seller can pick, the shop takes it; a cover photo across the top like a Facebook page, and the shop's large link card made from it; before that the same day, seller's order page redesign, not pushed: one status card with each status's buttons, the customer's name on top, items then one customer card, Send to driver in one step, a ⋯ menu, the next button pinned on phones; red and amber on words only across the app; less motion on the order page; before that the same day, shop links, not pushed: a changed link keeps opening the shop, sign-up shows the link to edit, custom domains logged as a later paid extra; before that the same day, wrong or fake customer phones, not pushed: checkout reads the number back and warns about unusual ones; "Get updates on Telegram" for customers, which shows the seller the number is real; seller tools against fake orders logged). 2026-10-14 (billing by hand, not pushed: the shop's code and Oak's KHQR, "I've paid" with a Telegram alert to the founder, the admin page, daily reminders; ABA PayWay parked on branch `payway`; before that the same day, plan and billing part 1 built: 30-day free trial, Settings → Plan, reminders, no new orders 7 days after the trial or paid time runs out, the founder's `plans` / `paid` commands; before that the same day, pricing decided: Standard $9.99/month or $99/year, no free plan, a payment gateway later, setup free for the first sellers, the frontend moves to Cloudflare Pages). 2026-10-10 (Oak in the shop: the oak leaf mark, "Made with Oak Order", "· Oak Order" and our mark on link cards; performance pass, Phase 2 fixes F1, F5, F6, F9; 2026-10-09: performance audit, Phase 1, `docs/PERF_AUDIT.md`; before that: sign-up with a phone number checked in Telegram; Continue with Google, Facebook and TikTok; privacy, terms and data deletion pages)
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
  - Domain + Cloudflare DNS: deferred to Phase 9; **live on oaksolve.com
    since 2026-10-09**: app https://order.oaksolve.com, API
    https://api.oaksolve.com, photos https://images.oaksolve.com (the
    vercel.app and onrender.com addresses above still answer)

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
performance this project can handle?"; pushed):**

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

**Oak in the shop (founder asked 2026-10-10 "should we add something for
our branding or credit?"; picks 1A 2A 3B 4B 5B, with the mark small; not
pushed):**

- [x] The mark is the **oak leaf** from the Oak Solutions logo (4B), not
      the stock tree: `components/OakLeaf.tsx` in `BrandMark` (login,
      start page, legal pages), `public/favicon.svg`.
- [x] **"Made with Oak Order"** (1A, 2A): at the very bottom of the
      shop's page, each category and the order page, under a thin line,
      the leaf on a small navy tile and "Made with Oak Order" (Khmer
      "ដំណើរការដោយ Oak Order", the founder's wording), then
      Privacy · Terms; each opens in a new tab (`shop/MadeWithOak.tsx`).
      Not on product pages, the cart or Your orders. Checked in the
      browser at 390 px, light and dark, Khmer and English.
- [x] **Link cards** (3B, 5B): titles end in "· Oak Order" (a product's
      with its price) and the picture is the API's copy with our mark
      small in the corner: the logo (256 px) or the product's photo (a
      1200 × 630 card, the whole photo over a blurred copy).
      `GET /shop/{slug}/preview/logo` and `/preview/products/{slug}`
      (`services/preview.py`, `oak_mark.py`, Pillow; photos only from
      `R2_PUBLIC_URL`; 30/min per IP). A shop without a logo gets our
      plain mark (`public/og/oak-mark.png`). Every other page, and a shop
      link while Render sleeps, gets the generic card in `index.html`
      (`public/og/oak-order.png`: the leaf, "Oak Order", the start
      page's line in Khmer and English). iPhone home-screen icon added
      (`public/apple-touch-icon.png`). Middleware run locally as
      Facebook's bot; pictures drawn from sample photos; not yet seen on
      the live Facebook or Telegram.
- [x] Correction: link previews already existed (`middleware.ts`, since
      2026-10-03); the options page wrongly showed today's shop link as
      "Oak Order" only. That's only the fallback while the API sleeps.
- [x] 4 new pytest tests (the logo and photo pictures, the plain mark,
      another shop's or a hidden product 404, only our own photos
      fetched); 618 in all. Lint and build pass.

**Wrong or fake customer phones (founder's picks 2026-10-15; not pushed):**

- [x] Part 1: under the checkout's phone field, the number is read back
      once it's whole ("The seller will call 012 345 678. Check it's
      right…"); a number no Cambodian mobile or landline starts like
      gets an amber warning (it doesn't block; the API still decides).
      `frontend/src/lib/phone.ts`.
- [x] Part 2: "Get updates on Telegram" on the customer's order page
      while it's in progress. The customer opens Oak's bot, taps Share
      my phone number (the bot says the shop will see it), and gets a
      Khmer message with a View order button when the seller confirms,
      packs, sends, rejects or cancels the order, when the delivery is
      on the way, delivered or failed, and when a KHQR / transfer
      payment is recorded paid (never the same thing twice; nothing for
      preparing, completing, assigning a driver or cash). Later orders
      from that phone at that shop get updates too. The seller's order
      shows "Phone confirmed in Telegram", or the Telegram number when
      it's another one (founder's pick: still send updates, show it as a
      second number). New column `customer.telegram_phone` (migration
      `c3f8a1d6e2b4`); `customer.telegram_user_id` is now written.
      Blocking the bot stops the updates. `forget-customer` clears both.
      Privacy page updated (2026-10-15).
- [x] Checked: the bot flow through the local webhook with a stand-in
      bot (start, share another number, the order page turns to "You'll
      get updates", the seller sees 097 123 4567); screenshots of both
      pages at iPhone width. Not yet tried in real Telegram.
- [x] 23 new pytest tests (`tests/test_customer_updates.py`: codes,
      the link needs the order's phone and the bot, the same phone in
      two shops (tenant isolation), each tap's message, a blocked bot);
      the suite passes. Lint and build pass.

**Shop links (founder's pick 2026-10-15; not pushed):** the founder
asked about making a chosen link a paid extra. Not taken: choosing it
stays free (it's in the Standard plan, and sellers share their link
during the trial); a custom domain is logged as a later paid extra (03
§6).

- [x] A changed link keeps working: the old one is kept for that shop
      (new table `store_old_slug`, RLS, migration `e5a9c2f7b318`), so
      `/shop/<old>/...` opens the shop and the page moves to the current
      link (path and `?l=` kept; the link's view is counted once, under
      the current link). No other shop can take an old link, at sign-up
      or in Settings (409 `SLUG_TAKEN`); a shop can change back to its
      own. Settings → Link no longer warns that shared links stop
      working: no confirm, a hint says they still open the shop.
- [x] Sign-up (and finishing a Google / Facebook / TikTok sign-up) shows
      "Shop link" under the store name, filled from the name as it's
      typed until the seller types their own. A name in Khmer only leaves
      it empty (left empty, the API still picks a random one). A taken
      link is a 409 on that field; the phone check isn't used up.
- [x] Checked in the browser: an old link with a path and `?l=` lands on
      the new one; the sign-up field fills from "Sokha Fashion", stays
      empty for "សុខា", and keeps what the seller typed.
- [x] 8 new pytest tests (`tests/test_store_links.py`, with tenant
      isolation of old links); 689 in all. Lint and build pass.

**Seller's order page redesign (founder's picks 1A 2A 3A 4A 5A 6A 7A,
2026-10-15; not pushed):** from an options page that started from
today's page and its problems (a new order showed ten buttons for one
decision; the total, method and "Delivered" twice; "Delivered" as the
big button while the customer said they'd paid). Also the founder's rule
from the same review: red and amber on the words only, no tinted boxes,
pills or borders (this page; other screens still have some, ask first).

- [x] **One status card** (`fe87b1c`, 1A): the To do card, the status strip
      and the Delivery and Payment cards are one card with a row each for
      the order, the delivery and the payment, each with its own
      buttons. The row waiting on the seller is shaded with the dark
      button, in the order a seller works: accept; a payment the customer
      says they made; send to a driver; deliver; complete. A new order
      shows only Reject / Accept. Short path kept: Delivered (cash:
      "Delivered, cash received") works without assigning anyone.
- [x] **The customer's name as the title** (2A), the number bold under it
      with the time and total (founder asked for the number bolder).
- [x] **Items, then one customer card** (3A): Call and Copy beside the
      phone, then the address, note and map. The customer's note is a
      grey message bubble above the items under "Note from the customer"
      (founder's pick 7A, with that label instead of "<name> wrote").
- [x] **Send to driver in one step** (4A): a sheet with the message,
      "Driver's name and phone number (optional)" (founder's wording),
      Send (shares or copies, then records the delivery as assigned) and
      "Save without sending".
- [x] **⋯ menu** (5A): Cancel order, Delivery failed, Payment failed, Not
      paid after all.
- [x] **Pinned button on phones** (`9612b15`, 6A): once the status card
      scrolls away, the shaded row's buttons slide up at the bottom.
- [x] After the founder's test (2026-10-15): the pinned button now
      follows the dark button itself (on a short order the card never
      left the screen, so it never showed); no pop on a status that
      changes and no confetti or vibration on Complete (this page only;
      other motion stays). Red and amber on words only everywhere
      (dashboard and shop): reminders, notices and errors as coloured
      words on plain cards; red / amber tags as words without a pill;
      danger buttons, the confirm dialog's included, as red words with a
      grey outline; no red border on a field with a problem; the bell's
      count and the setup dot navy. The small dot before a status in the
      order list and the shop's stock line kept.
- [x] Checked in headless Chromium against the local API: phone (English
      and Khmer, light and dark) and laptop; #1004 walked through Mark
      paid with a note, Send to driver (message copied, assigned with the
      driver's name), Delivered, Complete; the menu, the sheet and the
      pinned button. No console errors. Frontend only: no API change, no
      migration; lint and build pass.

---

**Shop colour and cover photo (founder's picks 1A 2A 3A 4A 5A and OK on
the data, 2026-10-15; not pushed):** the founder asked whether sellers
could make the shop their own without effort. Picked from the options
page (artifact "Shop Colour and Cover").

- [x] Two new columns on `store` (migration `a7d3e9b2c4f1`): `color` (navy,
      teal, forest, olive, coffee, wine, plum or charcoal; default navy,
      so existing shops don't change) and `cover_url`. 02 §5, §6, §9.3,
      §11 updated.
- [x] Shop colour (1A 2A): Settings → the shop has eight swatches, saved
      on tap, and "See your shop". In the shop everything navy takes it
      (the wash at the top, the chosen tab, the + buttons, the cart bar,
      Checkout, links, focus rings), light and dark (`shop/colors.css`:
      navy's own steps at another hue; white on a button at least 12:1
      light, 6:1 dark). Oak's leaf in "Made with Oak Order" stays navy.
      After trying it, the founder asked for the seller's dashboard in
      the shop's colour too: done (`dashboard/Layout.tsx`). Then six
      light colours (pink, sky, mint, peach, lilac, sand: pastel buttons
      with dark words, `text-on-accent`; migration `b8e4f0c3d5a2`), and
      the cover, logo and colour now change only on Save, like the rest
      of the page (founder: "click save first before change").
- [x] Cover photo (3A 5A): `POST /seller/store/cover`; the phone keeps the
      middle 3:1 strip (at most 1800 × 600 JPEG), saved at once. The shop
      shows it like a Facebook page: edge to edge on phones, the logo
      over its bottom edge, the name beside it; the header stays small
      and turns solid as soon as the page moves. Optional, not on the
      setup checklist.
- [x] Link card (4A): a shop with a cover shares as a large 1200 × 630
      card made from it, with the logo and Oak's mark
      (`/preview/cover`); without one, the logo card as before.
      `move-photos` rewrites covers too.
- [x] Checked in headless Chromium against the local API: phone (light,
      dark, scrolling), laptop, Settings (the swatches on one row at
      390 px), the menu's summary; the crop (4000 × 3000 → 1800 × 600,
      900 × 900 → 900 × 300); the card drawn from a sample cover; the
      link-preview tags with and without a cover. A real upload to R2
      wasn't tried locally (it would write to the bucket): try it live.
- [x] 5 new pytest tests (colour, cover upload, another shop's cover
      refused, staff refused, the cover card); 694 in all. Lint and
      build pass.
- [ ] Founder: check the Khmer words: រូបក្រប (cover photo) and the colour
      names (ខៀវចាស់, ខៀវបៃតង, បៃតងចាស់, បៃតងអូលីវ, ពណ៌កាហ្វេ,
      ក្រហមចាស់, ស្វាយចាស់, ប្រផេះចាស់).

- [x] **The acorn: Oak Solutions' logo and Oak Order's name**
      (2026-10-15, founder's picks over five rounds; the hexagon leaf was
      a stand-in). Oak Solutions: the acorn, tilted, with no shape around
      it; "**Oak** Solutions" on one line for wide spaces, stacked (Oak /
      SOLUTIONS) for square ones. Oak Order: the name, with the acorn's
      cap pressed onto the O (drawn from Kantumruy Pro Bold's own O);
      where the name doesn't fit, the acorn alone. Chat bubble, bag and
      other shapes were tried and dropped (a bubble reads as a chat app).
      Swapped in: `OakOrderName` in the sign-in, start and legal pages'
      header and the shop's "Made with Oak Order" line; the acorn in
      `favicon.svg` (navy, light blue on a dark tab),
      `apple-touch-icon.png`, `og/oak-mark.png`; `og/oak-order.png`
      redrawn with the new name; the link-picture corner badge is now a
      navy tile with the white acorn (`oak_mark_*.png`). Preview tests
      pass; lint passes. (The build currently stops on
      `dashboard/settings/fields.tsx`, the shop-colour work in progress,
      not this change.)
- [ ] Founder: check the name on the sign-in page (phone and laptop), the
      start page, the bottom of a shop, the browser tab and a shop link's
      picture. Oak Solutions files for Facebook and print are in `brand/`
      (the acorn as SVG and PNG, both name layouts).

## In Progress

**Sign-up check fixes** (founder, 2026-10-18: "1A 2A 3C 4A 5A 6A 7A",
after a review of the Create your shop page,
https://claude.ai/artifact/11wRCCK465YBpEEfoSnx3R, 7 problems ranked;
number 1 came from the founder's question: "phone number is the main
identification right? if so should show it first. and the social media
or google login is just small or optional"). Numbers are the page's;
each is its own commit. Frontend only.

- [x] 1. The phone number comes first on Sign up (Verify with Telegram
  above the shop name): every shop has one and logs in with it, and a
  Google / Facebook / TikTok sign-up still asks for it on the next page.
  Google, Facebook and TikTok are now one small row of logos at the
  bottom of Sign up ("or sign up with", under the price line) and Log in
  ("or log in with", under the Log in button). Google draws its own
  square "G"; Facebook and TikTok are our 40 px squares, named for
  screen readers. **Risk the founder accepted (2026-10-18):** Meta's
  login button guidelines name "Continue with Facebook" as the label and
  TikTok asks for its own button pack, so either may ask for named
  buttons when they look at the app; those two then go back to full
  buttons under the form (`ProviderButton` without `iconOnly`). Checked
  with stand-in keys: Google's "G" only draws with the real client ID,
  so look at it after a push.
- [x] 2. What the seller typed on Create your shop (shop name, link,
  their name, never the password) and the Telegram check they opened are
  kept on the phone for 30 minutes. If the page reloads while they're in
  Telegram (phones short of memory, Facebook's and TikTok's own
  browsers), they come back to the form filled in, and the number they
  shared shows as verified without sharing again. "Use another number"
  forgets the check; creating the shop forgets everything. Set up your
  shop (after Google, Facebook or TikTok) keeps its own the same way.
  Checked in the browser: type, Verify, reload → fields back, password
  empty, the same check read again, verified once shared.
- [x] 3. The phone number's label has the red * like the other required
  fields, on Create your shop and Set up your shop (pick C: the * only;
  Verify with Telegram stays a navy button).
- [x] 4. Shop link: after a shop name with no English letters (e.g.
  ហាងសុខា), the empty link box says in amber words "Type it in English
  letters, or we pick a random one." (សូមវាយជាអក្សរអង់គ្លេស បើមិនវាយ
  យើងនឹងដាក់តំណចៃដន្យឱ្យ។) instead of looking filled in; the grey
  example now reads "e.g. sokha-fashion", and the link under the box is
  in the normal font. Still optional. Same on Set up your shop.
- [x] 5. A shared number that already has a shop no longer shows a green
  "Verified" box with a small grey line under it: the box itself shows
  the number, "This number already has a shop." in amber words, a Log in
  button and "Use another number". With the phone first (1), the seller
  sees it before typing anything else. Set up your shop says its longer
  "Log in with it, then connect Google in Settings" the same way; in
  Settings → Your account, "Another account already has this number." is
  now amber in the box too (it was red under it).
- [x] 6. Laptops: the language switch sits on the title's row (all the
  log-in pages), and Create your shop's fields are a little closer, so
  at 1366 × 768 the price ("Free for 1 month…, then $9.99 a month") and
  the terms line show without scrolling, in English and Khmer.
  "Already have an account? Log in" is now under the row of logos (1),
  so it stays below the fold there when the logos show (14 px below
  without them). Phones and tablets don't change.
- [x] 7. The "Verified with Telegram" box is a plain box like the fields
  (it was mint with a green border, dark green in dark mode): the tick
  and "Verified with Telegram" carry the green. Also on Set up your shop
  and Settings → Your account.

Then, a shorter form (founder, 2026-10-18: "shop link should follow
their shop name. and their name should follow their telegram name. so
both should no need to input while register, and they can edit them
later"; then on the link: "it should a random", picked "Code only"):

- [x] No "Your name" at sign-up: the bot keeps the Telegram account's
  name with the number (new column `phone_check.telegram_name`, founder
  approved the data model change; migration `5e89ca8ba3c8`), and a new
  seller starts with it, e.g. "Sokha Chan" (else the shop name). After
  Google, Facebook or TikTok, the name is that account's, as before.
  Settings → Your account changes it. `POST /auth/register`'s
  `full_name` is optional. Checked: 709 backend tests (2 new), and in
  the browser a sign-up with a check saved as "Sokha Chan" shows that
  name in Settings → Your account.

**UI check fixes** (founder, 2026-10-17: "1A 2A 3A 4A 5A 6A 7A 8A 9A 10A
11A 12A 13A 14B 15B 16A 17A 18A 19A 20A … fix all now", after the
visual-only check of every screen, https://claude.ai/artifact/Kj67umM8xsdkEKHT6h422f,
20 problems ranked). Numbers are the page's; each is its own commit. The
founder also asked for less explaining text everywhere and a better font
(options page https://claude.ai/artifact/8d2Cknax5L8DD8qmPGPDw8, waiting
for a pick).

- [x] 1. Small Khmer text is 13px instead of 12px (hints under fields,
  the labels over each status, the tab bar, stock tags); English keeps
  12px. One rule on `<html lang="km">` in `index.css`.
- [x] 2. Text links and text-only buttons are underlined (Log in with
  email instead, Forgot password?, Edit the details, Hide this list,
  Remove logo, View customer, All your orders, Privacy · Terms): a thin
  light line set low enough to pass under Khmer subscripts instead of
  through them. Navy links no longer read as labels.
- [x] 3. Dark mode: softer status colours. Amber words (Unpaid, Says
  paid, Only 1 left) are a warm sand instead of bright yellow (#ffd230 →
  #ebbb6e), and red, green (Paid, the free-delivery bar) and blue (New,
  With the driver) are calmer too. Light mode unchanged.
- [x] 4. A rejected or cancelled order's delivery and payment rows are
  no longer faded to half strength (their text was 2:1); they show at
  full strength with the status words in grey, since nothing is left
  to do.
- [x] 5. On an order, two buttons that don't fit side by side (e.g. Try
  again + "Delivered, cash received" in Khmer) go one under the other,
  full width, instead of squeezing a label onto two lines. Short pairs
  (Reject / Accept, Send / Delivered) stay side by side.
- [x] 6. Done steps in the setup list (Settings and the Orders tab) keep
  the green tick and grey words but lose the line through them, which
  ran through the middle of the Khmer letters.
- [x] 7. Call, Telegram and Copy buttons have one look: the app's
  outlined rounded-square button. The customer's order page lost its
  round-ended pills, the order's Call / Copy beside the phone are
  square icon buttons, and Call on a customer's page is outlined (the
  dark button stays for the next step).
- [x] 8. Status and stock tags are plain coloured words, no pills,
  joined by a grey dot like the seller's order list: the customer's
  Your orders ("Waiting for the seller to confirm · Not paid yet",
  "Paid" in green words), Products ("Stock 10 · 3 options"), Settings →
  Plan ("29 days left").
- [x] 9. Laptops: every dashboard page starts at the same left edge
  beside the sidebar. Forms and detail pages (a customer, a product,
  Categories, Notifications) stay a narrow column but no longer float in
  the middle, so the title doesn't jump when you open something.
- [x] 10. Laptops: the sidebar's first row is the shop's logo and name
  alone ("Dara Phone Shop" no longer cut to "Dara / Phone…"); share and
  the bell sit at the top right of the page. Phones unchanged.
- [x] 11. A product without a photo shows one stand-in everywhere: a
  picture icon on a soft grey tile (was a bag in the order list and an
  order's items, a picture in Products, a crossed-out picture in the
  shop). In the dark shop it's a grey tile, not a navy hole. Replaces the
  bag of the earlier pick 4A.
- [x] 12. Rows that scroll sideways (the shop's categories, the Orders
  tabs on phones) fade softly at both ends instead of slicing a chip in
  half, and open scrolled so the chosen one shows with the one before it.
- [x] 13. Checkout's delivery choices use drawn radio rings like the
  seller's New order (empty ring, navy dot when picked), instead of the
  browser's own, which dark mode drew as grey discs.
- [x] 14. "+ New order" on Orders is the dark button, like "+ Add",
  "+ New link" and "+ New category" on their pages (pick 14B).
- [x] 15. "Oak Order" is one colour: navy, and light navy in dark mode
  (pick 15B), at the bottom of every shop page and in the log-in and
  sign-up header. In dark mode its acorn O was a dim blue beside white
  "ak Order".
- [x] 16. A shop without a cover photo: its name sits level with the
  middle of the logo (it lined up with the logo's top), the description
  under the name. Shops with a cover unchanged.
- [x] 17. Labels over a group look the same everywhere, like the labels
  over form fields (dark, medium): the product page's "Choose an option"
  and "Ask the seller", an order's "Deliver to" and "Note from the
  customer", Settings' "Couriers", "Telegram" and Plan's "What's included".
- [x] 18. Faint small words are readable: the counts in Products' All /
  Active / Hidden tabs are darker grey, and "+ delivery" after the total
  on checkout's Place order button is plain white.
- [x] 19. Notifications: every icon is grey in a grey circle, the colour
  is on the title's words (Says paid and Running low in amber, Sold out
  in red, as everywhere else; it was an amber triangle).
- [x] 20. The start page's big "Oak Order" has the acorn's cap on its O,
  as the logo does (it was plain letters under the logo).
- [x] Less explaining text (founder, 2026-10-17: "reduce or remove if not
  necessary explain text everywhere"). Only whole sentences were removed;
  no Khmer was rewritten. Gone: the intro under each Settings page title
  (Payments, Delivery, Discounts, Contact, Alerts, Shop link, Your
  account, Plan, Export, Staff, Set up your shop), New order's intro, the
  log-in and sign-up subtitles, the link page's "how views count", the
  customer page's note on rejected orders, "Optional. Customers see it…"
  under Tell the customer a step, and hints that repeated their label
  (shop description, free delivery from, pickup address, Telegram
  username, couriers, KHQR / bank / cash / own delivery / pickup
  switches, product photos, Shown / Hidden, stock, a chat order's address
  and note, other logins, add password, add staff). Cut to their one
  useful sentence: currency ("Existing prices are not converted."),
  orders paused, resume on, auto-accept, Bakong ID, merchant name,
  account number, delivery fee ("Leave empty for free delivery."), low
  stock, Messenger, contact phone, a staff password, display ("For this
  phone."), cover, logo, product description and link name, shop name at
  sign-up ("You can change it later."), checkout's directions and notes
  (no "Optional."), and the customer's order page ("On another phone,
  open this link…"). Kept: formats, rules and warnings (password length,
  English letters for the link, changing a link, Leave empty, …).
- [x] Delivery and couriers combined (founder, 2026-10-18: "own delivery
  and couriers should combine ... show the couriers as optional",
  picked "Yes, both"). Checkout has two cards, Delivery ($2.00, "By the
  seller or a delivery company.") and Pickup; under Delivery, when the
  shop lists couriers, "Delivery company (optional)": Shop chooses, J&T
  Express, VET Express. Shop chooses is picked to start with, so a
  Phnom Penh customer taps Delivery and moves on; a Takeo customer near a
  VET branch taps VET. A couriers-only shop takes "Shop chooses" too.
  Settings → Delivery is one Delivery switch (no more Own delivery):
  on shows the fee, free-delivery rules and "Couriers (optional) ·
  Customers can pick one, or leave it to you."; off hides them; then
  Pickup. A chat order (+ New order) is Delivery or Pickup, the courier
  picked when sending. The seller picks when sending: the order card says
  "Your driver or a courier" with Send, and the Send sheet has "Send
  with: Your driver / J&T Express / VET Express", starting from the
  customer's pick, so "Sent with J&T Express" and the tracking number
  work as before. New shops start at $2 a delivery (8,000៛ if they switch
  to riel before saving Delivery); the setup list still asks them to set
  it, and Settings says "Not set yet: $2.00 a delivery". Shops from
  before keep their fee (free if never set) and their reminder.
  01 §1097, 02 §5 (`delivery.courier`, `delivery_config`) and §7.3
  updated.
- [x] Address from the map pin (founder, 2026-10-18: "after select the
  location map pin should auto show the address", picked "Both"). After
  Confirm location, checkout shows a small map with the pin under
  "Location pinned" (tap it to move the pin), and the address box fills
  itself, e.g. "Street 396, Sangkat Boeng Keng Kang Ti Bei, Khan Boeng
  Keng Kang, Phnom Penh" or in Khmer "ផ្លូវ ៣៩៦ សង្កាត់បឹងកេងកងទី ៣ ...",
  with "From the map. Add the house no. if it's missing." under it.
  It never replaces words the customer typed; Remove takes the pin's
  words with it. Uses OpenStreetMap's free address lookup (Nominatim):
  $0, no account, about one lookup a second for all shops together; if
  it fails or is busy the box just stays as it was. Frontend only.
- [x] Shorter texts (founder, 2026-10-18: "short the hints and
  descriptions text in the whole system"; style approved from 12
  before/after examples). About 140 texts in `frontend/src/i18n/messages/`
  rewritten to one short sentence, at most two, in both languages: field
  hints, empty pages, banners, popups, KHQR steps, the map's hints and
  errors, sign-up and password reset, Plan. E.g. reject: "Items go back
  to stock. The customer sees it wasn't accepted. Can't be undone.";
  account number: "Needed for ABA and some other banks."; checkout
  phone: "For the seller to reach you, and to check your order.".
  Warnings, formats and rules stay. Not touched: buttons, titles, the
  legal pages, API error messages (their Khmer is keyed by the backend's
  English). The Khmer is Claude's shortening: founder to check.
- [x] A better font (founder's pick A, 2026-10-17, from
  https://claude.ai/artifact/8d2Cknax5L8DD8qmPGPDw8): Noto Sans Khmer for
  Khmer (its letters keep their loops, easier to read small) and Inter
  for English and prices, instead of Kantumruy Pro. The name "Oak Order"
  keeps the logo's letters (a 2 KB piece of Kantumruy Pro). Khmer 59 KB +
  English 48 KB, each loaded once (was 57 + 33 KB).

**UX check fixes** (founder, 2026-10-17: "fix all now", after the
two-pass UX check of every screen, https://claude.ai/artifact/Nyex4Sn8MAZipTB2rwrL6Z,
30 problems ranked). Numbers are the page's; each is its own commit.
All 30 built and pushed 2026-10-17 (`8a836bd`; founder: check CI and see Next Up). Checks: ruff,
pytest (702 passed), oxlint, build; each screen looked at on a 390 px
phone, and 32 dashboard and 14 shop screens swept in Khmer and English
for text cut off or pages wider than the phone (none).

- [x] 1. New products: the stock box starts empty and must be filled in
  ("How many do you have?"); 0 says "Customers will see Sold out" in
  amber words. New size or colour rows too.
- [x] 2. The customer's order page: four steps (Ordered, Confirmed, On
  the way, Delivered; Ready to collect / Collected for pickup) instead of
  six, the last two read from the delivery. A parcel the seller marked
  delivered now reads Delivered before they tap Complete, and the bar
  moves when it goes out with a driver. The header truck and the order's
  30-second check stop once it's delivered. No status changes (founder
  agreed to change the 6-step pick of 2026-10-07).
- [x] 3. A new shop's Orders tab starts with "Get your shop ready · 0 of
  6": the setup list from Settings (pick 7C), the next step with its own
  button in its row (Add, Set fee, Set up, Open shop), until the first
  three steps are done and the shop is open (or the list is hidden). The
  delivery-fee reminder waits until then, since it's step 2.
- [x] 4. "Open shop" now only means starting to take orders. Buttons that
  just show the shop say "View your shop" (មើលហាងរបស់អ្នក): Settings →
  Shop link and Settings → your shop.
- [x] 5. "Says paid" in the order list (amber words) once the customer
  taps "I've paid", until the seller marks it paid; on the order, the
  payment line reads "Says paid at 7:09 AM" instead of "Unpaid", with
  "Check your bank app for $28.50". API: order rows carry
  `payment_claimed_at` (no data model change; test in test_telegram.py).
- [x] 6. Accepting an order keeps it open, where Send to driver is now
  the next step, with "Accepted. 3 more new orders · Next ›" on top.
  Rejecting still opens the next new order (founder agreed to change the
  pick of 2026-10-08).
- [x] 7. KHQR and bank orders: Mark paid is the shaded next step before
  sending; the delivery keeps its buttons with "Not paid yet" in amber
  words, so a trusted customer's parcel can still go. A failed payment
  is the next step itself: "Ask the customer to pay again, or cancel the
  order", with Back to not paid and Cancel order (no longer in the ⋯
  menu meanwhile). Founder agreed to change the step order of 2026-10-15.
- [x] 8. A delivered cash order whose cash isn't recorded: the dark
  button is "Cash received, complete" (records the payment, then
  completes); "Complete without the cash" is in the ⋯ menu. The
  customer's page stops saying "Pay $X in cash when you get your order"
  once it's delivered ("$X in cash, on delivery."). 02 §7.4 unchanged.
- [x] 9. After "I've paid", the customer's payment card leads with "You
  told Srey Mom Fashion you paid (7:09 AM)" and Send the receipt again;
  the QR or bank account folds behind "Show the QR again" / "Show the
  bank details again".
- [x] 10. Sharing the shop: a share button beside the bell (phones: the
  share list with the shop's link; laptops: copied, "Shop link copied"),
  and Settings → Shop link has Copy link and Share first, with View your
  shop and Share with a tracked link as links under them. The header
  button is new (founder said yes, 2026-10-17).
- [x] 30. The shop's name in the dashboard header and laptop sidebar
  wraps onto a second line instead of being cut to "Srey Mom Fas…".
- [x] 11. Checkout shows one Address box; "+ Directions for the driver"
  (was "Address note") and "+ Note for the seller" open their boxes when
  tapped (open already when they have words, e.g. a saved address note).
- [x] 12. The shop's delivery, payment and discount tags became up to
  three short lines under the name ("Delivery $1.50 · free on orders from
  $40.00 · free pickup", "Pay by KHQR, bank transfer or cash on
  delivery", "$3.00 off orders from $30.00"), so products start higher.
  A product page shows its Details right after the options and Ask the
  seller, without the shop's lines. Founder agreed to change the tags of
  2026-10-07.
- [x] 13. Delivery words: "Not sent yet" and "With the driver" (a
  courier's: "Sent with J&T Express") instead of Not assigned / Assigned;
  "Book courier" is gone (the app books nothing). A courier's sheet is
  "Send with J&T Express": Tracking number, "Save: sent with J&T
  Express" first, "Share the details" second. Who has it reads "Driver:"
  or "Tracking:".
- [x] 14. The five optional step buttons (Preparing, Ready, Shipped,
  Picked up, On the way) sit behind one link on the order, "+ Tell the
  customer a step"; the order shows only the buttons that move it on.
- [x] 15. A paid order's Delivered reads "Delivered, complete"
  ("Collected, complete" for pickup) and does both in one tap. Unpaid
  orders keep the two steps (02 §7.4).
- [x] 16. An existing product's photos are part of its form: a picked
  photo uploads at once, but adding, removing and the main photo reach
  the shop only on Save (Save waits for uploads; leaving asks first),
  like the shop's cover and logo (founder, 2026-10-15).
- [x] 17. Fix: a failed delivery's message on the customer's order page
  has its own line; in English it ran off the side and the page scrolled
  sideways on a phone (421 px on a 390 px screen).
- [x] 18. New order from a chat starts with a delivery and a way to pay
  picked: what the seller chose on their last chat order (this device),
  else the shop's own delivery and cash on delivery.
- [x] 19. A product with options keeps Add to cart and Buy now dark (no
  grey "Choose an option" bar); tapping one before choosing scrolls to
  the options with "Pick one first." in amber words.
- [x] 20. The bell's number counts only what the Orders tab can't show:
  "says paid", running low, sold out. New orders stay in the bell's list
  but are counted on the New tab (and come by Telegram), so working from
  Orders no longer leaves the bell at 13. API: the unread count leaves
  out new orders (tests updated, one added).
- [x] 21. Money on a rejected or cancelled order: the customer's page
  says "If you paid $28.50, message Srey Mom Fashion to get your money
  back" when it was paid or they said so; the seller's Reject / Cancel
  question adds "Sokha Chan says they paid $28.50: check your bank app,
  and send it back if it came" (or "It's paid ($X): send the money
  back").
- [x] 22. Checkout: placing an order without a delivery or a way to pay
  shows the app's own red words under it ("Choose how to get your
  order.", "Choose how to pay.") and goes there, instead of the
  browser's popup in the phone's language.
- [x] 23. Settings → Plan during the trial (more than a week left, no
  "I've paid" yet): Pay is folded behind "Pay early" with "Nothing to pay
  until Nov 15, 2026". Save QR to photos is now the dark button and "I've
  paid" the plain one, as on a customer's order page.
- [x] 24. A cash order's payment reads "Cash due" (រង់ចាំសាច់ប្រាក់;
  founder to check the Khmer) until the cash is recorded, instead of
  "COD" in English letters, in the list and on the order.
- [x] 25. Order tabs: "Done" (delivered and completed; was Delivered)
  and "Closed" (rejected and cancelled; was Cancelled).
- [x] 26. A customer's money total reads "Ordered" (បានកុម្ម៉ង់សរុប)
  instead of "Spent": it counts orders not paid yet (which orders count
  stays as decided 2026-10-03).
- [x] 27. A pickup order paid in cash says "Pay $24.00 in cash when you
  collect it" (was "when it arrives" / "when you get your order").
- [x] 28. "SKU" on the product page became "Your own product codes
  (optional)" and "Product code (optional)" (លេខកូដទំនិញ).
- [x] 29. "Shop" everywhere in English: Create your shop, Shop name,
  Create shop, the Settings page title, "By creating a shop", and three
  API messages ("This shop link is already taken.", "Shop not found.",
  "This account has no shop."; codes unchanged). Khmer already said ហាង.

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
7. [x] Renamed to **Oak Order** (founder's decision 2026-10-08): the
   start page has "Oak Order" in very large letters instead of ស្រួល
   (and no "Sroul means easy" line); the mark and favicon are a tree on
   navy (lucide `TreeDeciduous`); tab title and home-screen name Oak
   Order; `order.sroul.com` removed from the login page until there's a
   domain. Checked at 390 and 1280 px; lint and build pass. Pushed
   2026-10-08 (`d513015`).
8. [x] Shop grid as a photo wall too (founder's request 2026-10-08):
   each product card as tall as its photo (no square crop), in columns
   like the seller's product list; the + follows each photo's corner;
   the loading grid shows mixed heights. The + now flies the product's
   photo into the cart (it had been flying a plain dot: it couldn't
   find the photo). Checked at 390 and 1280 px with mocked data; lint
   and build pass. Founder checked it locally, 2026-10-08. Pushed.
9. [x] Shop product cards look like the seller's (founder's request
   2026-10-08): each card is a white card with the photo across the top
   and the name, price, and a red "Sold out" tag inside under it (Sold
   out was a pill on the photo), same gaps as the seller's grid. The +
   stays on the photo; the loading grid shows the same cards. Checked at
   390 and 1280 px against the seller's grid; lint and build pass.
   Pushed 2026-10-08 (`6db7125`). Then an amber "Only 3 left" tag on
   cards with 5 or fewer left (products without options; the product
   page warns at the same number; the seller's own list uses their alert
   level, Settings → Alerts, since later the same day). Pushed.

The redesign is complete and pushed (2026-10-08, with the bcrypt fix and
load test). Founder: check CI and the live site once Vercel and Render
have redeployed.

**More in Settings** (founder asked 2026-10-08 and picked from a list:
1–8 and 11, then 9; 10 waits for pricing). Each committed on its own;
pushed 2026-10-08:

1. [x] **Your account** (`10d6911`): name, phone, login email, change
   password (needs the current one; every other phone is logged out).
2. [x] **Stop taking orders for a while** (`7a01da7`): Settings → Orders →
   Take orders off, with an optional day orders open again (by itself,
   Phnom Penh date). Customers can still look around; checkout is
   refused and a notice tops every shop page. The seller's Orders tab
   shows a reminder.
3. [x] **Get help** (`99a7d54`): a Settings row (and the Forgot password
   page) that opens Oak Order's Telegram with the shop named. Hidden
   until `VITE_SUPPORT_TELEGRAM` is set in Vercel (founder: which
   account).
4. [x] **Founder resets a password** (`8a2ac2e`): `python -m app.admin
   reset-password <email>` (docs/ADMIN.md).
5. [x] **Call and Messenger buttons** (`f7c682e`) beside Telegram on a
   product and an order; set in the new Settings → Contact (the Telegram
   username moved there).
6. [x] **Low-stock alert level** (`5a600aa`): Settings → Alerts (the
   Telegram section, renamed). Alerts and the seller's product list use
   it; customers' "Only N left" stays at 5.
7. [x] **Export orders to Excel** (`22ee470`): this month, last month or
   chosen days; one row per order, in English or Khmer.
8. [x] **Forgot password?** (`4808449`): a link to the shop's Telegram
   chat, 30 minutes, works once. Owners only (staff ask their owner).
11. [x] **Close shop** (`ae48902`): with the password; the link and every
   login stop, nothing is erased. Founder's `close-shop`, `reopen-shop`,
   `erase-shop` commands (docs/ADMIN.md).
9. [x] **Staff logins** (`26b42db`): Settings → Staff; helpers log in with
   their own email and can do everything but Settings. The owner sets a
   new password for them or removes them.
10. [ ] **Plan and billing**: waits until pricing is decided (01 §46).

Checked: 521 backend tests pass; ruff, oxlint and the build pass; each
new screen clicked through in headless Chromium at 390 px (settings
also at 1280), the shop notice and the export also in Khmer. Four
migrations to run on deploy (they run on Render's start):
`5ee23aad5482`, `007ae4403215`, `49da40196f18`, `ae070e4b3006`.

**Pre-pilot review fixes** (founder asked 2026-10-09 for a review of the
whole project before 3-5 real sellers; approved "all fix in section 2"
of the review). Each committed on its own; pushed:

1. [x] **No logout on a lost answer** (`09f762b`): a refresh token shown
   again within 60 s of its swap gets a new pair (the phone retrying
   after the answer was lost on a weak connection, e.g. 3G in the
   market); later reuse still ends every session. Logout and ending
   sessions now delete rows instead of setting `revoked_at`. In 02 §5.2
   / §13 since 2026-10-09.
2. [x] **Delivery fee reminder** (`d0eec41`): a new shop runs on free own
   delivery until Settings → Delivery is saved once. `GET /seller/store`
   has `delivery_set_up`; until true, an amber strip tops the Orders tab
   ("Delivery is free for customers until you set your delivery fee",
   opening Settings → Delivery for owners) and the Settings menu's
   Delivery row reads "Not set yet: free for customers". Saving free
   delivery on purpose counts as set up. No data model change.
3. [x] **Products first in a new shop** (`d0eec41`): with no orders and no
   products, the Orders tab says "Add your first product" with an Add
   product button, instead of "share your shop link". Also fixed: an
   owner whose orders are paused with no reopening day saw the staff
   wording; they now see "Tap to turn them back on".
4. [x] **The Telegram bot speaks Khmer** (`364b8ed`): new-order and
   low-stock alerts, the Open order button, the connect / expired-link /
   help replies and the password reset message, in the app's own Khmer
   words. Khmer only: no per-seller language is stored, so a seller who
   uses the app in English also gets Khmer.

Checked: 526 backend tests pass (5 new: retry within the grace, the
grace not stretched by retries, logout inside the grace, delivery set
up / not set up; the old reuse test now reuses after the grace); ruff, oxlint and the build pass. Clicked
through in headless Chromium at 390 px (English) and 320 px (Khmer): new
shop shows the reminder and "Add your first product"; with a product,
"No orders yet"; the reminder opens Settings → Delivery and is gone once
delivery is saved; no sideways scroll; no console errors. No migration.

**Pre-pilot features** (the rest of the review; the founder picked from
an options page 2026-10-09: 1C 2C 3A 4A 5B 6B 7C 8B 9B; H, Khmer alerts,
was fix 4). Each committed on its own; pushed:

1. [x] **Short path, 13 taps → 3 for a cash order** (`73b362a`, 1C):
   after Accept the order's preparing / ready / shipped are optional
   chips and Complete is offered from any step once delivered and paid
   (or cash on delivery); a delivery goes straight to Delivered (assigned
   / picked up / on the way optional; failed once sent out; failed →
   delivered too). "Delivered, cash received" on cash orders records the
   delivery and the payment together, each through its own state
   machine, both or neither (`POST /seller/orders/{id}/cash-handover`).
   The To do card leads with the next real step. Measured in the
   browser: Accept, Delivered cash received, Complete.
2. [x] **Not paid after all** (`2210be2`, 2C): paid or failed → pending,
   any time, after a confirm; `paid_at` and the note cleared; the
   customer is shown how to pay again. Order and delivery steps still
   have no way back; reject / cancel stay final.
3. [x] **Orders from chat** (`5bf030d`, 3A + 4A): "+ New order" beside the
   Orders title → `/dashboard/orders/new`. Phone first (someone who
   ordered before fills in name and address), products from the
   seller's list, the shop's delivery choices and ways to pay, a note.
   `POST /seller/orders` = checkout's prices, stock, totals; taken while
   paused; starts accepted; `order.source = "chat"` (a link can't be
   named "chat"); no new-order alert, low stock still alerts. The order
   says "Added by you from a chat" and has **"Copy link for the
   customer"** (added so a chat customer can follow it and pay by KHQR;
   it was in 3B's mockup, not 3A's).
4. [x] **Send to driver** (`e59bec2`, 5B): on the Delivery card; number,
   customer, phone, address, map link, note, items and "Collect $X cash"
   / "Paid already" / "Paying by KHQR", in the app's language; the share
   list on phones, copied on laptops. Made clearer (2026-10-15): labelled
   blocks with blank lines between (shop name in the title, item count
   and bullets, how the cash adds up, "Address: none given, call the
   customer", and the shop's contact phone at the end).
5. [x] **I've paid** (`f00ad15`, 6B): under the KHQR code or bank
   account; opens the shop's Telegram (or Messenger, the line copied)
   with "I've paid order #1001, $12.00. Here's my receipt:" typed in,
   and `POST /shop/{slug}/orders/{id}/paid` (link + phone; 10/min per IP)
   puts "Sokha says they paid #1001" on the bell plus a Khmer Telegram
   alert (not again within 30 min). The payment stays pending; the
   seller's Payment card shows "Customer says paid · 14:02". No column:
   the newest `payment_claimed` notification row.
6. [x] **Setup checklist** (`1fa7b24`, 7C): "Set up your shop · 2 of 6
   done" tops Settings for owners → `/dashboard/settings/setup` (product,
   delivery fee, ways to pay, Telegram alerts, contact, logo); an amber
   dot on the Settings tab until the first three are done; "Hide this
   list" per device. `GET /seller/store` adds `payment_set_up`.
7. [x] **The owner's numbers** (`633f331`, 8B + 9B), **then taken off the
   Orders tab** (`fd62425`; founder, 2026-10-09, after trying it locally:
   the chart should come with a seller dashboard, and no numbers on the
   Orders tab until then). The server part stays for that dashboard:
   `GET /seller/stats` (owner only, 403 for staff): Today / 7 days / This
   month, sales, orders, not paid yet, sales per day; rejected and
   cancelled orders don't count; Phnom Penh days. In the Requirements
   Log.

Checked: 555 backend tests pass (29 new across the seven); ruff, oxlint
and the build pass (JS 219.5 KB gzipped). Each screen clicked through in headless Chromium at
390 px (English), most also at 320 px Khmer and 1280 px, the numbers
card (since removed) also in dark mode: no sideways scroll, no console
errors. The
customer's progress bar follows the order's own status, so with the
short path it can read "Confirmed" while its delivery line reads
"Delivered", until the seller taps Complete. No migration.

**Photo fixes** (founder's screenshots, 2026-10-09; pushed):
`221ca29` the desktop Products table showed each photo as a narrow
strip (the base `img { max-width: 100% }` squeezed it to the column);
then, on iPhone Safari, the second column of the photo wall (seller
grid, shop grid and its loading grid) started 12 px lower under a stray
line: Safari carries the last card's margin and shadow over to the next
column. The gap is now padding on each item. Checked in headless WebKit
and Chromium at 414 px with mocked data, before and after.

**Shop grid: right column painted late on iPhone** (founder's screen
recording, 2026-10-09; pushed as `03fe087` and `73c09ac`). Tapping a category chip left the
right column blank for 0.3-0.6 s, sometimes half drawn. Causes: CSS
columns fill the left column first, so the right column's cards had the
longest rise delays (up to 320 ms + 300 ms); Safari paints a fading card
outside the first CSS column late; and every tap remounted the cards,
replayed the rise and restarted each photo from a grey square.
1. [x] The shop grid deals its cards into side-by-side columns (2, 3, 4,
   5 as before), reading left to right then down: product 2 now sits
   beside product 1 instead of under it (founder's choice). No photo
   size is stored, so it alternates. Cards rise in only the first time a
   list shows; photos already shown appear at once at their size.
2. [x] Between All and a category the whole page no longer fades in
   again (it was two pages to the app); the chip row is centred on the
   chosen chip before it's drawn. Category to category never faded.
3. [x] The seller's Photos view (Products) flickered on iPhone when a
   card in the right column was tapped while scrolling (founder,
   2026-10-10): the tap shrinks the card a little, and Safari draws that
   late in a CSS column other than the first. It is dealt into columns
   the same way now (`components/columns.ts`), reading left to right;
   the first 4 by that order still load at once (perf F5). Checked on
   the 500-product perf shop in headless WebKit and Chromium at phone,
   1100 and 1440 px: 2/2/4/5 columns, all 500 in the API's order, the
   photos loaded at once are the first 4. Tapping while scrolling can
   only be checked on a real iPhone (founder). Not pushed.

Checked with mocked data in headless WebKit (iPhone 13), Chromium (Pixel
7) and at 800, 1100 and 1440 px, sampling every frame: going back to a
category already opened, or to All, both columns are fully drawn in the
first frame and stay so (before: the right side finished 80-840 ms
after the left). Real iPhone Safari still to check (founder).

**Shop: the order on its way moves into the header** (founder's
screenshot, 2026-10-10: not a strip on top of the shop; picked 1F and
2A on the options page, pushed as `34f7005`; then, the same day, a truck
instead of the box, which read like a second cart, no drop-in when the
shop opens, and a shopping cart instead of the bag; pushed the same day). The full-width bar between the header and
the shop's name is gone. While an order placed on this phone is in
progress (same pages as before: not the order, checkout or Your orders
pages):
1. [x] A truck button in the shop's header, between the language
   button and the cart (founder's OK), with a navy dot, idling as the truck on the order
   page does, so customers notice it (founder's request). A box instead
   when every order in progress is for pickup, as on the order page.
   One order opens it; several open Your orders. Its label (screen
   readers, hover) says what was bought and where it is, e.g. "Zip
   Hoodie and 1 more, Being prepared, Not paid yet"; several: "3 orders
   in progress, 1 not paid yet" (new string).
2. [x] Dropped (founder): the order dropping in under the header for 4 s
   when the shop opens, then shrinking into the button.
3. [x] The cart is a shopping cart instead of a bag (founder picked 1A
   2B on a second options page: the truck stays): in the header, the
   cart bar, Add to cart and the empty cart.
Reduced motion: the truck stays still. Checked with mocked data in
headless Chromium at 390 px (English, light and dark, 1 and 3 orders,
pickup) and 320 px (Khmer). Real iPhone Safari still to check (founder).

**Sign-up with a real phone number; Google, Facebook and TikTok logins**
(founder's decisions 2026-10-09: social logins for ease of use, in the
order Google, then Facebook, then TikTok; phone number and password kept;
phone numbers proved through the Telegram bot's "Share my phone number",
free, instead of SMS; only test shops on the live site). Each committed on
its own; pushed 2026-10-09 (`39caba4`, at the founder's request, to set
up the apps and test on the live site):

1. [x] **Phone check through the Telegram bot** (`978fc50`): the page
   opens `t.me/<bot>?start=phone_<code>`, the bot shows a "Share my phone
   number" button, Telegram sends the account's own number (someone
   else's contact card doesn't count), and the page sees it within a few
   seconds. `python -m app.telegram_poll` answers a test bot from a
   laptop, where Telegram's webhook can't reach.
2. [x] **Register and log in with a phone number** (`c78d55b`): sign-up
   takes the checked number (no email); that Telegram chat gets the new
   shop's order alerts at once. Login and Forgot password take the number
   written any way, or an older account's email behind "Log in with email
   instead" (your test shops). Staff are added with a phone number. Your
   account: change number through Telegram; the email is no longer
   editable. `python -m app.admin` takes a phone or an email and has
   `test-shop` (the load test's seed now logs in to that shop).
   Migration `005c6870a409`: existing phones put in one form; a number
   that couldn't be read, or that an older account already had, was
   cleared (those test accounts keep their email login).
3. [x] **Continue with Google** (`1e5d447`): Google's button on Login and
   Register. A Google account with a shop logs straight in; someone new
   sets up their shop (name, shop name, phone checked in Telegram) with
   no password. Your account shows the Google account, connects one (or
   another), and adds a password. Close shop needs no password when there
   isn't one. **Not joined by phone or email** (differs from what Claude
   first described): a Google sign-up whose phone already has a shop is
   told to log in and connect Google in Settings, because joining on a
   shared phone number would hand the shop to whoever got the owner to
   tap "Share" once. Migration `4520c66e86de` (`seller_login`,
   `password_hash` optional). Off until the Google client ID is set
   (Next Up).
4. [x] **Continue with Facebook and TikTok** (`6863994`; founder asked to
   finish everything before testing, 2026-10-09): their buttons under
   Google's. The browser goes to their sign-in page and back to
   `/auth/<provider>/callback`; the API trades the code with the app's
   secret. New people set up their shop like with Google. Settings →
   Your account → Other ways to log in connects Google, Facebook and
   TikTok and shows each one's email or name. Migration `39a133fd8c02`.
   Off until each app's keys are set.
5. [x] **Privacy policy, terms, data deletion** (`7243183`): `/privacy`,
   `/terms`, `/data-deletion`, English and Khmer, linked from the start
   page and under Create store. Meta and TikTok need these URLs.
   **Founder: read both languages before submitting** (they promise
   erasing within 30 days; the contact is `VITE_SUPPORT_TELEGRAM`).
   Also: the phone check offers Try again when it can't start.
6. [x] **forget-customer** (`ff4576f`): `python -m app.admin
   forget-customer <shop> <phone>` removes a customer's details from a
   shop, as the Data deletion page promises (docs/ADMIN.md).

Checked (steps 1–3): 599 backend tests pass (39 new: the phone check, phone and
email logins, sign-up once per number and per check, staff by phone,
account number change, Google tokens checked for real against a key made
in the tests: wrong signature, app, issuer, expired; sign-up, sign-in,
connect, no-password accounts; no `app_user` grant on `phone_check` or
`seller_login`); ruff, oxlint and the build pass; both migrations go down
and up on the dev database. In headless Chromium at 390 px (English) and
320 px (Khmer), with the bot's messages sent to the webhook by hand:
register → Telegram share → shop created → log out → log in with
`+855 …`; Your account and Staff; Google with a stand-in for Google's
button (a real Google sign-in needs the founder's client ID): a refused
token's message, Set up your shop, Your account with Google and Add a
password. No sideways scroll, no console errors. Three migrations run on
Render's start: `5b3201ea7f7d`, `005c6870a409`, `4520c66e86de`. New
dependency: `pyjwt[crypto]` (adds `cryptography`, for Google's RS256
keys).
Checked (steps 4–6): 612 backend tests pass (13 new: Facebook and
TikTok sign-up, log in, connect, bad codes, codes only back to our own
pages, providers' answers played by a fake; forget-customer), plus the
Google tests on the shared codes; ruff, oxlint and the build pass. In
headless Chromium at 390 px (English) and 320 px (Khmer), with Facebook's
and TikTok's pages and servers faked: cancel → "Couldn't log you in";
Facebook sign-up → Set up your shop → shop; Settings → connect TikTok →
both shown; log out → TikTok logs straight in; a callback this tab didn't
start is refused; the legal pages, start page links and the agree line.
No sideways scroll, no console errors. Four migrations in all on
Render's start: `5b3201ea7f7d`, `005c6870a409`, `4520c66e86de`,
`39a133fd8c02`. **Not yet tried with the real Google, Facebook or
TikTok** (they need the founder's apps). Two things to watch on the
first real try: TikTok's web login is built without PKCE (TikTok's web
docs don't ask for it; if TikTok answers "code_verifier required", it's a
small change), and Facebook may stay limited to the app's own testers
until Business Verification.

**Pre-launch performance pass** (founder asked 2026-10-09: audit first,
then fix only the approved findings, one commit each):

1. [x] **Phase 1, audit** (2026-10-09): `docs/PERF_AUDIT.md` has the surface
   map, the baseline (every endpoint locally, with 2 ms per database round
   trip, and at Render's 0.1 CPU; Lighthouse mobile on 12 pages; request
   traces; burst tests), 17 findings ranked by measured impact, which
   targets are realistic, the iOS / Android review (the build needs iOS 16.4+
   / Chrome 111+) and the device checklist. Tools: `backend/loadtest/
   seed_perf.py` (local `social_commerce_perf` with a 500-product shop) and
   `measure.py` (`77fbca2`). No app code changed. Headlines: the dashboard
   downloads the whole product list (511 KB) on most screens; customers get
   one 255 KB (gzipped) JS file with all the seller code; at 0.1 CPU a burst
   of 50 customers runs the database pool out (500 errors), at 0.5 CPU it
   holds; API answers aren't compressed by the app; the first grid photo,
   the page's main image, is lazy-loaded; an export freezes the API (~36 s
   for a year at 0.1 CPU). Status changes show their spinner in ~10 ms.
2. [x] **Phase 2, fixes.** Founder's picks 2026-10-10: fix F1, F5,
   F6, F9 now; F4 only if the live curl shows no `content-encoding`.
   F2, F16, F17 are decided after the device checklist, run on the live
   site once these are pushed (F2 only if products take 3 s or more to
   show on 4G in an in-app browser). Not taken: F3 (Render stays free,
   decision of 2026-10-08), F10. Deferred: F7 (until a shop passes ~300
   orders), F8 (until a real shop passes ~100 products; the column
   photo wall stays), F11-F15 as in the audit.
   Done 2026-10-10, one commit each, before / after in PERF_AUDIT
   section 10: F1 `ca64fb5` (the product list 5 times to 3 in the
   9-screen trace; the other 2 are the Products screen's own visits),
   F9 `49d96aa` (`/seller/store` 11 to 1, `/seller/account` 6 to 1,
   `/seller/categories` 3 to 1), F5 `7b22bff` (seller Products LCP 13.3 s
   to 7.0 s; on the shop the photo starts ~0.3-0.7 s sooner, LCP within
   noise), F6 `28050ce` (no change measurable locally; a variant that
   waits for photo 1 measured 9.7 s to 6.8 s, F6b, for the founder).
   F4 skipped: no live curl output yet. 614 backend tests, oxlint and
   the build pass after each.
3. [ ] **Paused** (founder, 2026-10-14) until the next features
   are done. F1 accepted at 3 fetches (the Products screen refetches
   for current stock). Pending on resume: section 8 curls (decide F4);
   device checklist (decides F2, F16, F17; F6b by timing the first
   photo on a 1-photo vs a 4-photo product in flow 3; F18 by whether
   order photos fill in late in flow 8). On resume, re-run measure.py
   and Lighthouse on the new features instead of a full new audit.

**Plan and billing, part 1** (pricing decided 2026-10-14, 01 §33.1; the
founder approved the data model the same day and said build it; not
pushed):

1. [x] **Backend** (`55b3cea`): `store.paid_until` (the last day
   covered: day 30 of the free trial from sign-up; shops that exist when
   it deploys get 30 days from that day) and `plan_payment` (RLS;
   sellers may only read it). The stage is worked out when read, no job:
   the last 6 days, then 7 days to pay with orders still coming, then no
   new orders. Customers then see the paused notice, never a word about
   payment; an order from a chat gets `PLAN_UNPAID`; orders already
   placed carry on. `GET /seller/plan`. The founder's `python -m
   app.admin plans` (who to remind) and `paid <login> month|year`
   (shows the days it covers and asks first; `docs/ADMIN.md`). A payment
   carries on from the end of the covered time, or from the day it's
   paid once orders have stopped. 25 tests.
2. [x] **App** (`1849cb9`): Settings → Plan (free until / paid until with
   days left, what's included, Monthly / Yearly with "Save $20.88", "Pay
   $9.99 on Telegram" opening Oak Order's Telegram with the amount and
   the shop typed, the payments so far), its row in the Settings menu,
   the reminder on the Orders tab (owners from day 25; staff only once
   orders stop) and on New order, "Free for 1 month, then $9.99 a month
   or $99 a year." under Create store, and the Terms' Fees (dated
   2026-10-14). English and Khmer.
3. [x] **ABA PayWay, steps 1 and 2** (built 2026-10-14, then parked the
   same day: ABA needs an MOC registration and 6 months of business).
   On branch `payway` (commits `751a975`, `1af6470`, `20d7505`), not
   merged; its migration `747c15ec63b4` never ran on production.
4. [x] **Part 2, hand collection** (founder, 2026-10-14; not pushed):
   Settings → Plan shows the shop's code (OAK-XXXXXX, from the store id)
   and Oak's KHQR (the code as its bill number) and bank account from the
   `OAK_*` settings; "I've paid" makes a waiting payment and a Telegram
   alert to the founder's own shop chat (`ADMIN_PHONES`). The admin page
   (Settings → Oak Order admin): every shop's code, plan and waiting
   "I've paid", "Found it: mark paid" / "Not found" (the seller sees the
   note), and Mark paid (0 = free time). The daily run (`POST
   /billing/run`, cron-job.org) sends Telegram reminders on day 1 and day
   5 after the paid time ends; shops without Telegram see the Orders
   tab's banner. Migration `b7e2c4a9d1f3` (status, failure). 15 tests in
   `test_billing.py`, tenant isolation included (656 in all).

Checked: 643 backend tests, ruff, oxlint and the build pass. In headless
Chromium at 390 px on a local test shop: the trial, 3 days left, 2 days
over and 10 days over (Orders tab, Plan, New order, the shop's notice),
a yearly payment recorded with `paid` (Plan in English and Khmer, the
Settings menu), the sign-up page in Khmer and the Terms' Fees.
Hand collection checked the same way with test settings: Plan with the
code, Oak's KHQR and bank account, "I've paid" then "Oak Order is
checking", the admin list and a shop with "Says paid $9.99".

**Plan and billing, part 3: the trial starts when the shop opens**
(founder, 2026-10-16; not pushed):

1. [x] **Backend** (`3df458b`): `store.paid_until` may be null: a shop
   in setup (migration `ffa0fb97ae00`; shops that exist keep their
   dates). Setup has no time limit; customers see the shop with
   `opening_soon` and checkout answers `ORDERS_PAUSED`; an order from a
   chat gets `SHOP_NOT_OPEN`. `POST /seller/plan/open` (owner) starts the
   30-day trial that day; again, nothing changes. A payment recorded
   before opening opens the shop from that day, with no trial. `plans`
   lists shops in setup last as "not open". 6 new tests (setup, opening,
   tenant isolation, paying in setup, the `plans` list, staff can't
   open); the test fixtures open their shops unless told not to.
2. [x] **App** (`f2a99af`): Open shop on the Orders tab's empty state
   ("Your shop isn't open yet", with View your shop), in place of New
   order's form ("Open your shop first"), on Settings → Plan (no Pay
   section before opening) and as the setup checklist's last step. It
   asks first: "Start your 30-day free trial", free until the day,
   then $9.99 a month or $99 a year, no card. Staff only get the news.
   The shop says "Opening soon" (plain words, not amber) and so does
   checkout's button. The admin page says "Not open". The Orders tab's
   old "Open your shop" button (it only viewed the shop) is now "View
   your shop". The Terms' Fees (dated 2026-10-16) and the line under
   Create store say the trial starts when the shop opens. English and
   Khmer.

Checked: 700 backend tests, ruff, oxlint and the build pass; the
migration down and up again. In headless Chromium at 390 px on a local
test shop in setup: the shop with "Opening soon", the Orders tab, New
order, Settings → Plan and the checklist, the pop-up, opening (toast,
"No orders yet"), Plan with 30 days left, and the shop taking orders.

Phase 9, waiting on the founder:

- **Live load test**, once, before the first real seller, from home
  (`backend/loadtest/README.md` "On the live site"): time the wait
  after 20 quiet minutes, rate limits off in Render, seed + Locust +
  race, rate limits back on, hide the test shop. Send Claude the
  summary lines.

- **Domain:** oaksolve.com live since 2026-10-09 (switch-over pushed as
  `9ff0b9c`; `move-photos` moved 20 products and 1 logo; the founder
  checked login, photos, upload, a test order and the Telegram "Open
  order" link on the phone). Forwards checked from outside the same day:
  `oaksolve.com`, `www` and `http://` → 302 to `order.oaksolve.com`
  keeping the path and query (Cloudflare proxied A records to 192.0.2.1
  and a Redirect Rule; 302 because it becomes Oak Solutions' home page
  later); `social-commerce-eight.vercel.app` → 308 to `order.oaksolve.com`
  (kept as a redirect, not removed: old Telegram and reset links keep
  working, and nobody else can claim the name). `CORS_ORIGINS` and the
  R2 bucket's CORS allow only `order.oaksolve.com` (and localhost for
  R2). The cron-job.org ping still calls the onrender.com address, which
  is the same service. Left: check "Oak Order" as a Facebook page name
  and on TikTok, Instagram and Telegram.
- [x] **Backups:** live 2026-10-14. Bucket `social-commerce-backups`
  (private, 30 nights), its own token, five GitHub secrets; the first run
  (#10, by hand) saved a 94 KB copy. Nightly at 02:00 Phnom Penh
  (`docs/BACKUPS.md`).
- **Read the Khmer** and send corrections.
- **Live check of the rate-limit fix** after deploying (see Notes).
- **First real seller:** who, their products, walkthrough; revoke the
  Telegram bot token at launch; final end-to-end pass on the live site.

---

## Known Issues / Blockers

- **Before charging sellers (2026-10-14):** the frontend has to leave
  Vercel's Hobby plan, which is for non-commercial use only (moving to
  Cloudflare Pages, 03 Phase 9), and Oak Solutions should be registered
  with MOC (01 §46). Sellers pay by hand meanwhile; ABA PayWay needs the
  MOC certificate and 6 months of business.
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

- [x] **Frontend hosting: Cloudflare Pages** (2026-10-14, founder's
      pick 6A). Vercel's Hobby plan is for non-commercial use only, and
      Pro costs $20/month. The move (with `frontend/middleware.ts` as a
      Pages Function) happens before the first seller pays Oak Order;
      until then the app stays on Vercel.
- [x] **Performance pass picks** (2026-10-10): Render stays on the
      free plan (F3 not taken; the 2026-10-08 triggers stand and the live
      load test still decides). The shop and product grids keep the column
      photo wall (F8 deferred until a real shop passes ~100 products).
      Targets are the audit's revised ones (PERF_AUDIT section 5);
      customer first load is judged on real phones, not Lighthouse's
      Slow 4G.
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

- [x] **Domain: oaksolve.com, bought on Cloudflare 2026-10-09** (a .com
      on Cloudflare decided 2026-10-04; 1 year, auto-renew on, in the
      same account as R2). Company **Oak Solutions**. Addresses:
      `order.oaksolve.com` (this app and every shop link, so it must
      never move), `api.oaksolve.com` (Render), `images.oaksolve.com`
      (R2 photos); `oaksolve.com` forwards to `order.` until Oak
      Solutions has a home page. Vercel and Render records DNS only.
- [x] **Brand: Oak; this product is Oak Order** (2026-10-08, replaces
      Sroul / Sroul Order below): one brand for all of the founder's
      projects, each product "Oak + a plain word". The app shows "Oak
      Order" in English letters in both languages, in very large letters
      on the start page; the mark is a tree on navy (the oak leaf since
      2026-10-10, below). At
      `order.oaksolve.com` (2026-10-09; Oak Shop considered: "shop"
      twice in a shop link, and the seller's shop should be the only
      shop a customer sees).
- [x] **Oak's mark is the oak leaf, and shops credit Oak Order**
      (2026-10-10, founder's picks 1A 2A 3B 4B 5B): the leaf from the Oak
      Solutions logo replaces the stock tree everywhere; "Made with Oak
      Order" with Privacy · Terms at the bottom of the shop's grid pages
      and the order page; link cards end in "· Oak Order" with the mark
      small on the picture; shops without a logo get the plain mark.
      Hiding the line is logged for paid plans.
- [x] ~~**Brand: Sroul (ស្រួល, "easy"); this product is Sroul Order**~~
      (replaced by Oak on 2026-10-08) (2026-10-06, replaces khmerorder.com from 2026-10-05, which was
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

The free trial starts when the shop opens (2026-10-16, founder: "do
it"): no trial at sign-up; a new shop is in setup, with no time limit,
until the owner taps Open shop, which shows the trial's end and the
price, then starts the 30 days. In setup customers can look but not
order, and the seller can't add chat orders (a customer order is never
held waiting for the seller to start a trial). Applied the same day to
01 §33.1 (the trial bullet, "day 1 is the day the seller opens the
shop", §46's pricing line) and 02 §5 (`store.paid_until` nullable),
§6.2 (`POST /seller/plan/open`, the `setup` stage).

Shop colour and cover photo (2026-10-15, founder's picks 1A 2A 3A 4A
5A, data OK): eight calm colours a seller can pick (navy by default);
everything navy in the shop and in the seller's dashboard takes it
(the dashboard was added at the founder's request after trying it); a 3:1
cover photo across the top of the shop like a Facebook page, which also
becomes the shop's large link card. Both optional. 02 updated in the
commits. Waiting for the founder to apply to 01 §23.1 (Store) and the
03 §4 Phase 9 table (text given in the session).

Customer phones (2026-10-15, founder): the checkout reads the phone back;
customers can get order updates on Telegram, which proves their number;
a different Telegram number still gets updates and shows to the seller
(`customer.telegram_phone`). Waiting for the founder to apply to 01 and
02 (text given in the session): 01 §19/§27, 02 §5 `customer`, §6 API,
§12.

Subscription billing: by hand until PayWay (2026-10-14, founder):
sellers pay Oak by KHQR or bank transfer to Oak's account; the founder
marks them paid in the admin page. ABA PayWay needs an MOC registration
certificate, an ABA account, ID and 6 months of business (ABA's reply,
2026-10-14), so the PayWay checkout and auto-charge (picks 1A 2B 3A
4ok) are parked on the payway branch. The daily job sends payment
reminders instead of retrying charges. Applied the same day: 01 §33.1
and §46; 02 §5 (`plan_payment`), §6.2 (Plan, Admin), §7.5 (new), §12.5
(new), §3 cost note; 03 Phase 9 row (hand collection, 2 hrs; subtotal
~235 hrs), §4 totals (~463 hrs), §6 log (PayWay: Build Later). This
replaces the PayWay entry below.

Applied to 01/03 on 2026-10-14 (billing through ABA PayWay, the
founder's design; picks 1A cron-job.org runs the daily charge, 2B a web
admin page, 3A retries for 7 days with Telegram on the first failure and
day 5, and the data model): 01 §33.1 and §46; 03 Phase 9 rows (step 1,
26 hrs; step 2, 20 hrs; subtotal ~279 hrs) and §4 totals (~507 hrs).
Found in PayWay's docs: their subscriptions charge weekly, monthly or
every 2 months, so auto-charge is monthly only.

Applied to 01/02/03 on 2026-10-14 (pricing; founder's picks 1B 3A 4B
5A 6A, from a pricing plan the founder brought, and no early-seller
offer): 01 §33.1–33.4 and §46 (open list, decided list, the Oak line);
02 §3 (frontend hosting: Cloudflare Pages; the cost once sellers pay);
03 Phase 9 rows (plan and billing part 1, 12 hrs; the Cloudflare move,
4 hrs; part 2 with a payment gateway, 20 hrs; subtotal ~253 hrs), §4
totals (~481 hrs, ~37 weeks), §6 log (the Oak line stays on Standard).
Not built: nothing in the code has a trial or a plan yet, so every shop
is free with no end date.

Applied to 01/02/03 on 2026-10-10 (Oak in the shop, founder's picks 1A
2A 3B 4B 5B): 01 §1.1 (the mark is the oak leaf) and §46 (decided list);
02 §9.3 (Oak in every link card); 03 Phase 9 row (4 hrs) and §6 log
(hide the line on paid plans).

Applied to 01/02/03 on 2026-10-09 (founder said yes), in two parts:

- Sign-up with a phone number checked in Telegram, phone logins,
  Continue with Google, Facebook and TikTok, the legal pages: 02 §2 Auth
  row, §4.3, §5.1, §5.2 `seller` + new `seller_login` and `phone_check`,
  §5.3, §6.2 Auth and Account/staff, new §12.4 Phone Check, §13; 01
  §23.1; 03 Phase 9 row, 24 hrs.
- The pre-pilot review (founder's picks 1C 2C 3A 4A 5B 6B 7C 8B 9B and
  the four fixes): 02 §7.1 (the short path), §7.2 (Not paid after all),
  §7.3 (seller_delivery steps optional, Delivered cash received), §6.2
  (orders from chat, cash handover, stats, I've paid), §5.2
  (`order.source` chat, `notification_log` payment_claimed,
  `refresh_token` 60 s retry), §12.1 (I've paid alert, Khmer-only bot),
  §13 (the retry); 01 §23.1 and §24 (I've paid); 03 Phase 9 row, 32 hrs.
- 03 totals: Phase 9 subtotal ~213 hrs (~16.5 weeks); total ~441 hrs
  (~34 weeks).

Applied to 01/02/03 on 2026-10-08 (at the founder's request): "More in
Settings" (01 §23.1 Settings, §11, §46 Business; 02 §4.3, §5.1, §5.2
seller and store, §6.2; 03 Phase 9 row, 39 hrs; subtotal ~157 hrs; §4
totals: Phase 9 157 hrs, total ~385 hrs). The decisions, from the
founder's picks:

- **Data model** (02 §5, approved with the picks): `store.orders_paused`,
  `store.orders_resume_on`, `store.contact_phone`,
  `store.messenger_username`, `store.low_stock_alert` (default 5);
  `seller.role` (owner/staff) and `seller.store_id` (staff only).
- **Close shop = close now, the founder erases later** on request (not
  automatic deletion, not immediate erasing).
- **Staff can do everything but Settings**; the owner adds them with an
  email and a first password (no email is sent).
- **Forgot password goes to the shop's Telegram chat**; without
  Telegram, the founder resets it by command.
- **Plan and billing wait for pricing** (01 §46 subscription price,
  free trial).
- **Orders export is a real .xlsx** (XlsxWriter, a small write-only
  library), not CSV: phones keep their 0, Khmer reads correctly.

Applied to 01/03 on 2026-10-08 (at the founder's request): the rename
to Oak Order (01 §1.1 and the §46 decisions list; 03 Phase 9 redesign
row).

Applied to 02/03 on 2026-10-08 (at the founder's request): Kantumruy
Pro for all text (02 §2 Fonts row) and the frontend redesign (03 Phase 9
row, 14 hrs; subtotal ~114 hrs; §4 totals: Phase 9 114 hrs, total ~342
hrs).

Applied to 02/03 on 2026-10-08 (at the founder's request): the load
test (03 Phase 9 row, 4 hrs; subtotal ~118 hrs; §4 totals: Phase 9 118
hrs, total ~346 hrs) and Render kept awake from 7:00 to midnight by
cron-job.org (02 §3 Backend hosting row; 03 Phase 9 "Decided" note).

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
- The refresh token is an httpOnly cookie (live 2026-10-09, with
  oaksolve.com); the access token is in memory only.
  Refreshes are serialized across tabs.
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
- A payment marked paid or failed goes back to pending with "Not paid
  after all" (founder's pick 2C, 2026-10-09); order and delivery steps
  have no way back.
- KHQR codes are made in `app/services/khqr.py` (no dependency); the
  tests pin it to strings from NBC's SDK. The frontend draws them with
  `uqr`. The KHQR card's red header is plain text "KHQR", not NBC's logo
  file.
- Payment details on the order page are the store's current ones, not a
  copy from ordering time, and disappear if the seller turns the method
  off (the customer is told to ask the shop).
- Since the short path (1C, 2026-10-09) the order's own `processing →
  ready → shipped → delivered` steps are optional for every method; a
  pickup customer reads them as "Ready to collect / Handed over /
  Collected" when the seller uses them, so a seller who wants pickup
  customers told "Ready to collect" taps Ready.
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
  The Telegram bot's messages (backend) are Khmer only since 2026-10-09:
  a new bot message is written in Khmer, with the app's words.
- Staff logins (2026-10-08): Telegram alerts go only to the owner's
  connected chat; the bell's read state is shared by everyone in the
  shop; a removed helper's open session works up to 15 minutes (until
  its access token expires), and so does a closed shop's. Forgot
  password by Telegram is for owners; staff ask their owner (Settings →
  Staff → New password).
- Commit `4808449` ("Forgot password", 2026-10-08) also carries another
  session's uncommitted work on order-detail photos (`api/orders.py`,
  `services/order.py`, `test_orders.py`, `OrderDetail.tsx`), swept in by
  a broad `git add`; its docs came in `2a54bd6`. The code is complete
  and tested; only the commit message doesn't say so. Two Claude
  sessions worked on the repo at once that day: stage files by name.
  It happened again during the performance pass. Run one session at a
  time when both touch the frontend.
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
  domain:** connect a custom domain to the bucket (`images.oaksolve.com`)
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
| 2026-10-15 | Founder (customers giving wrong or fake phones) | Seller tools against fake orders: "Couldn't reach the customer" when cancelling, a "No cash on delivery" / block mark on a customer | Validate First: build when a seller gets a fake order. Parts 1 and 2 built instead. Details in 03 §6. |
| 2026-10-10 | Founder (Oak in the shop) | Let sellers on a paid plan hide "Made with Oak Order" | Decided 2026-10-14: the line stays on the Standard plan; hiding it may come with a later plan (01 §33.1). Details in 03 §6. |
| 2026-10-09 | Founder (trying the numbers card locally) | A seller dashboard: a page for the shop's numbers, with the chart (sales per day; today, 7 days, this month) | Later: the page first, then the chart on it. The server part is ready (`GET /seller/stats`, owner only). Details in 03 §6. |
| 2026-10-08 | Founder (Settings) | Plan and billing page: the seller's plan, price, paid-until date, how to pay Oak Order | Built 2026-10-14, not pushed: part 1 (trial, Settings → Plan, no new orders when unpaid) and part 2 by hand (the shop's code, Oak's KHQR, "I've paid", the admin page, reminders). ABA PayWay parked on branch `payway` (03 §6). |
| 2026-10-06 | Founder (shop redesign) | Search in the shop | Logged for later; build when a seller has 30+ products. Details in 03 §6. |
| 2026-10-02 | Founder (testing Phase 4) | One-tap pay for several banks (ABA, ACLEDA, Wing): open the customer's bank app with the amount filled in, and mark it paid automatically | Validate First: ask first sellers which banks their customers use, whether they're a registered business, and whether they'd pay per-payment fees. Details in 03 §6. |

---

## Next Up

000000000000000. **Sign-up check fixes** (all 7 picks built, not pushed;
        In Progress, "Sign-up check fixes"). Frontend only, no
        migrations, no new variables. After a push, on your phone in
        Khmer, light and dark:
        1. Create your shop starts with Verify with Telegram; Google,
           Facebook and TikTok are a row of logos at the bottom (and
           under Log in's button). Check Google's square shows its "G"
           on the live site: here it could only be tried with a stand-in
           key, which never draws it. If it's blank, tell me.
        2. Type a shop name in Khmer: the empty link box says in amber
           to type one in English letters.
        3. Fill in the shop name, tap Verify with Telegram, share your
           number, come back: everything is still there, even if the
           page reloaded (try closing and reopening the tab within 30
           minutes).
        4. Share a number that already has a shop (095748182): the box
           says so in amber, with a Log in button.
        5. On a laptop at 1366 × 768, the price shows under Create shop.
        New Khmer to check: ឬចុះឈ្មោះជាមួយ (or sign up with),
        ឬចូលគណនីជាមួយ (or log in with), សូមវាយជាអក្សរអង់គ្លេស
        បើមិនវាយ យើងនឹងដាក់តំណចៃដន្យឱ្យ។ (type it in English letters,
        or we pick a random one). Logo-only Facebook and TikTok buttons
        may need to become named buttons if Meta or TikTok asks
        (In Progress, item 1).
00000000000000. **UI check fixes** (all 20 picks and the text cut built,
        and the new font, not pushed; In Progress, "UI check fixes").
        Frontend only, no migrations, no new variables. After a push, on
        your phone in Khmer, light and dark (the first visit downloads
        the new fonts once):
        1. Hints and the tab bar read bigger (13px); text links are
           underlined, below the letters (log in, Settings → Payments,
           the bottom of a shop).
        2. Dark mode: Unpaid / Says paid are sand, not bright yellow.
        3. A rejected order reads clearly; a failed delivery's two
           buttons sit one under the other.
        4. Your orders and Products: plain words with dots, no pills.
        5. A category: the chips fade at the edge; checkout's radios are
           rings in dark mode.
        6. Laptop: the sidebar shows the whole shop name; share and the
           bell are at the top right; pages start at one left edge.
        7. Read the Settings pages: tell Claude if a removed hint is
           missed anywhere.
        8. The new font: Khmer with loops (Noto Sans Khmer), English and
           prices in Inter; "Oak Order" looks as before. Then update 02
           §2 Tech Stack, the Fonts row (text in Claude's message of
           2026-10-17).
0000000000000. **UX check fixes** (all 30 built, pushed 2026-10-17 as
        `8a836bd`; In Progress, "UX check fixes"). No migrations, no new
        variables. Founder: check CI (GitHub → Actions) and that Render
        and Vercel deployed, then on your phone (Khmer):
        1. Products → Add: the stock box starts empty and asks "How many
           do you have?"; 0 says "Customers will see Sold out".
        2. Place an order as a customer, accept it, Send to driver,
           Delivered: the customer's page reads Delivered (four steps).
        3. KHQR order: "I've paid" → the list says "Says paid"; Accept
           stays on the order with "Next ›"; Mark paid is the dark step.
        4. A cash order with a driver: "Delivered, cash received", then
           on a delivered one "Cash received, complete".
        5. The share button beside the bell; Settings → Shop link: Copy
           link first.
        6. A new test shop: Orders starts with "Get your shop ready".
        7. Read the new Khmer words and change any that sellers wouldn't
           say: "Cash due" រង់ចាំសាច់ប្រាក់, "Not sent yet" មិនទាន់ផ្ញើចេញ,
           "With the driver" នៅជាមួយអ្នកដឹក, tabs "Done" រួចរាល់ /
           "Closed" បានបិទ, "Ordered" បានកុម្ម៉ង់សរុប, "Tell the customer
           a step" ប្រាប់អតិថិជនពីជំហាន, "Pay early" បង់មុន.
        8. `docs/REGRESSION_CHECKLIST.md` Part A is updated for these.
000000000000. **Open shop starts the trial** (built, not pushed). Founder:
        push (the migration only lets `paid_until` be empty; shops that
        exist now keep their trial or paid dates). After that, a new
        sign-up is in setup until its owner taps Open shop. Try it with
        a new shop: the Orders tab, the shop link ("Opening soon"), then
        Open shop.
00000000000. **Shop colour and cover photo** (built, not pushed).
        Founder: push (the migration adds two columns at start), then in
        Settings → your shop pick a colour and add a cover, open the shop
        on your phone (light and dark), and share the shop link in
        Telegram to see the big card. Facebook keeps a link's old card:
        use its Sharing Debugger's "Scrape Again".
0000000000. **Seller's order page redesign** (built, not pushed). Founder:
        push, then open a few orders on your phone: a new one, one where
        the customer says they paid, and a cash order with a driver.
000000000. **Customer updates on Telegram** (built, not pushed). Founder:
        push when ready, then on the live site place an order, tap "Get
        updates on Telegram", share your number with the bot, and move
        the order along from the dashboard: each step should arrive in
        Telegram, and the order should show "Phone confirmed in
        Telegram". No new variables (it uses the same bot).
0000000. **Hand collection** (built, not pushed; In Progress, "Plan and
        billing" 4). Founder:
        1. Render variables: `OAK_KHQR_ACCOUNT=abaakhppxxx@abaa`,
           `OAK_KHQR_ACCOUNT_INFO=019782164` (the founder's ABA **USD**
           account; ABA gives every customer the bank's Bakong ID plus
           the account), `OAK_KHQR_BANK=ABA Bank`; no `OAK_KHQR_NAME`
           (the code shows OAK ORDER). Tested locally 2026-10-14: a
           payment from Wing landed in the USD account (the first test,
           with the riel account's number, was exchanged into riel).
           ABA's receipt shows the KHQR's name as "Outlet" but not its
           bill number, so the name now carries the shop's code ("OAK
           ORDER OAK-SBZ9WZ"). Optional: `OAK_BANK_NAME`, `OAK_BANK_ACCOUNT_NAME`,
           `OAK_BANK_ACCOUNT_NUMBER` (the same USD account); `ADMIN_PHONES` (your login number;
           your shop's Telegram chat gets the "I've paid" alerts);
           `BILLING_CRON_SECRET` (a long random string).
        2. ~~cron-job.org: a job once a day, POST
           https://api.oaksolve.com/api/v1/billing/run, header
           `X-Cron-Secret: <the same secret>`.~~ Done 2026-10-15: daily
           08:00 Asia/Bangkok (= Phnom Penh, inside the /health awake
           hours), no body; test run answered 202 in 288 ms.
        3. Push. Then on the live site with a test shop: set its
           paid-until to yesterday (ask Claude for the one-line command
           against Neon) → the next run sends the reminder → tap "I've
           paid" → your Telegram alert → Settings → Oak Order admin →
           Found it: mark paid → paid-until moves on a month. And a shop
           8 days over refuses orders until marked paid.
        4. Register Oak Solutions with MOC (01 §46) before charging
           sellers; PayWay (branch `payway`) after 6 months of business.
000000. Pricing (decided 2026-10-14, 01 §33.1). (a) PayWay: parked
        (item above). (b) Part 1 is built, not pushed (In Progress, "Plan and
        billing"). After a push: every shop gets 30 days from that day;
        set `VITE_SUPPORT_TELEGRAM` in Vercel, or Settings → Plan has no
        "Pay on Telegram" button; run `python -m app.admin plans` on the
        live database (docs/ADMIN.md); read Settings → Plan and the
        Terms' Fees in Khmer. (c) **Cloudflare Pages** (the move decided
        2026-10-14; before the first seller pays): the code is ready and
        not pushed (link previews in `linkPreview.ts`, run by a Pages
        Function and, until the switch, by the Vercel middleware;
        `public/_headers`; `.node-version`). Founder, after a push:
        1. Cloudflare → Workers & Pages → Create → Pages → Connect to
           Git → the GitHub repo (allow Cloudflare's GitHub app).
           Project name `oak-order`, production branch `main`.
        2. Build: framework preset None, build command `npm run build`,
           output directory `dist`, root directory `frontend`.
        3. Variables (Production): copy every `VITE_` variable from
           Vercel's project settings (`VITE_API_URL` =
           https://api.oaksolve.com, `VITE_SENTRY_DSN`,
           `VITE_SUPPORT_TELEGRAM`, `VITE_GOOGLE_CLIENT_ID`,
           `VITE_FACEBOOK_APP_ID`, `VITE_TIKTOK_CLIENT_KEY`). Deploy.
        4. Open `oak-order.pages.dev`: the start page and a shop load
           (logging in only works on order.oaksolve.com). Paste a
           `oak-order.pages.dev/shop/...` link into Facebook's Sharing
           Debugger: the shop's card.
        5. Pages project → Custom domains → `order.oaksolve.com`; let
           Cloudflare replace the record that points at Vercel. Then
           remove the domain in Vercel.
        6. Check on order.oaksolve.com: log in, Settings → Plan, a test
           order, a shop link in Facebook's debugger and in Telegram.
        7. Tell Claude Code: it removes `middleware.ts`, `vercel.json`
           and `@vercel/functions`, and updates CLAUDE.md and the docs.
           Then delete the Vercel project. The old
           `social-commerce-eight.vercel.app` address stops forwarding
           then; it only matters for links shared before 2026-10-09
           (test links).
00000. Founder: Oak in the shop (after a push). (a) See the Khmer line
       at the bottom of a shop, "ដំណើរការដោយ Oak Order". (b) Paste a shop link, a
       product link and order.oaksolve.com into Facebook's Sharing
       Debugger (developers.facebook.com/tools/debug, "Scrape Again")
       and into a Telegram chat: titles ending in "· Oak Order", the
       logo or photo with the leaf in the corner. Links shared before
       keep their old card until Facebook reads them again (about every
       30 days) or you press Scrape Again. (c) Add the app to an
       iPhone's home screen: the icon should be the leaf.
000. Founder: set up and test sign-up and the three logins in one go
     (founder's plan, 2026-10-09). Each part stays hidden until its keys
     are set, so the order doesn't matter.
     a. **Read** `/privacy`, `/terms`, `/data-deletion` (English and
        Khmer; on the dev server or after a push). Set
        `VITE_SUPPORT_TELEGRAM` in Vercel: it's the contact on those
        pages.
     b. **Locally:** your **test** bot in `.env` (`TELEGRAM_*`,
        `PUBLIC_API_URL` empty), `python -m app.telegram_poll` beside
        uvicorn, then Create your store → Verify with Telegram → Share
        my phone number. Your old test shops log in with "Log in with
        email instead".
     c. **Google** (free, ~15 min), console.cloud.google.com: project
        "Oak Order"; Google Auth Platform → Branding (name Oak Order,
        your email, the privacy and terms URLs); Audience: External, then
        **Publish**; Clients → Create → Web application, JavaScript
        origins `https://order.oaksolve.com` and
        `http://localhost:5173`. Client ID → Render `GOOGLE_CLIENT_ID`,
        Vercel `VITE_GOOGLE_CLIENT_ID`, and your `.env`.
        **Done 2026-10-13:** keys in Render and Vercel; tried live
        (sign-up, log in again, connect in Settings). No logo on the
        consent screen (a logo needs Google's brand verification).
     d. **Facebook**, developers.facebook.com: create an app (use case
        "Authenticate and request data from users with Facebook Login");
        Facebook Login → Settings → Valid OAuth Redirect URIs
        `https://order.oaksolve.com/auth/facebook/callback` (and
        `http://localhost:5173/auth/facebook/callback` to try locally);
        App settings → Basic: privacy policy URL
        `https://order.oaksolve.com/privacy`, terms URL `.../terms`,
        data deletion instructions URL `.../data-deletion`, an icon, a
        category; permissions `public_profile` and `email`; then switch
        the app to Live. App ID → Render `FACEBOOK_APP_ID` and Vercel
        `VITE_FACEBOOK_APP_ID`; App secret → Render `FACEBOOK_APP_SECRET`
        only (never Vercel). If Meta asks for Business Verification,
        Facebook works only for the app's testers until the business is
        registered.
        **Status 2026-10-13:** app created (ID 1814899622969522, keys in
        Render), tried live in Development mode: sign-up and connect in
        Settings work for the founder (the app's admin). Going Live needs
        Business verification through a Meta Business Suite portfolio,
        then App Review (likely a demo video): waits for the registered
        business. Until then `VITE_FACEBOOK_APP_ID` stays out of Vercel
        (no button for sellers it wouldn't work for); add it back and
        redeploy once the app is Live.
     e. **TikTok**, developers.tiktok.com: create an app, add Login Kit,
        platform Web; website `https://order.oaksolve.com` (verify the
        domain as it asks), redirect URI
        `https://order.oaksolve.com/auth/tiktok/callback`, terms and
        privacy URLs as above, scope `user.info.basic`; submit for
        review. Client key → Render `TIKTOK_CLIENT_KEY` and Vercel
        `VITE_TIKTOK_CLIENT_KEY`; client secret → Render
        `TIKTOK_CLIENT_SECRET` only. TikTok takes only https redirects,
        so it can be tried only on the live site.
        **Status 2026-10-13:** `oaksolve.com` verified (TXT record at the
        root); Sandbox keys in Render and Vercel, the founder's TikTok a
        target user. Tried live: connect in Settings, then log in with
        TikTok, works (no PKCE needed). Submitted for review the same day
        (Login Kit, `user.info.basic`, demo video). **After approval:**
        swap in the Production client key and secret (Render both, Vercel
        `VITE_TIKTOK_CLIENT_KEY`, redeploy Vercel); shops connected with
        the Sandbox may need TikTok connected again (TikTok's ID differs
        per app). A rejection's reason is under the app's history icon.
     f. Pushed 2026-10-09 (`39caba4`). Check CI (GitHub → Actions) and
        that Render deployed (four migrations run on its start). Then on
        your phone: Create your store with a phone; Continue with Google,
        Facebook and TikTok; Settings → Your account → Other ways to log
        in; `docs/REGRESSION_CHECKLIST.md` has the steps. Tell Claude
        what each one did.
00a. Founder: check the new mark (the acorn, and "Oak Order" with the
     acorn's cap on the O, 2026-10-15) after the push: the browser tab, the start page and
     login header (white on navy, navy on white), the shop's "Made with
     Oak Order" line, a shop link's preview picture (logo with our mark in
     the corner; a shop without a logo gets `og/oak-mark.png`), and the
     iPhone home-screen icon (remove and re-add it). Chats and Facebook
     keep old previews for a while.
00. Founder: try the four fixes and the seven picks (In Progress,
    "Pre-pilot review fixes" and "Pre-pilot features") on the dev server
    or on the live site (pushed); `docs/REGRESSION_CHECKLIST.md` has the
    new steps.
0. Founder: try the new Settings pieces (list under In Progress, "More
   in Settings") on the dev server or after a push; choose the Oak Order
   support Telegram account and set `VITE_SUPPORT_TELEGRAM` in Vercel;
   check CI and the live site after the push of 2026-10-08 (four
   migrations run on Render's start).

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
6. Domain: done, live on order.oaksolve.com (2026-10-09). Founder:
   check "Oak Order" on Facebook, TikTok, Instagram and Telegram.
7. Founder: backup bucket, token and secrets (`docs/BACKUPS.md`).
8. First real seller: data, walkthrough, `docs/REGRESSION_CHECKLIST.md`
   Part A on the live site, revoke the Telegram token.
9. Founder: the live load test from home (the bcrypt fix is live)
   (`backend/loadtest/README.md`); send Claude the
   summary lines. Decide Render free vs Starter with those numbers.
10. Founder: performance pass, **paused until the next features are
    done** (founder, 2026-10-14). (a) From home, run the three curl
    commands in `docs/PERF_AUDIT.md` section 8 and paste the output to
    Claude. (b) Run the device checklist (section 9) on an iPhone and an
    Android phone and send the grid. (c) Take the results to the planning
    project to decide F2, F16, F17.
