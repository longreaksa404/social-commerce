# Project Status

> **Last updated:** 2026-10-03 (Phase 5 closed after the founder's live test)
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

**Next: Phase 6 — Telegram** (not started)

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

Phase 1 is deployed and tested by the founder on the live site (2026-10-01).
One part of its definition of done is carried forward: adding a product
image needs Cloudflare R2, which the founder will set up later.

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

**Phase 1 (deployed 2026-10-01; founder-tested on the live site):**

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

---

## In Progress

- [ ] **Carried over from Phase 1 (founder, later):** Cloudflare R2 bucket +
      API token + public dev URL + CORS, then the five `R2_*` env vars in
      Render; upload a product photo on the live site. Until then photo
      upload shows "Image uploads are not set up yet" and products have no
      images.

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
- [x] **Customer location: "Use my current location" (GPS, no map on
      screen, no API key) + address note; the seller opens it in Google
      Maps** (2026-10-03). Typed address, GPS, or both.
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

Still open (noticed in Phase 2, not built; founder to decide):

- [ ] **Link previews when sharing.** Facebook, Messenger, Telegram and
      TikTok build the preview card (title + photo) without running
      JavaScript, so every shared shop/product link previews as the generic
      "Social Commerce" page. Fix: a small Vercel function on `/shop/*`
      that adds Open Graph tags from the API. About 3–5 hrs, $0 on Vercel
      Hobby, one more piece to maintain. Suggest doing it with Phase 8
      (shareable links).
- [ ] **Small photos for the product grid.** The grid loads each product's
      full photo (up to 1600px, a few hundred KB); 20 products can be
      several MB on mobile data. Fix: the phone also makes a ~480px copy
      at upload time and the grid uses it (no new service). About 2–3 hrs.
      Matters once R2 is live and shops have many photos.

---

## Decisions Made This Session (not yet reflected in 01/02/03)


- Development moved from a Claude Project chat to Claude Code. Docs live in
  `docs/` in the monorepo; `CLAUDE.md` is at the repo root.
- `01_PROJECT.md` renamed to `01_PRODUCT.md` to match cross-references.
- Hour estimates are now an upper bound. Time tracking dropped (2026-10-02):
  `docs/TIME_LOG.md` removed; actual hours are not logged.
- Notion kanban dropped; Phase task tables in 03 are the checklist.

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
- "Use my current location" needs https (or localhost): it works on the
  Vercel site, not on a phone opening the dev server by LAN IP.
- The courier's tracking number goes in the seller's note, which the
  customer doesn't see. Showing a tracking number to the customer would
  be a small addition if sellers want it.
- Store slugs are global; product/category slugs are unique per store.
  Names with no Latin letters (e.g. Khmer only) get a short random slug.
- Storefront pages call `useShop` themselves instead of waiting for the
  layout, so a product link costs one round trip. New public endpoints go
  under `/shop/{store_slug}` (`app/api/shop.py`) and use the `Shop` /
  `ShopDb` dependencies; the router-level rate limit covers them.
- Bundle: 155 KB gzipped after Phase 5, 149 KB after Phase 4 (141 KB after Phase 3, 131 KB
  after Phase 2), mostly
  React DOM, React Router and TanStack Query. Lazy-loading the seller dashboard was measured (saves ~8 KB for
  customers) and skipped for now; revisit when later phases make the
  dashboard bigger (it would also need a reload-on-stale-chunk fallback).
- Free-tier limits to revisit before the first real seller (Phase 9): the
  Render free web service sleeps after 15 min idle (slow first request);
  Neon free keeps only a 6-hour restore window, not daily backups. When the
  service moves to a paid instance, switch migrations to `preDeployCommand`.
- Use Neon's **direct** connection string, not the pooled (`-pooler`) one:
  asyncpg's prepared statements don't work through PgBouncer by default.

---

## Requirements Log (quick-reference)

| Date | Source | Request | Status |
|---|---|---|---|
| 2026-10-02 | Founder (testing Phase 4) | One-tap pay for several banks (ABA, ACLEDA, Wing): open the customer's bank app with the amount filled in, and mark it paid automatically | Validate First: ask first sellers which banks their customers use, whether they're a registered business, and whether they'd pay per-payment fees. Details in 03 §6. |

---

## Next Up

1. Phase 6: Telegram (seller notifications, "Ask Seller"). Needs a bot
   from @BotFather, which only the founder can create.
2. Decide on the two Phase 2 proposals above (link previews, grid photos).
R2 setup whenever the founder is ready.
