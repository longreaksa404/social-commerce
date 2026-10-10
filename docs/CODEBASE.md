# Codebase Reference

> **Snapshot of the code at commit `bcea56e` (2026-10-06).** Written for an
> assistant that can't see the repo. It describes what the code does now,
> not what `02_TECHNICAL.md` plans. Where the two differ, section 11 says so.
>
> For project status and decisions, `04_STATUS.md` is the authority; for
> scope and the plan, `03_DEVELOPMENT.md`; for intended design,
> `02_TECHNICAL.md`. Keep this file in step when models, endpoints, state
> machines or key files change.
>
> Checked when written: 446 backend tests pass, `ruff check` and
> `ruff format --check` are clean on committed code, the frontend builds
> (`tsc -b && vite build`) and `oxlint` passes. The Alembic head is
> `883276fadeed`.

Product in one line: a multi-tenant ordering platform for small Cambodian
sellers who sell through Facebook, TikTok and Instagram. A seller gets a
dashboard and a public shop at `/shop/<slug>`. Customers check out as guests
(no account) and pay by cash on delivery, bank transfer or KHQR. Every
payment is confirmed by the seller by hand. The brand is Oak / "Oak
Order" (01 §1.1): the start page, logo, tab title and favicon say so; the
FastAPI title, the dev container and the Render service still say
"Social Commerce".

---

## 1. Implementation status

Judged from the code. **DONE** = the code for the task exists and is used.
**PARTIAL** = some of it exists. **NOT STARTED** = nothing in the repo.
Founder-side checks on the live site are in `04_STATUS.md`.

### Phases 0–8: all DONE

| Phase | Task (03) | Status | Where |
|---|---|---|---|
| 0 | Monorepo setup | DONE | `backend/`, `frontend/`, root `.env.example`, `.gitattributes` |
| 0 | FastAPI skeleton, settings, health check | DONE | `app/main.py`, `app/core/config.py`, `GET /health` |
| 0 | Postgres + Alembic | DONE | `alembic/` (async), `docker-compose.yml` (local), Neon in prod |
| 0 | SQLAlchemy base, tenant convention | DONE | `app/db/base.py` `TenantMixin` (`store_id`) |
| 0 | React + Vite + TS + Tailwind | DONE | `frontend/` |
| 0 | CI | DONE | `.github/workflows/ci.yml` |
| 0 | Deploy skeletons | DONE | `backend/Dockerfile`, `render.yaml`, `frontend/vercel.json` |
| 0 | Sentry | DONE | backend `SENTRY_DSN`, frontend `VITE_SENTRY_DSN`; off when empty |
| 1 | `seller`, `store` tables | DONE | `app/models/account.py`, migration `abd12fdb8cf6` |
| 1 | Register / login / refresh / logout + JWT | DONE | `app/api/auth.py`, `app/services/auth.py` |
| 1 | Password hashing, auth dependency | DONE | `app/core/security.py` (bcrypt in a thread), `app/api/deps.py` |
| 1 | Dashboard shell, protected routes, login/register | DONE | `frontend/src/dashboard/Layout.tsx`, `src/pages/` |
| 1 | `product`, `product_variant`, `category` tables | DONE | `app/models/catalog.py`, migration `f49fee3833a0` |
| 1 | Product CRUD (soft delete) | DONE | `app/api/products.py`, `app/services/product.py` |
| 1 | Category CRUD | DONE | `app/api/categories.py`, `app/services/category.py` |
| 1 | Image upload (presigned R2) | DONE | `app/services/images.py`, `frontend/src/lib/images.ts` |
| 1 | Product list + form UI | DONE | `src/dashboard/products/` |
| 1 | Category UI | DONE | `src/dashboard/Categories.tsx` |
| 1 | RLS policies | DONE | migration `ccd7d9bce820` plus one per later table |
| 2 | Public storefront endpoints | DONE | `app/api/shop.py`, `app/services/storefront.py` |
| 2 | Storefront layout, product, category pages | DONE | `src/shop/ShopLayout.tsx`, `ShopHome.tsx`, `ShopProduct.tsx`, `ShopCategory.tsx` |
| 2 | Mobile styling | DONE | mobile-first Tailwind throughout |
| 3 | `customer`, `order`, `order_item` tables | DONE | `app/models/order.py`, migration `8980a033af6d` |
| 3 | Cart (device only) | DONE | `src/shop/cart.ts` (localStorage per shop) |
| 3 | Checkout UI | DONE | `src/shop/ShopCheckout.tsx` |
| 3 | Order creation (guest, stock check, snapshots) | DONE | `app/services/checkout.py` |
| 3 | Confirmation + tracking | DONE | `GET /shop/{slug}/orders/{id}?phone=`, `src/shop/ShopOrder.tsx` |
| 3 | Seller order list + detail | DONE | `src/dashboard/orders/` |
| 3 | Status transition endpoint + table | DONE | `app/services/order.py` |
| 3 | Seller status UI | DONE | `src/dashboard/orders/OrderDetail.tsx` |
| 3 | Automatic vs manual confirmation | DONE | `store.order_confirmation_mode`, applied in `checkout.place_order` |
| 4 | `payment` table | DONE | `app/models/payment.py`, migration `ccd5e33eba38` |
| 4 | Method choice at checkout | DONE | `OrderCreate.payment_method`, `payment.check_method_available` |
| 4 | COD mark-paid | DONE | `PATCH /seller/orders/{id}/payment` |
| 4 | Bank details on the order page | DONE | `payment.shop_payment_out` |
| 4 | Bakong/KHQR spike | DONE | outcome: KHQR is built locally, no Bakong API (02 §10.3) |
| 4 | KHQR generation + QR display | DONE | `app/services/khqr.py`, `src/shop/PaymentCard.tsx` (draws with `uqr`) |
| 4 | Payment status endpoint + seller UI | DONE | `app/services/payment.py`, OrderDetail payment card |
| 5 | `delivery` table | DONE | `app/models/delivery.py`, migrations `7461cde1fdf0`, `b2f4c81e9d03` |
| 5 | Delivery method at checkout | DONE | `OrderCreate.delivery_method` / `courier` |
| 5 | Delivery status endpoint + table | DONE | `app/services/delivery.py` |
| 5 | Seller delivery UI | DONE | OrderDetail delivery card |
| 5 | Pickup flow | DONE | pickup transition table: `not_assigned → delivered` |
| 5 | Completion rule | DONE | `order.can_complete` |
| 5 | Delivery fee, free delivery, couriers, GPS pin, address note | DONE | `app/services/pricing.py`, `src/shop/MapPicker.tsx` (Leaflet, lazy-loaded) |
| 5 | Bill discounts | DONE | `store.discount_config`, `pricing.discount_for` |
| 6 | Bot + webhook registration | DONE | `app/services/telegram.py` `register_webhook` (at startup, prod only) |
| 6 | Store-to-Telegram linking (code) | DONE | signed `/start` code, `POST /seller/store/telegram/link` |
| 6 | `notification_log` table | DONE | `app/models/notification.py`, migration `3867d44e4db7` |
| 6 | New-order + low-stock alerts | DONE | `app/services/notifications.py` (BackgroundTasks) |
| 6 | "Ask seller" via `t.me/<username>?text=` | DONE | `store.telegram_username`, `src/shop/ShopProduct.tsx` |
| 6 | Settings UI connect/disconnect, username | DONE | `src/dashboard/settings/fields.tsx` `TelegramFields` |
| 7 | Web notifications (bell, list) | DONE | `app/api/notifications.py`, `src/dashboard/Notifications.tsx`; migration `aa40287b7688` |
| 7 | Customer list | DONE | `app/services/customer.py`, `src/dashboard/customers/CustomerList.tsx` |
| 7 | Customer detail + history | DONE | `CustomerDetail.tsx` |
| 8 | `shareable_link`, `link_event` tables | DONE | `app/models/link.py`, migration `883276fadeed` |
| 8 | Link generation endpoint + UI | DONE | `app/services/link.py`, `src/dashboard/links/` |
| 8 | View/order tracking | DONE | `POST /shop/{slug}/track-view` (BackgroundTasks); order event written in checkout |
| 8 | Link stats | DONE | `GET /seller/links/{id}/stats`, `LinkDetail.tsx` |
| 8 | Open Graph link previews | DONE | `frontend/middleware.ts` (Vercel Routing Middleware, bots only) |

The Phase 0 "API: ok" check is gone from the frontend. The landing page
(`src/pages/Home.tsx`) is now a sign-up page. `GET /health` is still used by
Render's health check.

### Phase 9 (current)

| Task (03) | Status | Notes |
|---|---|---|
| End-to-end manual test pass | PARTIAL | `docs/REGRESSION_CHECKLIST.md` exists; the final live pass with a real seller hasn't happened |
| Error / empty / loading states | DONE | `ErrorState`, `EmptyState`, `Skeleton`, `Spinner`, `SlowNotice` in `components/ui.tsx` |
| Mobile pass on storefront + checkout | DONE | |
| Rate limiting + security review | DONE | `client_ip()` uses `CF-Connecting-IP` (`app/core/ratelimit.py`); the live check is still pending (04) |
| Seed real store data | NOT STARTED | no seed script in the repo |
| Onboard first real seller | NOT STARTED | |
| Domain + Cloudflare DNS | DONE (live 2026-10-09) | `order.oaksolve.com` (Vercel), `api.oaksolve.com` (Render; `render.yaml` `PUBLIC_API_URL` / `PUBLIC_APP_URL`), `images.oaksolve.com` (R2, `R2_PUBLIC_URL`); the login page shows `order.oaksolve.com`. `oaksolve.com` (302) and the vercel.app address (308) forward to it (04) |
| Refresh token in an httpOnly cookie (part of the domain work in 04) | DONE (live 2026-10-09) | `backend/app/api/session_cookie.py`, `frontend/src/lib/api.ts`; only works once app and API share oaksolve.com |
| Phone check through the Telegram bot (founder's choice 2026-10-09: sellers sign up with a real phone; Google, then Facebook and TikTok, to follow) | DONE | `phone_check` table, `POST/GET /auth/phone-checks`, `services/phone_check.py`, the bot's share button (`services/telegram.py`), `app/telegram_poll.py` for laptops; `auth/PhoneCheck.tsx` |
| Continue with Google (same decision) | DONE (needs the founder's Google client ID) | `core/google.py`, `services/social.py`, `seller_login`, `POST /auth/google`, `/auth/social/register`, `/seller/account/google`; `auth/SocialButtons.tsx`, `auth/GoogleButton.tsx`, `pages/FinishSignup.tsx`, Settings → Your account (Google, Add a password); migration `4520c66e86de` |
| Continue with Facebook and TikTok (same decision) | DONE (needs the founder's Meta and TikTok apps) | `core/oauth.py`, `POST /auth/oauth/{provider}`, `/seller/account/oauth/{provider}`; `lib/oauth.ts`, `pages/OAuthCallback.tsx`, `auth/SocialButtons.tsx`, Settings → Your account → Other ways to log in; migration `39a133fd8c02` |
| Privacy policy, terms, data deletion pages (needed by Meta and TikTok, 2026-10-09) | DONE (the founder reviews the text) | `/privacy`, `/terms`, `/data-deletion`: `pages/Legal.tsx`, `pages/legal/content.ts`; links on the start page and the sign-up forms |
| Phone number login (same decision) | DONE | Register with a finished phone check (no email), login by phone or an older account's email (`auth.login_filter`, `pages/LoginField.tsx`), staff added by phone, Your account → change number through Telegram (`POST /seller/account/phone`), `python -m app.admin test-shop`; migration `005c6870a409` |
| Khmer / English switch | DONE | `frontend/src/i18n/`. The founder hasn't reviewed the Khmer yet; the Telegram bot's messages are Khmer only (2026-10-09) |
| Light / dark mode | DONE | `src/theme/`, `index.css`, the inline script in `index.html` |
| Small photo copies | DONE | `-m` / `-s.jpg` naming, `thumbnail_size` on the images endpoint |
| Nightly DB backup to R2 | PARTIAL | `.github/workflows/backup.yml` exists but skips until its five secrets are set (04: not set yet) |
| UX pass (shop info, pinned Add to cart, logo, Settings menu, order summary, one row per option) | DONE | `POST /seller/store/logo`; `src/dashboard/settings/` |
| Oak in the shop (founder's picks 2026-10-10: 1A 2A 3B 4B 5B) | IN PROGRESS | The oak leaf is the mark (`components/OakLeaf.tsx`, `public/favicon.svg`); "Made with Oak Order" with Privacy · Terms at the bottom of the shop's grid pages and the order page (`shop/MadeWithOak.tsx`) |
| Customer order tracking (order truck in the shop's header, Your orders, auto-refresh, ask on Telegram) | DONE | `src/shop/CurrentOrder.tsx`, `ShopOrders.tsx`, `useMyOrders` |
| UX pass 2 (effects, cart bars, numbered checkout, Kantumruy Pro) | DONE | `components/effects.ts`, `shop/fly.ts`, `components/useBump.ts` |
| Layout pass (edge-to-edge on phones, floating bars) | DONE | `cardClass` in `components/styles.ts` |
| More in Settings (founder's request 2026-10-08): your account, Get help, Forgot password via Telegram, pause orders, Call / Messenger buttons, low-stock alert level, export orders to Excel, close shop, staff logins | DONE | `GET/PATCH /seller/account`, `POST /seller/account/password`; `src/dashboard/settings/AccountPage.tsx`; Get help opens Oak Order's Telegram (`VITE_SUPPORT_TELEGRAM`); `/forgot-password`, `/reset-password#<token>`; `store.orders_paused` / `orders_resume_on` (Settings → Orders), refused at checkout; `store.contact_phone` / `messenger_username` (Settings → Contact) as buttons in the shop (`shop/ContactSeller.tsx`); `store.low_stock_alert` (Settings → Alerts); `GET /seller/orders/export` (`services/export.py`, XlsxWriter); `POST /seller/account/close-shop` and the founder's `close-shop` / `reopen-shop` / `erase-shop` (`app/admin.py`); staff logins (`seller.role`, `/seller/staff`, `Owner` guard) |

None of the "MVP Built" exit criteria in 03 §10 are met yet. They all
need a real seller and a real customer.

**Not built, by design (post-MVP, 02 §14):** automatic KHQR confirmation
(Bakong API), refunds (`refunded` is in the enum but no transition reaches
it), stock reservation in the cart, courier APIs, customer accounts, and a
background worker or queue.

---

## 2. Repo tree

Leaves out `node_modules`, `.venv`, `dist`, caches and migration bodies.

```
/
├── CLAUDE.md                  Rules for Claude Code sessions (hard rules, commands)
├── .env.example               Every env var name; one root .env serves compose, backend and Vite
├── docker-compose.yml         Local Postgres 16 only (localhost:5432)
├── render.yaml                Render Blueprint for the API (free plan, Singapore, deploys after CI passes)
├── .github/workflows/
│   ├── ci.yml                 Backend: ruff, ruff format, alembic upgrade, pytest (Postgres service). Frontend: oxlint, build
│   └── backup.yml             Nightly pg_dump of prod to a private R2 bucket; skips until its secrets exist
├── .devcontainer/             Dev container (Python 3.12, Node, Docker-in-Docker; file polling on)
├── docs/                      01_PRODUCT, 02_TECHNICAL, 03_DEVELOPMENT, 04_STATUS, ADMIN (founder's commands), BACKUPS, REGRESSION_CHECKLIST, PERF_AUDIT (performance baseline and findings), this file
│
├── backend/
│   ├── Dockerfile             python:3.12-slim; CMD runs `alembic upgrade head` then uvicorn
│   ├── pyproject.toml         ruff (py312, line 100) and pytest (asyncio auto, one session loop)
│   ├── requirements.txt       Pinned runtime deps (no lock file); XlsxWriter for the orders export
│   ├── requirements-dev.txt   + pytest, pytest-asyncio, httpx2 (test client), ruff
│   ├── alembic.ini, alembic/env.py   Async Alembic; URL from app settings; imports app.models
│   ├── alembic/versions/      10 migrations, linear (chain in §5)
│   ├── app/
│   │   ├── main.py            Builds `app`: Sentry, lifespan (Telegram webhook), CORS, routers
│   │   ├── admin.py           The founder's commands (`python -m app.admin ...`, docs/ADMIN.md)
│   │   ├── core/
│   │   │   ├── config.py      Settings (pydantic-settings) from env / root .env
│   │   │   ├── errors.py      AppError, NotFound, the error envelope and handlers
│   │   │   ├── security.py    bcrypt (in a thread), JWT encode/decode (access, refresh, reset, signup)
│   │   │   ├── google.py      Checks "Continue with Google" ID tokens against Google's keys
│   │   │   ├── oauth.py       SocialAccount; trades Facebook / TikTok codes for the account (app secret)
│   │   │   └── ratelimit.py   slowapi limiter keyed on CF-Connecting-IP; check_limit()
│   │   ├── db/
│   │   │   ├── base.py        Base, naming convention, UUIDPrimaryKeyMixin, CreatedAtMixin, TenantMixin
│   │   │   └── session.py     Engine, tenant_session / unscoped_session, the RLS hook
│   │   ├── models/            SQLAlchemy models: account, catalog, order, payment, delivery, link, notification
│   │   ├── schemas/           Pydantic request/response models, one file per domain (+ common, upload)
│   │   ├── services/          All business logic and queries (see §4)
│   │   └── api/               Thin FastAPI routers, one per resource; deps.py holds the dependencies
│   └── tests/
│       ├── conftest.py        Creates and migrates <db>_test, empties it, fixtures (client, register, auth_headers, make_store)
│       ├── helpers.py         Direct-DB factories (add_product, ...) and API shortcuts (place_order, set_delivery, ...)
│       └── test_*.py          21 files; state machines, pricing, checkout, tenant isolation, ...
│
└── frontend/
    ├── index.html             Khmer <html lang>, theme set before first paint (reads sc.theme)
    ├── middleware.ts          Vercel Routing Middleware: Open Graph cards for preview bots on /shop/*
    ├── vercel.json            SPA rewrite + frame-ancestors 'none' / X-Frame-Options / nosniff
    ├── vite.config.ts         React + Tailwind plugins, envDir '..' (root .env), optional polling
    ├── package.json           Node 24; scripts dev / build (tsc -b && vite build) / lint (oxlint)
    └── src/
        ├── main.tsx           Providers: Language → QueryClient → Auth → Feedback → Router
        ├── router.tsx         All routes (data router)
        ├── index.css          Tailwind v4 @theme tokens, dark-mode scale flips, keyframes
        ├── auth/              AuthContext.tsx (provider), useAuth.ts (context + hook), PhoneCheck.tsx (verify a phone with the bot)
        ├── lib/               api.ts (fetch client), types.ts (API types), pricing, money, images, errors, ...
        ├── components/        ui.tsx (UI kit), styles.ts, FeedbackProvider (toasts/confirm), effects, RootLayout
        ├── pages/             Home (landing), Login, Register, FinishSignup, OAuthCallback, ForgotPassword, ResetPassword, Legal (+ legal/content.ts), LoginField, AgreeLine, AuthLayout
        ├── dashboard/         Seller app: Layout, queries.ts, orders/, customers/, products/, links/, settings/, Categories, Notifications
        ├── shop/              Customer shop: ShopLayout, pages, queries.ts, cart.ts, device.ts, MapPicker, PaymentCard, ...
        ├── i18n/              core.ts, useT.ts, LanguageProvider, LanguageSwitch, messages/*.ts ({en, km} pairs)
        └── theme/             theme.ts (auto/light/dark per device), ThemeSwitch
```

Backend modules, one line each:

| Module | Purpose |
|---|---|
| `models/account.py` | `Seller`, `Store`, `RefreshToken`, `Currency`, `OrderConfirmationMode`, the `str_enum()` helper |
| `models/catalog.py` | `Category`, `Product`, `ProductVariant`, `ProductStatus`, the `Money = Numeric(12,2)` type |
| `models/order.py` | `Customer`, `Order`, `OrderItem`, `OrderStatus` |
| `models/payment.py` | `Payment`, `PaymentMethod`, `PaymentStatus` |
| `models/delivery.py` | `Delivery`, `DeliveryMethod`, `DeliveryStatus` |
| `models/link.py` | `ShareableLink`, `LinkEvent`, `LinkTarget`, `LinkEventType` |
| `models/notification.py` | `NotificationLog`, `NotificationChannel`, `NotificationStatus` |
| `services/auth.py` | `create_shop` (seller and store together, with a checked phone), register, login (`login_filter`), `log_in`, refresh rotation and reuse detection, logout, `restart_sessions` (after a password change) |
| `services/social.py` | "Continue with Google / Facebook / TikTok": sign in or start a sign-up (`sign_in`), finish it (`register`), connect an account in Settings (`connect`), list them (`logins`) |
| `services/account.py` | The logged-in seller's own details and password change, closing a shop (unscoped session, filtered by the token's seller id) |
| `services/staff.py` | The owner's staff: list, add, set a password, remove (unscoped session, filtered by the token's store id and role staff) |
| `services/store.py` | Get/update the store; validates the three settings blobs and logo URLs |
| `services/category.py`, `product.py` | Catalog CRUD; variant merge; image URL prefix check |
| `services/images.py` | Presigned R2 PUT URLs (product photo, thumbnail, logo) |
| `services/storefront.py` | Public reads: shop by slug, cards, product, category page |
| `services/checkout.py` | Guest checkout (`place_order`), tracking lookup (`track_order`), `shop_order_out` |
| `services/pricing.py` | Line totals, discount, delivery fee, order totals (mirrored in `frontend/src/lib/pricing.ts`) |
| `services/order.py` | Order state machine, completion rule, seller list/detail, the payment/delivery record wrappers |
| `services/payment.py` | Payment state machine, payment settings checks, what the customer is shown to pay with |
| `services/delivery.py` | Delivery state machine, delivery/discount settings checks, checkout delivery choice |
| `services/khqr.py` | Builds KHQR (EMVCo) strings with CRC16, no network |
| `services/export.py` | The orders export: a .xlsx with one row per order (XlsxWriter, write-only), headings and statuses in English or Khmer |
| `services/customer.py` | Customer list with search, detail with history, "spent" per currency |
| `services/notifications.py` | Web notification rows, Telegram alert text and sending, the low-stock rule |
| `services/telegram.py` | Bot API over httpx, webhook registration, signed link codes, `/start` handling, the phone check's share button and shared contact |
| `services/phone_check.py` | Proving a phone number through the bot: `create`, `get`, `describe` (with `taken`), `use` (once, in the caller's commit); the bot's side `opened` / `shared` |
| `services/link.py` | Shareable links, stats, view recording (background), order events |
| `services/phone.py` | `normalize_phone` (Cambodian → `0XXXXXXXX`), search terms |
| `services/slugs.py` | `slugify` (random 6-hex for non-Latin names), `unique_slug` |

---

## 3. How to run

**Prerequisites:** Docker, Python 3.12, Node 24. Day-to-day development
happens inside the dev container.

First-time setup, from the repo root:

```bash
cp .env.example .env                 # one .env for compose, backend and Vite
python -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements-dev.txt
cd frontend && npm install
```

| Task | Command (directory) |
|---|---|
| Start local Postgres | `docker compose up -d --wait` (root) |
| Stop it / wipe its data | `docker compose down` / `docker compose down -v` (root) |
| Apply migrations | `alembic upgrade head` (backend, venv active) |
| New migration | `alembic revision --autogenerate -m "message"` (backend), then add the RLS lines by hand (§10) |
| API dev server | `uvicorn app.main:app --reload`: http://localhost:8000, OpenAPI at `/docs` |
| Backend tests | `pytest` (backend). Needs Postgres running; uses its own `<db>_test` database, created, migrated and emptied automatically |
| Backend lint | `ruff check . && ruff format --check .` (`ruff format .` fixes) |
| Founder's commands | `python -m app.admin <command> <login>` (a phone number typed any way, or an older account's email; `auth.login_filter`), commands `reset-password`, `close-shop`, `reopen-shop`, `erase-shop` (backend), `test-shop [--name]` (a shop with an email login and no phone, for the load test: sign-up needs a phone checked in Telegram, one shop per number), `forget-customer <shop link name> <phone>` (a customer's name becomes "(removed)"; phone, addresses, map pins and notes go from that shop's customer, orders and alert payloads; the orders' items and money stay; the Data deletion page promises it), and `move-photos <old> <new>` (rewrites the R2 address saved in `product.image_urls` and `store.logo_url`, for `images.oaksolve.com`); `erase-shop` only for a closed shop, after typing its link name: a plain `DELETE` of the seller cascades to the store and every tenant table, then `images.delete_store_files` empties `stores/<id>/` in R2; on the live DB with `DATABASE_URL='<Neon direct URL>'` in front (`docs/ADMIN.md`) |
| Bot on a laptop | `python -m app.telegram_poll` (backend, beside uvicorn): answers your **test** bot by polling, since Telegram's webhook can't reach localhost. Needs the three `TELEGRAM_*` values in `.env` and `PUBLIC_API_URL` empty; refuses a bot that has a webhook (the live one) |
| Performance audit tools | `backend/loadtest/seed_perf.py` (a local `social_commerce_perf` database with a 500-product shop; refuses anything but a local `*_perf` database) and `measure.py` (every endpoint's time, SQL statements and Postgres round trips), run from `backend/` with its venv; `backend/loadtest/README.md`, results in `docs/PERF_AUDIT.md` |
| Frontend dev server | `npm run dev`: http://localhost:5173 |
| Frontend lint | `npm run lint` (oxlint) |
| Frontend build | `npm run build` (`tsc -b && vite build`, type-checks) |

**Deploys.** Pushing to `main` runs CI. Render redeploys the API once CI
passes (`autoDeployTrigger: checksPass`), and migrations run when the
container starts. Vercel redeploys the frontend on every push. Commits must
be authored with an email on the `longreaksa404` GitHub account, or Vercel
blocks the deploy (04).

**Environment variables** (names only):

| Name | Used by | Purpose |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | docker-compose | Local database only |
| `ENVIRONMENT` | backend | `development` / `production`; Sentry environment tag |
| `DATABASE_URL` | backend, Alembic | Required. A plain `postgresql://...?sslmode=require` URL works: it is converted to `postgresql+asyncpg` with `ssl=` and `channel_binding` dropped. Use Neon's **direct** connection, not the pooler |
| `CORS_ORIGINS` | backend | Allowed frontend origins (a JSON list for pydantic-settings) |
| `SENTRY_DSN` | backend | Optional; errors only |
| `JWT_SECRET` | backend | Required, at least 32 characters. Also keys the HMAC of Telegram link codes |
| `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`, `RATE_LIMIT_ENABLED` | backend | Optional; defaults 15, 7, true. Not in `.env.example`; tests set `RATE_LIMIT_ENABLED=false` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | backend | All five, or uploads answer 503 `UPLOADS_NOT_CONFIGURED`. `R2_PUBLIC_URL` has no trailing slash |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` | backend | All three, or Telegram is off (`telegram_configured`) |
| `PUBLIC_API_URL` | backend | Set only in production: when set (with Telegram on), startup calls `setWebhook` |
| `PUBLIC_APP_URL` | backend | Base for the "Open order" button in alerts (only if https) |
| `VITE_API_URL` | frontend, middleware.ts | API base; defaults to `http://localhost:8000` |
| `VITE_SENTRY_DSN` | frontend | Optional |
| `GOOGLE_CLIENT_ID` | backend | The Google OAuth client ID ("Web application"); empty: `/auth/google` answers 503 `SOCIAL_NOT_CONFIGURED`. Not a secret. In `render.yaml` as `sync: false` |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | backend | The Meta app; both, or Facebook login is off (`facebook_configured`). The secret stays on the server |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | backend | The TikTok app (Login Kit); both, or TikTok login is off (`tiktok_configured`) |
| `VITE_GOOGLE_CLIENT_ID` | frontend | The same client ID, for Google's button (`src/lib/google.ts`); empty hides every Google button |
| `VITE_FACEBOOK_APP_ID`, `VITE_TIKTOK_CLIENT_KEY` | frontend | The public IDs for the Facebook / TikTok sign-in links (`src/lib/oauth.ts`); empty hides that button |
| `VITE_SUPPORT_TELEGRAM` | frontend | Oak Order's own Telegram username (no @) for sellers' "Get help" links (`src/lib/support.ts`); empty hides them |
| `VITE_USE_POLLING`, `WATCHFILES_FORCE_POLLING` | dev container | File polling (the repo is on a Windows drive mount) |
| `BACKUP_DATABASE_URL`, `BACKUP_R2_ACCOUNT_ID`, `BACKUP_R2_ACCESS_KEY_ID`, `BACKUP_R2_SECRET_ACCESS_KEY`, `BACKUP_R2_BUCKET` | GitHub Actions secrets | Nightly backup workflow |

The backend reads `.env` from the repo root (`config.py`: `parents[3]`),
even when started from `backend/`. In production the file doesn't exist and
real environment variables are used.

---

## 4. Backend architecture

### App and layering

- `app/main.py` creates a module-level `app = FastAPI(...)`. There is no
  factory function. At import it initialises Sentry if `SENTRY_DSN` is set.
  The `lifespan` registers the Telegram webhook when Telegram is configured
  and `PUBLIC_API_URL` is set. It also sets `app.state.limiter`, installs the
  error handlers, adds CORS (configured origins, credentials allowed, all
  methods and headers), and mounts every router under `api_v1 =
  APIRouter(prefix="/api/v1")`. `health.router` stays at the root
  (`/health`).
- **Layers:** `api/` routers are thin. They declare dependencies, call one
  service function and return its result. `services/` hold all logic,
  queries and commits. `schemas/` are Pydantic v2 models: input models
  validate, and output models use `from_attributes=True`. `models/` are
  SQLAlchemy 2.0 typed `Mapped[...]` classes.
- **Service signature convention:** `async def fn(db: AsyncSession,
  store_id: uuid.UUID, ...)`. Routers always pass `seller.store_id` (or
  `shop.id`), never a value from the body or the path.
- **Commits:** services commit explicitly (`await db.commit()`). There is no
  middleware-managed transaction. A unique-constraint failure is caught
  around the commit and turned into a 409, e.g. `SLUG_TAKEN` in
  `product._commit`.
- **Background work:** FastAPI `BackgroundTasks` handles the Telegram alert
  after checkout (`notifications.notify_new_order`) and link views
  (`link.record_view`). Each opens its own `tenant_session(store_id)`. There
  is no queue or worker.

### Dependency injection (`app/api/deps.py`)

```python
Seller     = Annotated[CurrentSeller, Depends(current_seller)]  # seller_id + store_id + role from the access JWT
Owner      = Annotated[CurrentSeller, Depends(current_owner)]   # the same, 403 OWNER_ONLY for staff
TenantDb   = Annotated[AsyncSession, Depends(get_tenant_db)]    # RLS-scoped to the seller's store
UnscopedDb = Annotated[AsyncSession, Depends(get_db)]           # NOT RLS-scoped (auth only)
Shop       = Annotated[Store, Depends(get_shop)]                # store from /shop/{store_slug}, via a short unscoped session
ShopDb     = Annotated[AsyncSession, Depends(get_shop_db)]      # RLS-scoped to that shop
```

Every seller route takes `seller: Seller, db: TenantDb`; Settings routes
take `seller: Owner` instead (store PATCH, logo, Telegram link/disconnect,
orders export, close shop, staff). Every storefront
route takes `shop: Shop, db: ShopDb`. `get_shop` closes its unscoped session
before `ShopDb` opens, so a request holds one connection at a time.

### DB sessions (`app/db/session.py`)

- One async engine (`pool_pre_ping=True`) and `SessionLocal =
  async_sessionmaker(engine, expire_on_commit=False)`.
- `unscoped_session()`: plain session. RLS doesn't restrict it because the
  login role owns the tables.
- `tenant_session(store_id)`: `SessionLocal(info={"store_id": store_id})`.
- A global `Session.after_begin` listener runs at the start of **every
  transaction** of a session that has `info["store_id"]`:

```python
connection.execute(text("SET LOCAL ROLE app_user"))
connection.execute(
    text("SELECT set_config('app.tenant_id', :tenant_id, true)"),
    {"tenant_id": str(store_id)},
)
```

Both are transaction-local, so nothing leaks back into the pool. Because
they run per transaction, they still apply after a commit, when the session
starts a new transaction.

### Auth

- **Phone number logins** (founder's choice 2026-10-09). `POST
  /auth/register` takes `full_name`, `store_name`, `password` and
  `phone_check`: the id of a phone check finished in Telegram
  (`services/phone_check.py`, §9). The number isn't typed. `phone_check.use`
  locks the check, refuses an expired one (422 `PHONE_CHECK_EXPIRED`) or an
  unfinished one (422 `PHONE_NOT_VERIFIED`), and deletes it in the same
  commit, so a check signs up once. A number that already has an account →
  409 `PHONE_TAKEN` (field `phone_check`; also on the unique index). It
  creates `Seller` (phone, no email) and `Store` together, with
  `store.telegram_chat_id` = the Telegram account that shared the number,
  so a new shop starts with order alerts on. The slug is generated from the
  store name (`unique_slug`). It returns a `TokenPair`; the route sets the
  refresh token as a cookie and answers `AccessOut` (below).
- `POST /auth/login` takes `login` (or `email`, the field's old name, via
  `AliasChoices`) and `password`. `auth.login_filter`: with an `@` it's an
  email (lowercased; accounts from before 2026-10-09 and their staff),
  otherwise `normalize_phone` (any spelling, `+855 12…` too); neither →
  the same 401 `INVALID_CREDENTIALS` "Wrong phone number or password.".
- Access JWT (HS256, 15 min): `{"type": "access", "sub": seller_id,
  "store_id": store_id, "role": "owner"|"staff", iat, exp}`. **The tenant
  comes from this claim.** A token without `role` (issued before staff
  existed) reads as owner.
- **Staff logins** (founder's choice 2026-10-08): `seller` rows with
  `role = staff` and their shop in `seller.store_id`; an owner's shop is
  the one whose `store.seller_id` is theirs (`auth.shop_of`). Staff can do
  everything but Settings (the `Owner` guard). The owner adds them with a
  phone number (normalized, unique: 409 `PHONE_TAKEN`, field `phone`; not
  checked in Telegram, the owner vouches) and a first password (nothing is
  sent), sets a new password when
  they forget theirs, and removes them. Telegram's "Forgot password?"
  only serves owners. Closing a shop closes its staff's logins too
  (`account.set_shop_logins`); erasing it deletes them (FK cascade).
- Refresh JWT (7 days): `{"type": "refresh", "sub": seller_id, "jti":
  refresh_token.id}`. Each `refresh_token` row is swapped once. Refreshing
  locks the row (`FOR UPDATE`), sets `revoked_at` and issues a new pair.
  The same token shown again within `REUSE_GRACE` (60 s) of its swap gets
  a new pair too (the phone retrying after the answer was lost on a weak
  connection; `revoked_at` keeps the first swap's time). Later, it
  **deletes** all of that seller's tokens (reuse means theft).
  `revoked_at` is set only by a swap: logout and every "end sessions"
  path delete rows, so a token they ended is unknown, never in the grace.
- `decode_token` requires `exp`, `sub` and `type`, and checks the type. An
  expired token raises 401 `TOKEN_EXPIRED`; any other bad token raises 401
  `INVALID_TOKEN`.
- **Continue with Google / Facebook / TikTok** (founder's choice
  2026-10-09; `LoginProvider` google, facebook, tiktok). Who the account
  is: `core/google.py` checks Google's ID token from its button (`POST
  /auth/google {credential}`: RS256 against Google's keys via
  `PyJWKClient`, cached 6 h, fetched in a thread; audience =
  `GOOGLE_CLIENT_ID`; issuer `accounts.google.com`; `exp`/`iat`/`sub`
  required). Facebook and TikTok send the browser to their page and back
  to `/auth/<provider>/callback?code=&state=`; `POST
  /auth/oauth/{provider} {code, redirect_uri}` and `core/oauth.py` trade
  the code with the app's secret: Facebook `GET
  graph.facebook.com/v26.0/oauth/access_token`, then `/me?fields=id,name,email`
  with `appsecret_proof` (HMAC-SHA256 of the token with the secret);
  TikTok `POST open.tiktokapis.com/v2/oauth/token/` (form: client_key,
  client_secret, code, grant_type, redirect_uri; no PKCE, the web flow
  doesn't use it), its `open_id`, then `/v2/user/info/?fields=open_id,display_name`.
  `redirect_uri` must be `<one of CORS_ORIGINS or PUBLIC_APP_URL>/auth/<that
  provider>/callback` (else 422 `INVALID_REDIRECT`, before calling the
  provider). Any failure → 401 `SOCIAL_SIGN_IN_FAILED`; not set up → 503
  `SOCIAL_NOT_CONFIGURED`. The email is kept only when the provider says
  it's checked (TikTok gives none). Then `services/social.py`: a
  `seller_login` row for that (provider, account id) → logged in
  (`auth.log_in`: closed shop 403, refresh cookie set,
  `SocialOut.access_token`). Otherwise `SocialOut.signup`: the provider, a
  signup JWT (`{"type": "signup", "sub", "provider", "email", "name"}`, 30
  min, not stored), the name and email. `POST /auth/social/register`
  finishes it with `full_name`, `store_name` and a `phone_check` like any
  sign-up (`auth.create_shop`), **no password**, and the `seller_login`
  row; bad or expired token → 400 `SIGNUP_EXPIRED`; the account already
  has a shop → 409 `SOCIAL_TAKEN`; the phone already has one → 409
  `PHONE_TAKEN`. **An account is never joined to a shop by email or
  phone**: someone with a shop logs in and connects it in Settings → Your
  account (`POST /seller/account/google`, `POST
  /seller/account/oauth/{provider}`; replaces an account of the same kind
  connected before; one connected to another shop → 409 `SOCIAL_TAKEN`).
  The provider's email and name live on `seller_login`, not `seller`. An
  account without a password: phone + password login fails like a wrong
  password; `POST /seller/account/password` without `current_password`
  adds one; close shop needs no password; Forgot password still works
  (the reset fingerprint of no password is the hash of "").
- Changing the login number (`POST /seller/account/phone {phone_check}`):
  a check finished in Telegram, as at sign-up; another account's number →
  409 `PHONE_TAKEN`; your own again is fine. The email can't be changed
  (`AccountUpdate` has only `full_name`).
- Changing the password (`POST /seller/account/password`, current password
  required) **deletes** every `refresh_token` row of the seller and issues
  a new pair to the caller: other phones are logged out. Deleted, not
  revoked, because a revoked token presented later counts as theft and
  would end the new session too.
- **Forgot password** (no email in the MVP): `POST /auth/password-reset`
  answers 202 at once and, after the response (BackgroundTasks, so the
  answer and its timing don't reveal whether the login exists; `login` is
  a phone number or an older account's email, `login_filter`), sends a
  link to the shop's Telegram chat (`store.telegram_chat_id`, the alerts
  chat) if it has one: `PUBLIC_APP_URL/reset-password#<reset JWT>`, as a
  button when https, else in the text. The reset JWT (`{"type": "reset",
  "sub", "pwh"}`, 30 min) isn't stored: `pwh` is a fingerprint of the
  current password hash, so the link works once and dies when the
  password changes. `POST /auth/password-reset/confirm` sets the password,
  ends every session (as above) and returns a new pair, so the seller is
  logged in. Without Telegram, the founder resets it (`python -m app.admin
  reset-password`, docs/ADMIN.md).
- bcrypt runs in `asyncio.to_thread` so it doesn't block the event loop.
  Logins for unknown phone numbers or emails check against `DUMMY_PASSWORD_HASH` for equal
  timing. A disabled seller (`is_active=false`) gets 403 `ACCOUNT_DISABLED`,
  and their shop answers 404.
- **The refresh token is a cookie** (`app/api/session_cookie.py`): every
  route that logs someone in (register, login, refresh, reset confirm,
  change password) calls `start_session(response, tokens)`, which sets
  `refresh_token` (httpOnly, Secure, SameSite=Lax, path `/api/v1/auth`,
  no Domain so only the API's host, max-age = the token's 7 days) and
  returns `AccessOut` (`access_token`, `token_type`) without it.
  `/auth/refresh` and `/auth/logout` read it with the `RefreshCookie`
  parameter (missing → `""` → 401 `INVALID_TOKEN`); logout also deletes
  it. A refresh token in a JSON body is ignored. Secure always: browsers
  treat `http://localhost` as secure, so local dev works (app and API on
  localhost are one site). It needs app and API on one site in
  production too (`order.` and `api.oaksolve.com`): from vercel.app to
  onrender.com the browser wouldn't send it.
- Frontend: the access token is kept in memory only; `localStorage` has
  only `sc.session` ("there may be a session to restore"). See §8.

### Tenant resolution and enforcement

| Request kind | Where `store_id` comes from | Session |
|---|---|---|
| Seller (`/seller/*`) | `store_id` claim of the access JWT | `TenantDb` |
| Storefront (`/shop/{slug}/*`) | `Store` found by slug (joined to `Seller.is_active`) on an unscoped session | `ShopDb` |
| Background task | the `store_id` the request already resolved | `tenant_session(store_id)` |
| Telegram `/start <code>` | store id inside the HMAC-signed, 30-minute code | `tenant_session(store_id)` |
| Auth | none (seller looked up by phone or email / token id; phone checks by id) | `UnscopedDb`, filters explicitly |

**Layer 1 (application).** Every service query filters
`Model.store_id == store_id` explicitly, even on a tenant session. Foreign
key checks bypass RLS, so ownership of referenced rows is checked in code:
`product._check_category` (a category id from another store gets 422) and
image or logo URLs must start with
`{R2_PUBLIC_URL}/stores/{store_id}/products/{product_id}/` or `.../logo/`.

**Layer 2 (Postgres RLS).** From migration `ccd7d9bce820` (the same policy
is repeated in each later table's migration):

```sql
-- once
CREATE ROLE app_user NOLOGIN;            -- inside DO $$ ... IF NOT EXISTS
GRANT app_user TO CURRENT_USER;          -- so the login role may SET ROLE
GRANT USAGE ON SCHEMA public TO app_user;

-- the tenant root: read and update only, never insert/delete from a seller request
GRANT SELECT, UPDATE ON store TO app_user;
ALTER TABLE store ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON store
  USING (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- every tenant table
GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO app_user;
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <table>
  USING (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (store_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

An unset or empty `app.tenant_id` matches no rows. `app_user` has **no
grant at all** on `seller` or `refresh_token`, so a tenant session can't
read them. RLS is enabled but not `FORCE`d. Isolation relies on `SET LOCAL
ROLE app_user`, because the login role owns the tables. This was verified
against a non-superuser owner, as on Neon (04).

### Error handling (`app/core/errors.py`)

Every error uses the same envelope:

```json
{"error": {"code": "PRODUCT_OUT_OF_STOCK", "message": "Only 2 of Silk Shirt (L) left.", "field": "items.0"}}
```

- Raise `AppError(status_code, code, message, field=None)` or
  `NotFound(code, message)` from services.
- `RequestValidationError` becomes 422 `VALIDATION_ERROR`. Only the
  **first** error is reported, and `field` is the dotted location without
  `body`/`query`/`path` (e.g. `variants.0.price`). Custom Pydantic messages
  use `PydanticCustomError` so they aren't prefixed "Value error, ".
- Starlette HTTP errors map to `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
  `METHOD_NOT_ALLOWED` or `HTTP_ERROR`. `RateLimitExceeded` becomes 429
  `RATE_LIMITED`.
- `field` names the input the frontend should mark; nested settings use
  paths like `payment_settings.khqr.bakong_account_id`.

Codes in use: `ACCOUNT_DISABLED`, `ACCOUNT_NOT_FOUND`, `CATEGORY_NOT_FOUND`,
`CUSTOMER_NOT_FOUND`, `DELIVERY_METHOD_UNAVAILABLE`,
`DELIVERY_OPTION_UNAVAILABLE`, `INVALID_CREDENTIALS`,
`INVALID_DATE_RANGE`, `INVALID_DELIVERY_TRANSITION`, `INVALID_IMAGE`,
`INVALID_PAYMENT_TRANSITION`, `INVALID_RESUME_DATE`, `INVALID_STATUS_TRANSITION`,
`INVALID_TOKEN`, `LINK_NOT_FOUND`, `NOT_AUTHENTICATED`, `NOT_FOUND`,
`ORDER_NOT_DELIVERED`, `ORDER_NOT_FOUND`, `ORDER_NOT_PAID`, `ORDERS_PAUSED`,
`PHONE_CHECK_EXPIRED`, `PHONE_NOT_VERIFIED`, `PHONE_TAKEN`, `TELEGRAM_NOT_CONFIGURED`,
`SOCIAL_SIGN_IN_FAILED`, `SOCIAL_NOT_CONFIGURED`, `SOCIAL_TAKEN`, `SIGNUP_EXPIRED`, `INVALID_REDIRECT`,
`ORDER_TOTAL_CHANGED`, `PAYMENT_METHOD_UNAVAILABLE`, `PRODUCT_HIDDEN`,
`PRODUCT_NOT_FOUND`, `PRODUCT_OUT_OF_STOCK`, `PRODUCT_UNAVAILABLE`,
`OWNER_ONLY`, `RATE_LIMITED`, `RESET_LINK_INVALID`, `SLUG_TAKEN`, `STAFF_LIMIT`, `STAFF_NOT_FOUND`, `STORE_MISSING`, `STORE_NOT_FOUND`,
`TELEGRAM_NOT_CONFIGURED`, `TOKEN_EXPIRED`, `TOO_MANY_IMAGES`,
`UPLOADS_NOT_CONFIGURED`, `VALIDATION_ERROR`, `VARIANT_NOT_FOUND`,
`VARIANTS_DISABLED`, `VARIANTS_REQUIRED`, `WRONG_PASSWORD` (422, not
401: the app reads any 401 as "logged out"). The frontend also makes
`NETWORK_ERROR` (status 0) and `UPLOAD_FAILED` itself.

### Rate limiting (`app/core/ratelimit.py`)

slowapi with in-memory storage (fine for one Render instance). The key is
`CF-Connecting-IP` if it holds a valid IP, else the connection address.
`X-Forwarded-For` is deliberately ignored. slowapi only applies the first
decorated limit per request, so stricter second limits call
`check_limit(limit, scope, request)`.

| Where | Limit per IP |
|---|---|
| `POST /auth/register` | 5/min |
| `POST /auth/login` | 10/min |
| `POST /auth/refresh` | 30/min |
| `POST /auth/password-reset` | 5/min |
| `POST /auth/password-reset/confirm` | 10/min |
| All `/shop/{slug}/*` (router dependency, shared scope `storefront`, applied before the slug lookup) | 300/min |
| `POST /shop/{slug}/orders` (on top) | 10/min |
| `POST /shop/{slug}/track-view` (on top) | 60/min |

### Other conventions in the backend

- **Money:** `Decimal` everywhere, `Numeric(12,2)` columns. The schema type
  `Money` (`schemas/product.py`) requires ≥0, at most 2 decimal places, and
  quantizes to `0.01`. JSON carries money as decimal **strings** ("12.50").
- **Enums:** Python `StrEnum`, stored as text plus a CHECK constraint
  (`str_enum()` with `native_enum=False`), so adding a value means replacing
  the constraint, not running `ALTER TYPE`.
- **Concurrency:**
  - checkout locks the store row (`SELECT ... FOR UPDATE`) until commit, so
    a store's checkouts run one at a time. This keeps order numbers unique
    and gives one customer per phone.
  - status, payment and delivery changes lock the order row.
  - stock is taken with one conditional `UPDATE ... SET stock = stock - n
    WHERE stock >= n RETURNING stock` per line, and returned with
    `stock = stock + n`.
- **Relationships on `Order` are `lazy="raise"`.** Always
  `selectinload(...)` what you read (`order.SUMMARY_LOADS`, `get_order`).
  Async can't lazy-load.
- `eager_defaults=True` on models with server-generated timestamps
  (`Product`, `Order`, `Payment`, `Delivery`, `ShareableLink`).
- **"next_statuses" pattern:** seller order responses include
  `next_statuses` for the order, its payment and its delivery, so the
  frontend never copies the transition rules.

---

## 5. Data model

All models inherit `Base` (naming convention: `ix_%(column_0_label)s`,
`uq_%(table_name)s_%(column_0_name)s`, `ck_%(table_name)s_%(constraint_name)s`,
`fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s`, `pk_%(table_name)s`).

Mixins (`app/db/base.py`):
- `UUIDPrimaryKeyMixin`: `id UUID PK`, default `uuid.uuid4` (set in Python).
- `CreatedAtMixin`: `created_at timestamptz NOT NULL DEFAULT now()`.
- `TenantMixin`: `store_id UUID NOT NULL FK store.id ON DELETE CASCADE`,
  indexed (`ix_<table>_store_id`).

**Tenant-scoped** means the table has `TenantMixin` and an RLS
`tenant_isolation` policy on `store_id`.

| Table | Tenant | Key columns | FKs | Indexes / constraints |
|---|---|---|---|---|
| `seller_login` | **NO** (no `app_user` grant) | `seller_id`, `provider` (`google`, `facebook`, `tiktok`), `provider_user_id` (Google's `sub`, Facebook's id, TikTok's `open_id`), `email` (the provider's, when verified), `name` (the provider's; TikTok's display name), both shown in Settings, `created_at` | `seller_id → seller` CASCADE | `uq_seller_login_provider` (`provider`, `provider_user_id`), `uq_seller_login_seller_id` (`seller_id`, `provider`: one account of each kind per seller) |
| `phone_check` | **NO** (no `app_user` grant) | `code` (`phone_` + 22 random characters, in the `t.me` link), `telegram_user_id` (bigint, who opened the link), `phone` (normalized, once shared), `verified_at`, `expires_at` (30 min), `created_at` | none | `uq_phone_check_code`; `ix_phone_check_telegram_user_id`. Expired rows are deleted when a new check starts |
| `seller` | **NO** (an owner owns the tenant, staff belong to one; no RLS, no `app_user` grant) | `phone` (the login, normalized, NULL only for older accounts whose number another account had), `email` (NULL for accounts since 2026-10-09; older ones log in with it; stored lowercased), `password_hash` (NULL for an account made with Google until it adds one), `full_name`, `is_active` (default true), `role` (`owner`/`staff`, default owner), `store_id` (staff only), `created_at` | `store_id → store` CASCADE (`use_alter`: store also points at seller) | `uq_seller_phone`; `uq_seller_email`; `ix_seller_store_id`; CHECK `(role = 'staff') = (store_id IS NOT NULL)` |
| `store` | tenant **root** (RLS on `id`; `app_user` SELECT, UPDATE only) | `name`, `slug` (String(64), **globally** unique), `description`, `logo_url`, `currency` (`USD`/`KHR`, default USD), `telegram_chat_id` (private), `telegram_username`, `contact_phone` (normalized like customers' phones), `messenger_username` (a Facebook page's username or number) (all three public), `payment_config` JSONB, `delivery_config` JSONB, `discount_config` JSONB (all default `{}`), `order_confirmation_mode` (`automatic`/`manual`, default manual), `orders_paused` (bool, default false), `orders_resume_on` (date NULL: the first day orders open again), `low_stock_alert` (int, default 5, 1–999 by the schema), `created_at` | `seller_id → seller` CASCADE, **unique** (1:1) | `uq_store_seller_id`, `uq_store_slug` |
| `refresh_token` | **NO** (per seller; no RLS, no `app_user` grant) | `id` (= JWT `jti`), `expires_at`, `revoked_at`, `created_at` | `seller_id → seller` CASCADE | `ix_refresh_token_seller_id` |
| `category` | yes | `name`, `slug` String(64), `created_at` | none besides `store_id` | UNIQUE (`store_id`, `slug`) |
| `product` | yes | `name`, `slug`, `description`, `price` Numeric(12,2), `image_urls` JSONB list, `status` (`active`/`inactive`), `has_variants`, `stock_quantity` int NULL (only when no variants), `created_at`, `updated_at` | `category_id → category` ON DELETE SET NULL | UNIQUE (`store_id`, `slug`); (`store_id`, `status`); (`store_id`, `category_id`); CHECK `price >= 0`; CHECK stock NULL or ≥0 |
| `product_variant` | yes (store_id copied from product) | `name` (e.g. "Red / L"), `sku`, `price_override` NULL, `stock_quantity` int default 0, `created_at` | `product_id → product` CASCADE | (`store_id`, `product_id`); CHECK price_override NULL or ≥0; CHECK stock ≥0 |
| `customer` | yes | `name` (latest order's), `phone` (normalized), `address` (latest delivery address), `telegram_user_id` (never written), `created_at` | none | UNIQUE (`store_id`, `phone`) |
| `order` | yes | `number` int (from 1001 per store), `status`, `currency` (copied from store), `subtotal`, `discount`, `delivery_fee`, `total`, `delivery_method`, `delivery_address`, `delivery_lat`/`delivery_lng` Numeric(9,6), `delivery_address_note`, `source` (link's source, or `chat` for an order the seller added; links can't be named "chat"), `notes`, `created_at`, `updated_at` | `customer_id → customer` (no cascade) | UNIQUE (`store_id`, `number`); (`store_id`, `status`); (`store_id`, `created_at`); (`store_id`, `customer_id`); CHECK lat/lng both or neither; CHECK all four money columns ≥0 |
| `order_item` | yes (store_id copied from order) | `product_name_snapshot`, `variant_name_snapshot`, `unit_price_snapshot`, `quantity`, `line_total` (no timestamps) | `order_id → order` CASCADE; `product_id → product` (no cascade; products are never deleted); `variant_id → product_variant` ON DELETE SET NULL | (`store_id`, `order_id`); (`variant_id`); CHECK quantity >0; CHECK unit price ≥0 |
| `payment` | yes (store_id copied from order) | `method` (`cod`/`bank_transfer`/`khqr`), `status` (`pending`/`paid`/`failed`/`refunded`, default pending), `amount` (= order total), `reference` (seller's note), `paid_at`, `created_at` | `order_id → order` CASCADE, **unique** (1:1) | CHECK amount ≥0 |
| `delivery` | yes (store_id copied from order) | `method` (`seller_delivery`/`pickup`), `status` (default `not_assigned`), `courier` (null = own delivery or pickup), `assignee_note`, `created_at`, `updated_at` | `order_id → order` CASCADE, **unique** (1:1) | none beyond the unique |
| `shareable_link` | yes | `target_type` (`store`/`product`/`category`), `target_id` UUID NULL (**no FK**), `token` (8 chars `[a-z0-9]`, **globally** unique), `source`, `campaign`, `created_at` | none | (`store_id`, `created_at`); CHECK `(target_type = 'store') = (target_id IS NULL)` |
| `link_event` | yes (store_id copied from link) | `event_type` (`view`/`order`), `created_at` | `link_id → shareable_link` CASCADE; `order_id → order` CASCADE NULL | (`store_id`, `link_id`); UNIQUE index on `order_id` (an order counts for one link); CHECK `(event_type = 'order') = (order_id IS NOT NULL)` |
| `notification_log` | yes | `channel` (`web`/`telegram`), `event_type` text (`new_order`/`low_stock`), `payload` JSONB, `status` (`sent`/`failed`), `sent_at` (acts as created_at), `read_at` (web only; null = unread) | none | (`store_id`, `channel`, `sent_at`) |

**JSONB settings on `store`.** The shapes are Pydantic models, and `{}` or
missing parts read as the defaults:

- `payment_config` ↔ `PaymentSettings` (`schemas/payment.py`): `cod
  {enabled=true}`, `bank_transfer {enabled=false, bank_name, account_name,
  account_number}`, `khqr {enabled=false, bakong_account_id,
  merchant_name}`. A method can't be on without its details, and at least
  one must be on.
- `delivery_config` ↔ `DeliverySettings` (`schemas/delivery.py`): `fee=0`,
  `free_from_amount`, `free_from_items`, `own_delivery {enabled=true}`,
  `couriers: list[str]` (≤10, unique), `pickup {enabled=false, address}`.
  At least one way to deliver must be on.
- `discount_config` ↔ `DiscountSettings`: `rules: [{min_subtotal,
  amount_off}]` (≤5; `0 < amount_off ≤ min_subtotal`).
- They are saved **whole** on PATCH (`model_dump(mode="json")`). Parts left
  out of a request reset to defaults.

**Paused orders** (Settings → Orders): `Store.orders_paused_now` is
`orders_paused and (orders_resume_on is None or clock.today() <
orders_resume_on)`, with `clock.today()` the date in Phnom Penh
(`app/core/clock.py`, a fixed UTC+7). So a shop reopens by itself on the
day set, with no scheduled job; `StoreOut` and `ShopStoreOut` show the
effective values (`orders_paused_now`, `orders_resume_on_now`). Saving
`orders_paused=false` clears the date; a date that isn't after today is
422 `INVALID_RESUME_DATE`. Checkout refuses with 409 `ORDERS_PAUSED`
(checked after the store row lock).

**Duplicated on purpose:** `order.delivery_method` and `delivery.method` are
both set at checkout to the same value. `payment.amount` equals
`order.total` at checkout.

**Migration chain** (linear, in order): `abd12fdb8cf6` seller/store/refresh_token
→ `f49fee3833a0` category/product/product_variant → `ccd7d9bce820` RLS role and
policies → `8980a033af6d` customer/order/order_item → `ccd5e33eba38` payment
(backfilled a pending COD payment per existing order) → `7461cde1fdf0`
delivery + discount (backfilled not_assigned deliveries) → `b2f4c81e9d03`
courier + GPS location → `3867d44e4db7` telegram_username + notification_log
→ `aa40287b7688` notification_log.read_at + index → `883276fadeed`
shareable_link + link_event → `5ee23aad5482` store.orders_paused +
orders_resume_on → `007ae4403215` store.contact_phone +
messenger_username → `49da40196f18` store.low_stock_alert →
`ae070e4b3006` seller.role + seller.store_id → `5b3201ea7f7d` phone_check
→ `005c6870a409` seller.phone unique, email nullable (existing phones
normalized; a number that can't be read, or an older account's again, was
cleared) → `4520c66e86de` seller_login, password_hash nullable →
`39a133fd8c02` seller_login.name, facebook and tiktok (**head**).

---

## 6. State machines

Order, payment and delivery are three independent state machines, each on
its own table (CLAUDE.md hard rule 2). **No code sets one status from
another.** The only coupling is the completion rule. Each module has one
function that writes the status. Seller endpoints lock the order row
(`get_order(..., for_update=True)`) before any change.

### Order: `app/services/order.py`

```
pending ──▶ accepted ──▶ processing ──▶ ready ──▶ shipped ──▶ delivered ──▶ completed*
   │            │             │           │
   └▶ rejected  └▶ cancelled  └▶ cancelled └▶ cancelled

short path (founder's pick 1C, 2026-10-09): the steps after accepted are
optional, forward only, and completed* is a target from every one of them
```

```python
ALLOWED_ORDER_TRANSITIONS = {
    PENDING:    {ACCEPTED, REJECTED},
    ACCEPTED:   {PROCESSING, READY, SHIPPED, COMPLETED, CANCELLED},
    PROCESSING: {READY, SHIPPED, COMPLETED, CANCELLED},
    READY:      {SHIPPED, COMPLETED, CANCELLED},
    SHIPPED:    {DELIVERED, COMPLETED},
    DELIVERED:  {COMPLETED},          # COMPLETED everywhere: only if can_complete()
    COMPLETED:  set(), REJECTED: set(), CANCELLED: set(),
}
```

- Writer: `transition(db, order, target)`. It checks the table (409
  `INVALID_STATUS_TRANSITION`), then for `completed` the delivery (409
  `ORDER_NOT_DELIVERED`) and the payment (409 `ORDER_NOT_PAID`). It returns
  stock for `rejected`/`cancelled` (`_return_stock`), then sets the status.
  The caller commits.
- Called from `change_status` (`PATCH /seller/orders/{id}/status`) and from
  checkout: in `automatic` confirmation mode a new order goes `pending →
  accepted` through the same `transition`.
- `next_statuses(order)` = allowed targets in enum order, with `completed`
  left out unless `can_complete(order)`.
- Stock return skips lines whose variant was deleted, and products that
  switched to variants since the order.
- Pickup orders use the same order path (`ready → shipped → delivered`).
  The customer UI relabels those steps ("Ready to collect / Handed over /
  Collected") in `frontend/src/shop/orderWords.ts`.

### Payment: `app/services/payment.py`

```
pending ◀──▶ paid
   └◀──────▶ failed          (refunded: in the enum, unreachable in the MVP)
paid / failed → pending = "Not paid after all", any time (founder's pick 2C, 2026-10-09)
```

```python
ALLOWED_PAYMENT_TRANSITIONS = {PENDING: {PAID, FAILED}, PAID: {PENDING}, FAILED: {PENDING}, REFUNDED: set()}
```

- Writer: `record(payment, target, reference)`. It checks the table (409
  `INVALID_PAYMENT_TRANSITION`), sets `paid_at` when it becomes paid,
  clears `paid_at` and `reference` when it goes back to pending, and
  replaces `reference` if one is given.
- Called by `order.record_payment` (`PATCH /seller/orders/{id}/payment`).
  It never reads or writes the order's status.
- `PaymentOut.claimed_at` / `ShopPaymentOut.claimed_at`: when the customer
  last tapped "I've paid" (`notifications.last_payment_claim`, the newest
  `payment_claimed` web row for the order; no column). The seller's
  Payment card shows "Customer says paid · 14:02" while pending; the
  customer's KHQR / bank card has "I've paid: send receipt" (opens the
  shop's Telegram, or Messenger with the line copied, with "I've paid
  order #1001, $12.00" typed in; a plain "I've paid" without either), then
  "You told <shop> you paid (14:02)".
- Every payment starts `pending`, whatever the method. Paid or failed go
  back to pending from the Payment card's "Not paid after all" / "Back to
  not paid" (asks first). Order and delivery steps have no way back;
  reject and cancel stay final.

### Delivery: `app/services/delivery.py`

Per delivery method:

```
seller_delivery:  not_assigned ──▶ assigned ──▶ picked_up ──▶ in_transit ──▶ delivered
                                      ▲                            │
                                      └────────── failed ◀─────────┘   (failed → assigned = retry)
                  steps in between optional, forward only (1C, 2026-10-09);
                  failed from assigned / picked_up / in_transit; failed → delivered too

pickup:           not_assigned ──▶ delivered
```

```python
ALLOWED_DELIVERY_TRANSITIONS = {
    SELLER_DELIVERY: {NOT_ASSIGNED: {ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED},
                      ASSIGNED: {PICKED_UP, IN_TRANSIT, DELIVERED, FAILED},
                      PICKED_UP: {IN_TRANSIT, DELIVERED, FAILED},
                      IN_TRANSIT: {DELIVERED, FAILED}, DELIVERED: set(),
                      FAILED: {ASSIGNED, DELIVERED}},
    PICKUP:          {NOT_ASSIGNED: {DELIVERED}, <every other status>: set()},
}
```

- Writer: `record(delivery, target, assignee_note)`. It checks the table for
  the delivery's method (409 `INVALID_DELIVERY_TRANSITION`) and replaces
  `assignee_note` if one is given.
- Called by `order.record_delivery` (`PATCH /seller/orders/{id}/delivery`).
  It never reads or writes the order's or the payment's status.
- **"Delivered, cash received"** (`order.record_cash_handover`, `POST
  /seller/orders/{id}/cash-handover`, founder's pick 1C): cash on delivery
  only (409 `NOT_CASH_ON_DELIVERY`). One seller tap records two things,
  each through its own writer: the delivery `delivered`, the payment
  `paid`. Both transitions are checked before either is written, so it's
  both or neither. The order's status is left alone.

### Completion rule (02 §7.4): `app/services/order.py`

```python
def is_settled(order):   # paid, or cash on delivery whatever its payment status
    return order.payment.status is PaymentStatus.PAID or order.payment.method is PaymentMethod.COD

def can_complete(order):
    return order.delivery.status is DeliveryStatus.DELIVERED and is_settled(order)
```

Enforced in `transition()` and reflected in `next_statuses()`. Since the
short path (1C) every active order status has `completed` as a target, so
the seller no longer marks the **order** delivered as well as the
**delivery**; the order's own delivered stays as an optional step after
shipped. A COD order can complete even if
its payment was marked `failed` (02 §7.4 read literally; 04 notes this).

Tests (`test_orders.py`, `test_payments.py`, `test_delivery.py`) parametrize
**every** status pair (and every method × status combination for
completion) against tables copied into the tests on purpose.

---

## 7. API

Base path `/api/v1` (except `/health`). JSON only. Seller routes need
`Authorization: Bearer <access token>`. List endpoints page with
`limit`/`offset` and return `has_more` (the service fetches `limit + 1`
rows). Interactive docs at `/docs` (public). The Telegram webhook is hidden
from the schema.

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/health` | none | — | `{"status": "ok"}` | Render health check |
| POST | `/auth/register` | none | `RegisterIn` (`full_name`, `store_name`, `password`, `phone_check`) | `AccessOut` + cookie (201) | Creates seller + store with the checked phone; 422 `PHONE_NOT_VERIFIED` / `PHONE_CHECK_EXPIRED`, 409 `PHONE_TAKEN`; 5/min |
| POST | `/auth/login` | none | `LoginIn` (`login`: phone or older account's email; `email` accepted) | `AccessOut` + cookie | 10/min |
| POST | `/auth/refresh` | refresh cookie | none | `AccessOut` + cookie | Rotates; a retry within 60 s gets a new pair, later reuse ends all sessions; 30/min |
| POST | `/auth/logout` | refresh cookie | none | 204 | Deletes that token's session and the cookie; bad tokens ignored |
| POST | `/auth/password-reset` | none | `PasswordResetIn` (`login`) | 202 | Telegram link in the background (§4 Auth); same answer for any login; 5/min |
| POST | `/auth/password-reset/confirm` | none | `PasswordResetConfirm` | `AccessOut` + cookie | Bad, expired or used link → 400 `RESET_LINK_INVALID`; 10/min |
| POST | `/auth/google` | none | `GoogleIn` (`credential`: Google's ID token) | `SocialOut` | Logged in (`access_token` + cookie) or `signup` for someone new; 401 `SOCIAL_SIGN_IN_FAILED`, 503 `SOCIAL_NOT_CONFIGURED`; 10/min |
| POST | `/auth/oauth/{provider}` | none | `OAuthIn` (`code`, `redirect_uri`); provider `facebook` or `tiktok` | `SocialOut` | Logged in or `signup`; 422 `INVALID_REDIRECT`, 401 `SOCIAL_SIGN_IN_FAILED`, 503 `SOCIAL_NOT_CONFIGURED`; 10/min |
| POST | `/auth/social/register` | none | `SocialRegisterIn` (`signup_token`, `full_name`, `store_name`, `phone_check`) | `AccessOut` + cookie (201) | No password; 400 `SIGNUP_EXPIRED`, 409 `SOCIAL_TAKEN` / `PHONE_TAKEN`; 5/min |
| POST | `/auth/phone-checks` | none | none | `PhoneCheckOut` (201) | `{id, telegram_url, expires_at, phone: null, taken: false}`; 503 `TELEGRAM_NOT_CONFIGURED` without the bot; 10/min |
| GET | `/auth/phone-checks/{id}` | the check's id | — | `PhoneCheckOut` | `phone` once shared in Telegram; `taken` when an account already has it; expired or unknown → 404 `PHONE_CHECK_EXPIRED`; 60/min (the page reads it every few seconds) |
| GET | `/seller/account` | seller | — | `AccountOut` | The person's own phone (login), email (older accounts, else null), name, role, `has_password`, `logins` (`[{provider, label}]`, label = the email or the name) (`UnscopedDb`, filtered by the token's seller id) |
| PATCH | `/seller/account` | seller | `AccountUpdate` | `AccountOut` | `full_name` only |
| POST | `/seller/account/phone` | seller | `PhoneChange` (`phone_check`) | `AccountOut` | New login number from a finished phone check; another account's → 409 `PHONE_TAKEN` |
| POST | `/seller/account/google` | seller | `GoogleIn` (`credential`) | `AccountOut` | Log in with this Google account too (replaces one connected before); another shop's → 409 `SOCIAL_TAKEN` |
| POST | `/seller/account/oauth/{provider}` | seller | `OAuthIn` | `AccountOut` | Log in with this Facebook / TikTok account too (the code from `/auth/<provider>/callback`); another shop's → 409 `SOCIAL_TAKEN` |
| POST | `/seller/account/close-shop` | seller | `CloseShopIn` (`password`, not needed without one) | 204 | `seller.is_active = false` and every session deleted: the shop page is 404, login 403 `ACCOUNT_DISABLED` ("This shop is closed. Message Oak Order to open it again."). Nothing is erased; wrong password → 422 `WRONG_PASSWORD` |
| POST | `/seller/account/password` | seller | `PasswordChange` | `AccessOut` + cookie | Wrong current password → 422 `WRONG_PASSWORD`; ends every other session (§4 Auth) |
| GET | `/seller/store` | seller | — | `StoreOut` | Includes the three settings, `payment_set_up` (false until `payment_config` was saved once; the setup checklist), `delivery_set_up` (false until `delivery_config` was saved once: the shop runs on free own delivery), `telegram_connected`, `telegram_bot_available` |
| PATCH | `/seller/store` | seller | `StoreUpdate` | `StoreOut` | Partial; settings blobs saved whole; null on name/slug/currency/mode = leave; `logo_url` only from this store's logo folder (null removes); slug clash → 409 `SLUG_TAKEN` |
| POST | `/seller/store/logo` | seller | `ImageUploadIn` | `ImageUploadOut` | Presigned PUT into `stores/<id>/logo/` |
| POST | `/seller/store/telegram/link` | seller | — | `TelegramLinkOut` | `t.me/<bot>?start=<code>`, valid 30 min; 503 if bot not configured |
| DELETE | `/seller/store/telegram` | seller | — | `StoreOut` | Clears `telegram_chat_id` (logic in the router) |
| GET | `/seller/staff` | owner | — | `list[StaffOut]` | The shop's staff, oldest first |
| POST | `/seller/staff` | owner | `StaffCreate` (`full_name`, `phone`, `password`) | `StaffOut` (201) | Phone (their login) taken → 409 `PHONE_TAKEN`; more than 10 → 409 `STAFF_LIMIT` |
| POST | `/seller/staff/{staff_id}/password` | owner | `StaffPassword` | `StaffOut` | Sets it and logs their phones out; another shop's → 404 `STAFF_NOT_FOUND` |
| DELETE | `/seller/staff/{staff_id}` | owner | — | 204 | Deletes the login (and its sessions) |
| GET | `/seller/categories` | seller | — | `list[CategoryOut]` | With `product_count`; by name |
| POST | `/seller/categories` | seller | `CategoryCreate` | `CategoryOut` (201) | Slug from name if omitted |
| PATCH | `/seller/categories/{category_id}` | seller | `CategoryUpdate` | `CategoryOut` | |
| DELETE | `/seller/categories/{category_id}` | seller | — | 204 | Hard delete; products become uncategorized |
| GET | `/seller/products` | seller | `?status=&category_id=` | `list[ProductOut]` | Newest first; **no paging** |
| POST | `/seller/products` | seller | `ProductCreate` | `ProductOut` (201) | |
| GET | `/seller/products/{product_id}` | seller | — | `ProductOut` | |
| PATCH | `/seller/products/{product_id}` | seller | `ProductUpdate` | `ProductOut` | `variants` = full new list (id keeps, missing deletes); omitted `stock_quantity` = unchanged; `image_urls` prefix-checked |
| DELETE | `/seller/products/{product_id}` | seller | — | 204 | Soft: `status=inactive` |
| POST | `/seller/products/{product_id}/images` | seller | `ImageUploadIn` | `ImageUploadOut` | Presigned PUT (+ thumbnail PUT if `thumbnail_size`); max 5 images, 5 MB, JPEG/PNG/WebP |
| POST | `/seller/orders` | seller | `SellerOrderCreate` | `OrderOut` (201) | An order from a chat (founder's pick 3A): `checkout.place_order(by_seller=True)`, so checkout's prices, stock, totals and `expected_total` check; taken while paused; starts `accepted`; `source = "chat"`; no "new order" on the bell or Telegram, low stock only |
| GET | `/seller/stats` | **owner** | `?period=today\|week\|month` | `StatsOut` | **Not shown in the app yet**: kept for the seller dashboard (founder, 2026-10-09: the numbers and chart wait for it; picks 8B, 9B; `services/stats.py`): orders placed in the period except rejected / cancelled, their totals and their pending payments per currency, Phnom Penh days; `days` = sales per day in the shop's currency, the last 7 days for today and the week, this month's days so far for the month. 403 `OWNER_ONLY` for staff |
| GET | `/seller/orders` | seller | `?status=` (repeatable) `&created_from=&created_to=&limit=1..100(50)&offset=` | `OrderListOut` | By number desc; `counts` per status ignore the status filter; each row leads with its biggest line (`first_item_name`, `line_count`, `first_item_image_url`: that product's photo now), also on a customer's and a link's orders |
| GET | `/seller/orders/export` | seller | `?first=&last=` (dates, Phnom Penh days, both included) `&lang=en\|km` | `.xlsx` file | One row per order, oldest first: number, date, customer, phone (as text), items, the four amounts (number format per currency), payment, delivery, statuses, address, source, note; frozen, filterable heading row. Over a year or ending before it starts → 422 `INVALID_DATE_RANGE`. Declared before `/{order_id}` |
| GET | `/seller/orders/{order_id}` | seller | — | `OrderOut` | With `next_statuses` on order, payment, delivery; each item carries its product's current first photo (`image_url`, as on the shop's order page; also on the three PATCHes below) |
| PATCH | `/seller/orders/{order_id}/status` | seller | `OrderStatusUpdate` | `OrderOut` | §6 |
| PATCH | `/seller/orders/{order_id}/payment` | seller | `PaymentUpdate` | `OrderOut` | §6 |
| PATCH | `/seller/orders/{order_id}/delivery` | seller | `DeliveryUpdate` | `OrderOut` | §6 |
| POST | `/seller/orders/{order_id}/cash-handover` | seller | — | `OrderOut` | Cash on delivery: delivery delivered + payment paid, both or neither (§6) |
| GET | `/seller/customers` | seller | `?q=(≤100)&limit=1..100(50)&offset=` | `CustomerListOut` | Last ordered first; `q` matches name (case-insensitive) or phone typed any way |
| GET | `/seller/customers/{customer_id}` | seller | — | `CustomerDetailOut` | Latest 100 orders |
| GET | `/seller/notifications` | seller | `?limit=1..50(20)&offset=` | `NotificationListOut` | Web rows, newest first (`new_order`, `low_stock`, `payment_claimed`); listing doesn't mark read |
| GET | `/seller/notifications/unread` | seller | — | `UnreadOut` | The bell |
| POST | `/seller/notifications/read` | seller | `MarkReadIn` (`up_to`) | `UnreadOut` | Marks read where `sent_at <= up_to` |
| GET | `/seller/links` | seller | — | `list[LinkOut]` | Newest 200, with view/order counts |
| POST | `/seller/links` | seller | `LinkCreate` | `LinkOut` (201) | Same target + source + campaign returns the existing link; hidden product → 409 `PRODUCT_HIDDEN` |
| GET | `/seller/links/{link_id}/stats` | seller | — | `LinkStatsOut` | + its orders (≤100) |
| GET | `/shop/{store_slug}` | public | — | `ShopStoreOut` | Categories with active products, payment method names, delivery options, discounts, `telegram_username` / `messenger_username` / `contact_phone`, `orders_paused` / `orders_resume_on` |
| GET | `/shop/{store_slug}/products` | public | — | `list[ShopProductCard]` | Active only; **no paging**; `has_variants` and `stock_quantity` (null with variants) let the grid's + add to the cart |
| GET | `/shop/{store_slug}/products/{product_slug}` | public | — | `ShopProductOut` | Variants with effective price and stock |
| GET | `/shop/{store_slug}/categories/{category_slug}` | public | — | `ShopCategoryPageOut` | |
| POST | `/shop/{store_slug}/orders` | public | `OrderCreate` | `ShopOrderOut` (201) | Guest checkout; 409 `ORDERS_PAUSED` while paused; +10/min; Telegram alert in background |
| GET | `/shop/{store_slug}/orders/{order_id}` | public | `?phone=` (≤32) | `ShopOrderOut` | 404 unless phone matches (any spelling); includes how to pay while pending; each item carries its product's current first photo (`image_url`, not a snapshot) |
| POST | `/shop/{store_slug}/track-view` | public | `TrackViewIn` (`token`) | 204 | View written in background; unknown token ignored; +60/min |
| POST | `/shop/{store_slug}/orders/{order_id}/paid` | public | `PaymentClaimIn` (`phone`) | 204 | "I've paid" (founder's pick 6B): the order link + phone like tracking (404 otherwise); 409 `NOTHING_TO_PAY` unless a pending KHQR / bank payment on an order that's on. Saves a web `payment_claimed` row and sends a Telegram alert in the background, not again within 30 min; the payment stays pending. +10/min |
| POST | `/telegram/webhook` | header `X-Telegram-Bot-Api-Secret-Token` | Telegram update (raw dict) | Bot API method call as JSON, or `{}` | 404 if the secret is wrong or the bot is off |

Schemas live in `app/schemas/<domain>.py`: auth (`RegisterIn`, `LoginIn`,
`PasswordResetIn`, `PasswordResetConfirm`, `TokenPair` (the service's pair), `AccessOut` (what routes answer)), account (`AccountOut`, `AccountUpdate`,
`PasswordChange`), store (`StoreOut`, `StoreUpdate`,
`TelegramLinkOut`), category, product (`ProductCreate/Update/Out`,
`VariantIn/Out`, `Money`), upload (`ImageUploadIn/Out`), order
(`OrderCreate`, `OrderLineIn`, `ShopOrderOut`, `OrderOut`,
`OrderSummaryOut`, `OrderListOut`, `OrderStatusUpdate`), payment
(`PaymentSettings`, `PaymentOut`, `PaymentUpdate`, `ShopPaymentOut`),
delivery (`DeliverySettings`, `DiscountSettings`, `DeliveryOut`,
`DeliveryUpdate`, `ShopDeliveryOut`, `ShopDeliveryOptions`), customer,
notification, link, storefront (`ShopStoreOut`, `ShopProductCard`,
`ShopProductOut`, `ShopCategoryPageOut`).

**Checkout essentials** (`OrderCreate` → `checkout.place_order`):
- Body fields: `name`, `phone` (normalized), `items[{product_id,
  variant_id?, quantity 1..99}]` (1..50 lines), `payment_method`,
  `delivery_method`, `courier?`, `delivery_address?`, `delivery_lat?` /
  `delivery_lng?`, `delivery_address_note?`, `notes?`, `expected_total`,
  `link?`.
- Prices and stock come from the DB. Duplicate lines are merged.
- If the computed total ≠ `expected_total`, the order is refused with 409
  `ORDER_TOTAL_CHANGED`.
- Line problems name the line (`field: items.N`): `PRODUCT_UNAVAILABLE` or
  `PRODUCT_OUT_OF_STOCK`.
- A delivery needs an address, a GPS pin, or both. Pickup ignores the
  location fields.
- In the same transaction it creates the customer (or updates it by phone),
  the order, its items, payment and delivery, the web notification rows,
  and a `link_event(order)` if `link` matches one of this store's tokens.

---

## 8. Frontend

**Stack:** React 19, React Router 8 (imports from `react-router`, data
router via `createBrowserRouter`), TanStack Query 5, Tailwind CSS 4 (via
`@tailwindcss/vite`; there is no `tailwind.config`, the theme lives in
`src/index.css`), Vite 8, TypeScript 6, oxlint. Other libraries:
lucide-react (icons), leaflet (checkout map, lazy-loaded), uqr (draws
KHQR), @sentry/react, @vercel/functions (middleware),
@fontsource-variable/kantumruy-pro. No automated frontend tests.

### Routes (`src/router.tsx`)

| Path | Component | Notes |
|---|---|---|
| `/` | `pages/Home` | Landing: Register / Log in |
| `/login`, `/register` | `pages/Login`, `pages/Register` | "Continue with Google / Facebook / TikTok" over the phone form (`auth/SocialButtons.tsx`; each only when its `VITE_` ID is set); Login has "Forgot password?" |
| `/register/finish` | `pages/FinishSignup` | Someone new from Google, Facebook or TikTok: shop name, name, phone checked in Telegram → `POST /auth/social/register`. The signup comes in the navigation state or `sessionStorage` `sc.signup` (`lib/signup.ts`); without one, back to `/register` |
| `/auth/:provider/callback` | `pages/OAuthCallback` | Back from Facebook / TikTok with `code` and `state`. Only the sign-in this tab started (`sessionStorage` `sc.oauth`, 15 min, `lib/oauth.ts`) is finished: log in (`POST /auth/oauth/{provider}`, then like Google, `auth/useSocialResult.ts`) or connect (waits for the session, `POST /seller/account/oauth/{provider}`, back to Your account). Cancelled, refused or someone else's → "Couldn't log you in" with a link back |
| `/privacy`, `/terms`, `/data-deletion` | `pages/Legal` | Public, no login; English or Khmer with the language switch. The text is in `pages/legal/content.ts` (what's kept, the hosts, cookies, how long, deletion: keep it true to the code), the date in `UPDATED`; Contact links `VITE_SUPPORT_TELEGRAM` (else "Settings → Get help"). Linked from the start page (`LegalLinks`) and under "Create store" (`pages/AgreeLine.tsx`). Meta and TikTok ask for these URLs (2026-10-09) |
| `/forgot-password`, `/reset-password#<token>` | `pages/ForgotPassword`, `pages/ResetPassword` | The link goes to the shop's Telegram; without Telegram, "Message Oak Order" (if `VITE_SUPPORT_TELEGRAM`). Saving logs in (`startSession` in `AuthContext`) |
| `/dashboard` | `dashboard/Layout` (`DashboardLayout`) | **Auth guard**: spinner while loading, retry card if unreachable, `Navigate` to `/login` if anonymous; index redirects to `orders` |
| `/dashboard/settings/setup` | `settings/SetupPage.tsx`, `settings/setup.ts` | A new shop's checklist (founder's pick 7C), owners only: add a product, delivery fee (`delivery_set_up`), ways to pay (`payment_set_up`), Telegram alerts (when the bot exists), contact buttons, logo; each opens its page. "Set up your shop · 2 of 6 done" tops the Settings menu until all are done or "Hide this list" (per device, `sc.setup.hidden.<store id>`); an amber dot on the Settings tab (and sidebar) until the first three are done |
| `/dashboard/orders/new` | `orders/NewOrder.tsx` | An order from a chat (picks 3A, 4A; "+ New order" beside the Orders title). Phone first: a customer found by phone fills in their name and latest address. Products from the seller's list (search, tap to add; options as chips; sold out can't be added), the shop's delivery choices and ways to pay, a note; totals with `lib/pricing.ts` like the cart; pinned Save with the total. The saved order says "Added by you from a chat" and has "Copy link for the customer" |
| `/dashboard/orders`, `/orders/:orderId` | `OrdersPage` (`OrderList.tsx`: the list, with `OrderDetail` beside it on laptops) | Orders tab is the start page; phones show the list or the order; rows (`OrderRow.tsx`) lead with the customer and have no buttons; accepting or rejecting in the open order's To do card (`useMoveOrder.ts`) opens the next new order of the tab (`nextNewOrder`), unless it was opened from a customer's or a link's page. The To do card follows the short path (1C): Accept / Reject; then "Next: deliver it" with Delivered (cash on delivery: "Delivered, cash received" first, `useCashHandover`); then Complete once `next_statuses` has it; the order's processing / ready / shipped as optional chips (`StepChips`), Cancel as red text. The Delivery card: "Send to driver" (pick 5B, `SendToDriver` / `driverMessage`: number, name, phone, address, map link, note, items, and "Collect $X cash" / "Paid already" / "Paying by KHQR", in the app's language; the share list on touch phones, copied on laptops), Assign and Delivered, picked up / on the way as chips, Delivery failed as red text. Amber reminders above the list (`Reminder`, opening the setting for owners): orders paused, and delivery not set up (`delivery_set_up`, "free for customers"; the Settings menu's Delivery row says the same). No orders yet: "Add your first product" while the shop has none, else "Open your shop". |
| `/dashboard/customers`, `/customers/:customerId` | `CustomerList`, `CustomerDetail` | Laptops: a sortable table (sorts the customers loaded); a customer has Call / Copy phone |
| `/dashboard/products`, `/products/new`, `/products/:productId` | `ProductList`, `ProductEdit` | Photos (cards as tall as the photo) or List (rows; a sortable table on laptops), kept in `sc.products.view`; stock tags: the seller's `low_stock_alert` or fewer is "Only N left" |
| `/dashboard/categories` | `Categories` | Button on Products on phones; sidebar entry on desktop. "New category" opens a labelled form; each row's actions (share link, rename, delete) are in one ⋯ menu (`RowMenu`) |
| `/dashboard/links`, `/links/new`, `/links/:linkId` | `LinkList`, `NewLink`, `LinkDetail` | Links as cards with Copy, views, orders and % ordered |
| `/dashboard/settings`, `/settings/:section` | `SettingsPage` (`SettingsMenu` beside `SettingsSection` on laptops) | Store sections (`SECTION_IDS` in `form.ts`, saved with `PATCH /seller/store`): `shop`, `orders`, `payments`, `delivery`, `discounts`, `contact` (Telegram username, Messenger page, phone), `telegram` (titled Alerts: the low-stock level, and Telegram, which connects at once; the address stays /telegram because the bot's messages name it), `link`. Pages with their own endpoint (`PAGE_IDS`, `PAGES` in `SettingsSection.tsx`): `account`, `export` (This month / Last month / Choose days; downloads with `apiBlob` in `lib/api.ts`), `close` (password, confirm, then log out), `staff`. Staff see a note instead of the store rows, then Your account, Get help, language and log out; any other settings address sends them to `account` (`useRole()` from `GET /seller/account`). Laptops open `shop` when none is chosen |
| `/dashboard/notifications` | `Notifications` | |
| `/shop/:storeSlug` | `shop/ShopLayout` → `ShopHome` | Public. While paused, `PausedNotice` (`shop/components.tsx`) tops every shop page and the cart's Place order is disabled; the seller's Orders tab shows a reminder |
| `/shop/:storeSlug/product/:productSlug` | `ShopProduct` | |
| `/shop/:storeSlug/category/:categorySlug` | `ShopCategory` | A tab of the same page as `ShopHome` (`handle: { page: 'products' }`): switching between All and a category doesn't fade the page in |
| `/shop/:storeSlug/cart` (`/checkout` forwards here) | `ShopCheckout` (with `CartItems` / `EmptyCart` from `ShopCart.tsx`) | The cart and checkout on one page (redesign 2026-10-06) |
| `/shop/:storeSlug/order/:orderId` | `ShopOrderPage` | Confirmation + tracking |
| `/shop/:storeSlug/orders` | `ShopOrders` | Orders placed on this device |
| `*` | redirect to `/` | |

The dashboard shell has a bottom tab bar on phones (Orders, Customers,
Products, Links, Settings) and a sidebar from `lg`. The product edit, order
detail and settings section pages are "focused" screens with no app or tab
bar, their own back button, and a pinned action bar.

### API client (`src/lib/api.ts`)

```ts
api<T>(path, { method = 'GET', body?, auth = true }): Promise<T>
// fetches `${VITE_API_URL}/api/v1${path}`, JSON body, Bearer access token when auth
```

- Non-2xx throws `ApiError(status, code, message, field)` built from the
  envelope. A fetch failure throws `ApiError(0, 'NETWORK_ERROR', ...)`. A
  204 resolves to `undefined`.
- On a 401 with `auth`, it calls `refreshTokens()` once and retries. If the
  refresh fails, it calls `clearTokens()` and the session-ended handler
  (which clears the query cache and sets the user anonymous).
- Every request is sent with `credentials: 'include'`, so the refresh
  cookie goes to `/auth/*` and comes back from it.
- `refreshTokens()` posts to `/auth/refresh` with no body (the browser sends
  the cookie) and is serialized within the tab and across tabs (Web Locks
  `sc-token-refresh`), because each refresh token is swapped once (the
  server's 60 s retry grace covers an answer lost on the network, not
  tabs racing each other).
- Storefront calls pass `auth: false`.
- Errors in the UI: `errorText(error)` (translated, see i18n),
  `fieldError(error, 'payment_settings.khqr.bakong_account_id')` puts the
  message under an input, and `formError(error, fields)` gives the
  form-level message unless a field took it (`src/lib/errors.ts`).

### TanStack Query

- Global defaults (`main.tsx`): `retry: 1`, `refetchOnWindowFocus: false`.
- **Seller hooks** are in `src/dashboard/queries.ts`. Keys:

```ts
export const keys = {
  store: ['store'], telegramLink: ['telegram-link'], categories: ['categories'],
  products: ['products'], product: (id) => ['products', id],
  orders: ['orders'], orderList: (statuses) => ['orders', 'list', statuses], order: (id) => ['orders', id],
  notifications: ['notifications'], notificationList: ['notifications', 'list'], unreadNotifications: ['notifications', 'unread'],
  customers: ['customers'], customerList: (search) => ['customers', 'list', search], customer: (id) => ['customers', id],
  links: ['links'], link: (id) => ['links', id],
}
```

  Convention: `[resource]` for the collection, `[resource, id]` for one
  item, `[resource, 'list', filter]` for filtered or paged lists.
  Mutations `setQueryData` the returned entity and invalidate the related
  lists (e.g. an order change invalidates `['orders', 'list']`, and
  `['products']` because stock may come back). Paged lists use
  `useInfiniteQuery` with `offset = pages.length * PAGE` and
  `placeholderData: keepPreviousData`. The orders list, the bell and the
  notifications poll every 30 s (`POLL_MS`) and refetch on focus.
  **Freshness** (perf audit F9, founder 2026-10-10): `useStore`,
  `useAccount` and `useCategories` have `staleTime: SETTLED_MS` (5 min),
  so screens reuse them instead of refetching on each mount; anything that
  saves them must `setQueryData` or invalidate (all current saves do), and
  a change from another device can take 5 minutes to show. Everything else
  keeps the default `staleTime: 0` (e.g. the Products screen fetches the
  list on every visit, for current stock). `useHasProduct()` (F1) is the
  setup checklist's "the shop has a product": the products query with a
  `select`, never refetched on mount once true (products are hidden, never
  deleted); saving a product still invalidates it.
- **Shop hooks** are in `src/shop/queries.ts`. Keys start with `['shop',
  slug, ...]`: `['shop', slug]`, `['shop', slug, 'products']`, `['shop',
  slug, 'product', productSlug]`, `['shop', slug, 'category',
  categorySlug]`, `['shop', slug, 'order', orderId, phone]`. Shop queries
  have `staleTime: 60_000` and no retry on 404. `useTrackOrder` refetches
  every 30 s while the order is in progress. `useMyOrders` fans out
  `useQueries` over the orders remembered on the device. `trackView` is
  fire-and-forget.
- A few mutations are written inline in components rather than in
  `queries.ts`: category create/rename/delete (`Categories.tsx`), store
  PATCH per settings section (`SettingsSection.tsx`), logo save and
  Telegram link/disconnect (`settings/fields.tsx`).

### Auth handling

`AuthProvider` (`src/auth/AuthContext.tsx`) exposes `status: 'loading' |
'authenticated' | 'anonymous' | 'unreachable'`, plus `login`, `register`,
`logout`, `restoreError` and `retryRestore` through `useAuth()`. `login`
takes a phone number or, behind "Log in with email instead"
(`pages/LoginField.tsx`, also on Forgot password), an older account's email.
`Register` and Settings → Your account prove a phone number with
`auth/PhoneCheck.tsx`: the check is created ahead (so "Verify with
Telegram" is a plain link a phone browser won't block), read every 2.5 s
once opened (and on focus) until it has the number, and handed to the form;
a used-up check at submit remounts it (`key`). The phone check shows a
"Start again" button once it has expired (30 min). On load, if
`sc.session` is set, it refreshes (with the cookie) to restore the session.
If the API can't be reached at all (the refresh rejects with `NETWORK_ERROR`),
status becomes `'unreachable'`: the cookie stays, `DashboardLayout` shows
`ErrorState` with a retry (`retryRestore`), and `Home` sends a stored session
there instead of the landing page. `logout` ends the refresh token's session on the server and drops the
cookie (best effort), clears the token, `sc.session` and the query cache. Only `DashboardLayout` guards
routes.

### What the device remembers

`localStorage`: `sc.session` (no token, just "try to restore"), `sc.lang`, `sc.theme`,
`sc.cart.<slug>` (cart per shop), `sc.customer` (checkout details),
`sc.orders` (last 20 orders with their phone, for tracking), `sc.links`
(last link per shop and view timestamps: 30-minute view gap, 7-day order
window). `sessionStorage`: "confetti already shown" per order. Every access
is wrapped in try/catch (private mode).

### Shared components and helpers

- `components/ui.tsx`: `Field`, `Input`, `MoneyInput`, `PasswordInput`,
  `TextArea`, `Select`, `Switch`, `Button`, `IconButton`, `Card`,
  `Section`, `PageHeader` (with back link), `PageOutlet` (outlet that
  fades a page in when another route opens; routes with the same
  `handle.page` count as one page and don't fade: the shop's All and
  category tabs), `Badge`, `LiveBadge`, `Skeleton`, `EmptyState`, `ErrorMessage`,
  `ErrorState` (with retry), `Spinner`, `SlowNotice` (after 4 s: "the
  first visit can take a minute"), `SuccessTick`, `SavedNote`.
  `Field` puts a red * on the label of a `required` control (CSS
  `:has(:required)`, so it follows a changing `required`). Forms keep the
  browser's own validation, but `Field` catches the `invalid` event: it
  turns the browser bubble off and shows the reason as the field's error
  in the app's language (`problemText`: empty, bad email, too short,
  pattern via the input's `title`, number range and step; the browser's
  message only for anything else), then scrolls to and focuses the first
  bad field. Typing clears it. `className` and `labelClassName` let the
  variant rows use it in their grid.
- `components/styles.ts`: `buttonClass(variant, size)` (variants primary,
  secondary, danger, destructive, ghost; sizes md, lg) and `cardClass`.
- `components/feedback.ts` + `FeedbackProvider.tsx`: `useFeedback()` →
  `toast(message, tone)` and `await confirm({title, message,
  confirmLabel, danger})` (a bottom sheet).
- `components/SourceLogo.tsx`: the real Facebook, TikTok, Instagram,
  Telegram and Messenger logos in their own colours, wherever a link's
  place shows (link cards, New link picker, link page, an order's "Came
  through" line). Shapes in `lib/sourceLogos.ts` (Simple Icons, CC0);
  `hasLogo(source)` is false for a place the seller typed in.
- `components/effects.ts` (confetti, vibration, `reducedMotion()`),
  `components/useBump.ts` (re-run an animation when a value changes),
  `shop/fly.ts` (photo flies into the cart).
- `shop/CurrentOrder.tsx`: `CurrentOrderButton`, in the shop's header
  (`ShopLayout`) while an order placed on this device is in progress,
  except on the order, checkout and Your orders pages: a truck (a box
  for pickup) idling with `animate-drive`, that opens the order, or Your
  orders with several.
- `shop/MadeWithOak.tsx`: the line at the very bottom of the shop's grid
  pages (All, each category) and the order page (`ShopLayout`), not on
  product pages, the cart or Your orders: our mark and "Made with Oak
  Order" (to `/`), then Privacy · Terms, each in a new tab (founder's
  picks 1A 2A, 2026-10-10). `components/OakLeaf.tsx` is the mark.
- `shop/components.tsx`: `ProductImage` (thumbnail with fallback;
  `eager` loads it at once at high priority, `later` asks for it at low
  priority (a gallery's 2nd photo on); otherwise lazy. Lists pass `eager`
  to their first `EAGER_PHOTOS` (4) photos: the shop grid by product
  order, the seller's photo wall, list and table, and order rows via
  `OrderRow`'s `eager`; perf audit F5, F6;
  `natural` keeps the photo's shape, square until it first loads; a
  `natural` photo already shown since the page loaded is remembered with
  its shape in `shownPhotos` and drawn at once, decoded with its card,
  instead of fading in again), `ProductGrid` (a photo wall with the same
  cards as the seller's grid view; the card's link covers it with
  `::after` so the + can sit on the photo), `ProductGridSkeleton`,
  `CategoryChips`, `ShopLogo`, `NotFound`, `QuantityStepper`. The shop's
  cards rise in (40 ms apart, in product order) only the first time a
  list (shop + category) shows since the page loaded (`shownLists`,
  `useRising`); opened again, it comes from the cache and is just there.
- `components/columns.ts`: **photo walls are not CSS columns** (the
  shop's grid and its skeleton, the seller's Photos view). iPhone Safari
  draws a card that animates (fading in, or shrinking under a finger) in
  a CSS column other than the first late, or not at all, for a moment.
  `deal()` hands the items out in turn into side-by-side flex columns
  (`<ul>` each); `useColumnCount()` gives 2 on phones and 3/4/5 from
  Tailwind's sm/lg/xl (`matchMedia`, re-dealt on rotate or resize). They
  read left to right, then down: item `row * count + column`, which is
  also what decides the first `EAGER_PHOTOS`. There's no photo size in
  the API, so it alternates rather than filling the shortest column. The
  DOM, and so Tab and screen readers, goes down one column, then the
  next.
- `dashboard/useUnsavedChanges.ts` (blocks navigation with a confirm sheet
  while a form is dirty) and `dashboard/useBackTo.ts` (back arrow returns
  to `location.state.back`).
- `lib/`: `money.ts` (`formatMoney`: "$12.50" or "50,000៛"; cents
  helpers), `orders.ts` date helpers (`formatCalendarDay` for date-only API
  values, `phnomPenhDate`), `pricing.ts` (**the frontend copy of `services/pricing.py`, in
  integer cents; change both together**), `images.ts` (shrinks to 1600 px
  JPEG and makes the ~480 px thumbnail, then uploads; `thumbnailUrl()`),
  `orders.ts`, `payments.ts`, `delivery.ts` (status tones, badges, labels),
  `links.ts`, `customers.ts`, `products.ts`, `useDebounced.ts`.
- `lib/types.ts` hand-mirrors the backend response models. There is no
  codegen; update it by hand when a schema changes.

### i18n (`src/i18n/`)

Every text the platform shows is an `{ en, km }` pair in
`messages/<area>.ts`, and each file is checked with `satisfies Tree`, so a
missing language fails the build. Components call `const t = useT()` and
read `t.orders.title` or `t.orders.items(3)` (functions for plurals and
values). The default language is Khmer, chosen per device (`sc.lang`).
Backend messages are English; `errorText()` maps them to Khmer by exact
message, then by code (`messages/apiErrors.ts`). **Every new backend error
message needs a Khmer entry there.** What sellers type is shown as typed.

### Tailwind conventions

- **Mobile-first.** Base classes are for phones; `sm:` (640 px) turns
  edge-to-edge cards into rounded inset cards; `lg:` (1024 px) switches to
  the sidebar layout. The dashboard column is `max-w-3xl` (order detail
  `lg:max-w-5xl`); the shop is `max-w-5xl`.
- **Write classes for light mode only.** Dark mode (`:root[data-theme='dark']`
  in `index.css`) flips the slate, navy, emerald, red, amber and sky scales.
  Solid fills that must not flip use the tokens `bg-surface` (cards, bars,
  inputs; **never `bg-white`**), `bg-raised`, `bg-accent` / `hover:bg-accent-hover`,
  `bg-brand` and `bg-danger`, with `text-white`.
- Cards: `cardClass` (`-mx-4 ... sm:mx-0 sm:rounded-2xl`) or `<Card>`:
  `shadow-card` plus `ring-1 ring-slate-900/6`, not a grey border.
- Touch targets at least 44 px (`min-h-11`); inputs at 16 px (no iOS
  zoom); safe-area insets on fixed bars (`pb-[calc(env(safe-area-inset-bottom)+...)]`).
- Brand colour is **navy** (founder's choice 2026-10-06; a calm look, one
  quiet colour on white and grey): a custom `navy-50`..`navy-950` scale in
  `index.css`, `bg-accent` = navy-700, focus rings
  `focus-visible:outline-navy-600`, links `text-navy-700`, the chosen item
  `bg-navy-50 text-navy-700`. **Emerald means success only** (paid,
  delivered, saved, a discount, free delivery, in stock, the success
  tick); don't use it for brand things.
- Animations are theme tokens (`animate-rise`, `animate-fade-in`,
  `animate-pop`, `animate-sheet-up`, `animate-shimmer`, `animate-wiggle`,
  `animate-drive`, `animate-arrive`, ...); a `prefers-reduced-motion` rule turns them off.
  Entrance animations use `backwards` fill so no transform lingers (it
  would pin fixed bars inside cards).
- Font: Kantumruy Pro for everything (2026-10-06): two self-hosted
  variable files picked by `unicode-range`, Khmer (~57 KB) and Latin
  (~33 KB), each downloaded once; the system fonts are the fallback.

### Link previews (`frontend/middleware.ts`)

A Vercel Routing Middleware with `matcher: '/shop/:path*'`. For preview-bot
user agents only (Facebook, Telegram, TikTok, WhatsApp, ...), it fetches
the storefront API (6 s timeout) and returns `index.html` with `og:` title,
description and image filled in, in Khmer. Everyone else passes straight
through to the SPA.

---

## 9. Integrations

| Integration | State | Details |
|---|---|---|
| **Google sign-in** ("Continue with Google") | WIRED, env-gated (`GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID`); not set up yet (needs the founder's Google Cloud client) | Google Identity Services script (`accounts.google.com/gsi/client`, loaded on first use, `src/lib/google.ts`), its own button (`auth/GoogleButton.tsx`, outline, as wide as the form up to 400 px, in the app's language), popup mode; the ID token is checked by the API (`core/google.py`). No secret, no redirect URL; the client must list `https://order.oaksolve.com` and `http://localhost:5173` as JavaScript origins. Tested with a key made in the tests and a stand-in button in the browser, not yet with real Google |
| **Facebook / TikTok sign-in** | WIRED, env-gated (`FACEBOOK_APP_ID`+`_SECRET` / `TIKTOK_CLIENT_KEY`+`_SECRET`, and the `VITE_` IDs); not set up yet (needs the founder's Meta and TikTok apps, and their reviews) | Redirect flow, no SDK: `lib/oauth.ts` sends the browser to `facebook.com/v26.0/dialog/oauth` (scope `public_profile,email`) or `tiktok.com/v2/auth/authorize/` (scope `user.info.basic`) with a random `state`; the API trades the code (`core/oauth.py`). Redirect URIs to register: `https://order.oaksolve.com/auth/facebook/callback` (+ `http://localhost:5173/...` for Facebook in development mode) and `https://order.oaksolve.com/auth/tiktok/callback` (TikTok takes https only, so no localhost). Their buttons are drawn like Google's outline button (`auth/ProviderLogo.tsx`). Tested with the providers' answers faked (tests and the browser), not yet with the real ones |
| **Telegram bot** (seller alerts) | WIRED, env-gated | `services/telegram.py`: plain `httpx` calls to the Bot API (`sendMessage`, `setWebhook`). Webhook registered at startup only when `PUBLIC_API_URL` is set. Webhook checks the secret header with `hmac.compare_digest`. `/start <code>` in a private chat stores `store.telegram_chat_id` (the code is store id + expiry + 12-byte HMAC-SHA256, base64url, 43 chars, key derived from `JWT_SECRET`). Groups are ignored. Replies go back in the webhook response. Alerts (`services/notifications.py`) for new orders and low stock (crossing the shop's `low_stock_alert`, 5 to start, or to 0), and "<name> says they paid #1001" when a customer taps "I've paid" (`notify_payment_claimed`), go out after the response (`_send_all`). An order the seller added from a chat sends only low stock. Bot texts point to Settings → Alerts. Each writes a `notification_log` row (`telegram`, sent or failed). A 403, or a 400 "chat not found", disconnects the store. Every bot message (alerts, connect and help replies, the password reset) is in Khmer only, the app's default language, in the app's own Khmer words (decided 2026-10-09; no per-seller language is stored); HTML-escaped. The same chat gets "Forgot password?" links (`auth.send_password_reset`, no log row). **Phone check** (founder's choice 2026-10-09, instead of SMS codes; `services/phone_check.py`): `/start phone_<code>` remembers who opened it and answers with a reply keyboard button `request_contact` ("📱 ចែករំលែកលេខទូរស័ព្ទ"); the contact that comes back counts only if `contact.user_id` is the sender's own id (anyone can attach someone else's contact card), then completes the newest open check that account opened and removes the keyboard. Telegram numbers come without the + (`855…`), so the + is added before `normalize_phone`. Codes starting `phone_` go to the phone check, the rest to the store link. On a laptop, `python -m app.telegram_poll` stands in for the webhook. Live and tested by the founder (04). |
| **"Ask seller": Telegram, Messenger, call** | WIRED (no bot) | `shop/ContactSeller.tsx` (+ `contact.ts`) on the product page and the order page: `https://t.me/<telegram_username>?text=<question>`; `https://m.me/<messenger_username>` (m.me can't type a message, so the question is copied to the clipboard first); `tel:<contact_phone>`. Each hidden when empty; one way shows as one button, more as a row that wraps. Set in Settings → Contact; `StoreUpdate` accepts a page's m.me / facebook.com link (`profile.php?id=` too) and any phone spelling. |
| **Web notifications** | WIRED | `notification_log` rows with `channel=web`, written in the checkout transaction; the dashboard polls. No push. |
| **Payments: COD, bank transfer** | WIRED, manual | No provider. Bank details from `payment_config` (current values, not a copy at order time) are shown on the order page while the payment is pending and the order isn't rejected or cancelled. |
| **Payments: KHQR** | WIRED, manual confirmation | `services/khqr.py` builds an individual KHQR (EMVCo TLV + CRC16) for the exact total, bill number `#<order number>`, 24 h expiry, made fresh on every order-page load; none for riel totals with cents. Tests pin it to strings from NBC's `bakong-khqr` 1.0.20 SDK. Drawn in the browser with `uqr`. |
| **Bakong Open API** (auto-confirm) | NOT BUILT | Post-MVP (02 §10.3). |
| **Cloudflare R2** (images) | WIRED, env-gated | `services/images.py`: boto3 S3 client against `https://<account>.r2.cloudflarestorage.com`, presigned `put_object` URLs (10 min) signed with exact `ContentType` + `ContentLength`. Keys: `stores/<store>/products/<product>/<hex>[-m].<ext>`, thumbnail `<hex>-s.jpg`, logo `stores/<store>/logo/<hex>.<ext>`. Public URL = `R2_PUBLIC_URL/<key>`, stored **absolute** in `product.image_urls` / `store.logo_url`. The browser PUTs directly. Removing a photo only unlinks it; the object stays. |
| **R2 backup bucket** | PARTIAL | `.github/workflows/backup.yml` (02:00 Phnom Penh, `pg_dump` 17, custom format, `--no-owner`, grants kept) uploads with the AWS CLI. It skips until its secrets exist (`docs/BACKUPS.md`). |
| **Sentry** | WIRED, env-gated | Backend `sentry_sdk.init` (errors only); frontend `@sentry/react`. |
| **Maps** | WIRED (frontend only) | Leaflet + OpenStreetMap tiles in `MapPicker.tsx` (no key). The seller opens the pin in Google Maps by URL. |
| Courier APIs, SMS, email | NOT BUILT | No email or SMS at all: phone numbers are proved through the Telegram bot instead (phone check). A forgotten password is reset by the founder (`python -m app.admin reset-password`). |

---

## 10. Conventions

### Naming

- Python: modules per domain, `snake_case`. Services are imported as
  aliases (`from app.services import order as order_service`). Schemas:
  `XxxCreate` / `XxxUpdate` / `XxxIn` for input, `XxxOut` for output, and a
  `Shop` prefix for what customers may see (`ShopOrderOut` vs `OrderOut`).
  Status enums use one-letter aliases in state-machine modules (`S`, `P`,
  `D`).
- Error codes: `SCREAMING_SNAKE`, specific (`ORDER_NOT_PAID`), with a
  human English message and the offending `field`.
- Frontend: components in `PascalCase.tsx`, hooks `useXxx`, helpers in
  `lib/*.ts`. Types in `lib/types.ts` mirror backend field names
  (snake_case, money as `string`).
- Comments explain *why* and cite the doc section (`02 section 7.4`,
  "decided 2026-10-03"). Docstrings are short and plain.

### Adding a seller endpoint

1. Schema in `backend/app/schemas/<domain>.py`.
2. Service function in `backend/app/services/<domain>.py`: `async def
   do_thing(db, store_id, ...)`, filtering every query by `store_id`,
   committing itself, raising `AppError`/`NotFound`.
3. Route in `backend/app/api/<domain>.py` with `seller: Seller, db:
   TenantDb`, passing `seller.store_id`. A new router file must be
   included in `app/main.py`.
4. Add a cross-store test (another seller gets a 404) next to the
   behaviour test.
5. Frontend: type in `src/lib/types.ts`; hook in `src/dashboard/queries.ts`
   with a key added to `keys`; any new error message gets Khmer in
   `src/i18n/messages/apiErrors.ts`.

Public storefront endpoints go in `app/api/shop.py` with `shop: Shop, db:
ShopDb`. The router-level 300/min limit covers them; add `check_limit` for
anything that writes.

### Adding a model

1. Class in `backend/app/models/<domain>.py`: `class Thing(UUIDPrimaryKeyMixin,
   TenantMixin, CreatedAtMixin, Base)`. Enums via `str_enum(MyEnum,
   "column")`, money via `Money`. Composite indexes lead with `store_id`.
   Child tables of a tenant table copy `store_id` too.
2. Export it from `app/models/__init__.py` (Alembic only sees imported
   models).
3. `alembic revision --autogenerate -m "..."`, then add the RLS lines by
   hand (copy from `ccd7d9bce820`):

   ```python
   op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON thing TO app_user")
   op.execute("ALTER TABLE thing ENABLE ROW LEVEL SECURITY")
   op.execute(
       "CREATE POLICY tenant_isolation ON thing "
       f"USING (store_id = {CURRENT_TENANT}) WITH CHECK (store_id = {CURRENT_TENANT})"
   )
   ```

   with `CURRENT_TENANT = "NULLIF(current_setting('app.tenant_id', true), '')::uuid"`,
   and the matching `DROP POLICY` / `REVOKE ALL` in `downgrade()`.
4. Add an RLS test in `tests/test_tenant_isolation.py`.
5. A data model change that differs from 02 §5 needs the founder's approval
   first (CLAUDE.md).

### Adding a page

1. Component under `frontend/src/dashboard/<area>/` or `frontend/src/shop/`.
2. Route in `src/router.tsx`, under the `/dashboard` or `/shop/:storeSlug`
   children.
3. Texts in `src/i18n/messages/<area>.ts` as `{ en, km }` pairs; `const t =
   useT()`.
4. Data through hooks in `queries.ts`. Show `Skeleton` while pending and
   `ErrorState` with retry on error; `EmptyState` when empty.
5. `<title>{...}</title>` inside the component (React 19 hoists it).
6. Use `cardClass` / `buttonClass` / ui.tsx parts; light-mode classes plus
   the fixed tokens.

### Test patterns

Tests run against a real Postgres (`<db>_test`). There is no mocking of the
DB. Fixtures in `conftest.py`: `client` (httpx2 ASGI client), `register`
(through the API with a phone check already finished, `helpers.verified_phone_check`;
returns the tokens and `phone`, the login), `auth_headers` (fresh seller,
Bearer headers), `make_store` / `two_stores` (direct DB; email login, no
phone). `helpers.random_phone()` gives each account its own number. `helpers.py` has direct-DB factories and API shortcuts. CLAUDE.md
asks for tests on state machines, money math and tenant isolation, not
exhaustive endpoint tests.

State machine (every pair, expected table copied on purpose):

```python
@pytest.mark.parametrize(("current", "target"), list(product(S, S)))
def test_every_transition_follows_the_state_machine(current, target):
    if target in EXPECTED[current]:
        check_transition(current, target)
    else:
        with pytest.raises(AppError) as error:
            check_transition(current, target)
        assert (error.value.status_code, error.value.code) == (409, "INVALID_STATUS_TRANSITION")
```

Money (exact decimals, pure function):

```python
def test_delivery_fee_is_added_exactly():
    assert _totals(["0.30", "25.00"], items=2) == Totals(D("25.30"), D("0"), D("1.50"), D("26.80"))
```

Tenant isolation through the API:

```python
async def test_seller_cannot_touch_another_sellers_category(client, auth_headers):
    a, b = await auth_headers(), await auth_headers()
    category = (await client.post("/api/v1/seller/categories", headers=a, json={"name": "Shoes"})).json()
    edit = await client.patch(f"/api/v1/seller/categories/{category['id']}", headers=b, json={"name": "Mine now"})
    assert edit.status_code == 404
```

Tenant isolation by RLS alone (no service filters):

```python
async def test_store_only_sees_its_own_rows(two_stores):
    a, b = two_stores
    await _add_product(a.store_id); await _add_product(b.store_id)
    async with tenant_session(a.store_id) as db:
        products = (await db.scalars(select(Product.store_id))).all()
    assert set(products) == {a.store_id}
```

---

## 11. Deviations, known bugs, TODOs, tech debt

### Where the code differs from 02_TECHNICAL.md

- **§4.2 composite indexes leading with `store_id`:** true for most tables.
  `payment` and `delivery` have only `ix_*_store_id` plus their unique
  `order_id`, which is how they are read.
- **§11 upload flow** says "frontend confirms completion → backend stores
  URL". There is no confirm endpoint: the frontend PATCHes the product's
  `image_urls` (or the store's `logo_url`) and the backend only checks the
  URL prefix. It doesn't check the object exists in R2.
- **§6.2 orders "filter by status, date range":** the API supports both;
  the dashboard only uses status.
- **§5.2 `customer.telegram_user_id`:** the column exists and nothing ever
  writes it.
- **§13 rate limiting** names login and storefront; the code also limits
  register (5/min) and refresh (30/min). Logout is unlimited.
- **Brand:** 01 §1.1 names the product Oak Order (renamed from Sroul Order
  2026-10-08). The start page (`pages/Home.tsx`, "Oak Order" in big
  letters), `BrandMark` in `pages/AuthLayout.tsx` (the oak leaf,
  `components/OakLeaf.tsx`, on navy; it replaced lucide's `TreeDeciduous`
  2026-10-10), `public/favicon.svg` (the same leaf), and
  `index.html` (title, `apple-mobile-web-app-title`, so also the generic
  preview card) say Oak Order. Still "Social Commerce": the FastAPI title,
  Render and dev container names.

Everything else checked (state machine tables, completion rule, RLS role
and policy, endpoint list, JSONB shapes, link and tracking flows) matches
02 as of this commit.

### Known issues and limits (from 04_STATUS.md)

- No idempotency key on placing an order: a retry after a dropped
  connection can make a duplicate order.
- Checkouts in one store run one at a time (store row lock). Fine at MVP
  volume.
- A COD order can complete with its payment marked failed (02 §7.4 read
  literally). Payments can't be undone once paid or failed.
- When the R2 public domain changes (planned `images.oaksolve.com`, domain bought 2026-10-09), existing
  absolute URLs in `product.image_urls` / `store.logo_url` must be
  rewritten in the DB (`python -m app.admin move-photos <old> <new>`,
  docs/ADMIN.md). Otherwise saving a product with old photos fails the
  prefix check (`INVALID_IMAGE`).
- `*.r2.dev` is blocked on some networks, so photos look broken there
  (images fall back to placeholders).
- A Telegram bot token is in git history and must be revoked before launch.
- Anyone can register a store (03 says onboarding is manual for now).
- The Telegram bot speaks Khmer only (a seller who uses the app in English
  still gets Khmer alerts). The Khmer, in the app and the bot, hasn't been
  reviewed by the founder.
- Render free sleeps after 15 min, so the first request can take up to a
  minute (the UI says so after 4 s). A cron-job.org job (founder's
  account) calls `/health` every 10 minutes from 7:00 to midnight
  Phnom Penh time, so this only happens after midnight. `/health`
  doesn't touch the database, so Neon still sleeps.

### Found while writing this document (from reading the code; not reproduced)

- **Telegram non-JSON reply.** `telegram.call()` runs `response.json()`
  with no handling. If Telegram (or anything between) answers with non-JSON
  (e.g. an HTML 502):
  - At startup, `register_webhook` only catches `TelegramError` and
    `httpx.HTTPError`, so the `JSONDecodeError` would escape the lifespan
    and stop the API from starting.
  - In `notify_new_order` the background task would fail with no log row.
    The order itself is unaffected.
- **Any failed refresh logs the seller out.** In `frontend/src/lib/api.ts`,
  `api()` treats any failed refresh (`refreshTokens()` → `false`) as
  session over: it clears `sc.session`. A 429 or 5xx from
  `/auth/refresh` (not only a 401) therefore logs the seller out.
- **Slug length mismatch.** `store.slug`, `product.slug` and
  `category.slug` are `String(64)`, but validation caps slugs at 50
  (`MAX_SLUG_LENGTH`). Harmless.

### TODO / FIXME in the code

None (grep for TODO, FIXME, XXX and HACK over `backend/`,
`frontend/src`, `middleware.ts` and workflows).

### Tech debt

- Pricing math exists twice (`backend/app/services/pricing.py` and
  `frontend/src/lib/pricing.ts`); change them together, checkout rejects
  mismatched totals. A new shop's low-stock level `5` is in
  `notifications.DEFAULT_LOW_STOCK` and `ProductList.tsx`; the customers'
  "Only N left" is a fixed `5` in `shop/components.tsx` (`LOW_STOCK`).
- `frontend/src/lib/types.ts` is hand-written; there is no OpenAPI codegen.
- No paging on `GET /seller/products`, `GET /shop/{slug}/products` or
  categories. Links are capped at 200, a customer's history and a link's
  orders at 100.
- The rate limiter is in memory, per process (one instance today).
- R2 objects are never deleted (removed photos, replaced logos).
- `notification_log` keeps every row, and links can't be deleted.
- No admin screen: the founder's few tasks are commands in `app/admin.py` (docs/ADMIN.md).
- The customer's phone travels in the tracking URL query string, so it
  appears in access logs.
- Migrations run at container start; they should move to Render's
  `preDeployCommand` on a paid plan.
- The seller dashboard isn't code-split (measured at ~8 KB saving for
  customers, skipped).
- `DELETE /seller/store/telegram` has its logic in the router instead of
  a service, unlike the rest of the code.
- There is no seed script for demo or first-seller data (`backend/loadtest/seed_perf.py` is a local, made-up data set for performance measurements only).

---

## 12. Key files

The 25 files to read first to understand or change the system. If the
claude.ai Project allows file uploads, these are the ones to add next to
this document.

| # | File | Why |
|---|---|---|
| 1 | `backend/app/main.py` | App assembly: Sentry, lifespan, CORS, router mounting |
| 2 | `backend/app/core/config.py` | Every backend setting and env var; the asyncpg URL conversion |
| 3 | `backend/app/core/errors.py` | `AppError` / `NotFound` and the error envelope |
| 4 | `backend/app/core/security.py` | bcrypt, JWT claims (`store_id` in the access token) |
| 4b | `backend/app/services/auth.py`, `social.py`, `phone_check.py` | Sign-up with a phone checked in Telegram, phone / email / Google logins |
| 5 | `backend/app/db/base.py` | `Base`, naming convention, `TenantMixin` |
| 6 | `backend/app/db/session.py` | `tenant_session` and the `SET LOCAL ROLE` / `app.tenant_id` hook |
| 7 | `backend/app/api/deps.py` | `Seller`, `TenantDb`, `UnscopedDb`, `Shop`, `ShopDb` |
| 8 | `backend/alembic/versions/ccd7d9bce820_row_level_security_for_tenant_tables.py` | The `app_user` role and the RLS policy every tenant table copies |
| 9 | `backend/app/models/account.py` | `Seller`, `SellerLogin`, `Store` (tenant root, JSONB settings), `RefreshToken`, `PhoneCheck`, `str_enum` |
| 10 | `backend/app/models/order.py` | `Customer`, `Order`, `OrderItem`, `OrderStatus` |
| 11 | `backend/app/schemas/order.py` | Checkout input, customer vs seller order views |
| 12 | `backend/app/services/order.py` | Order state machine, completion rule, seller order queries |
| 13 | `backend/app/services/payment.py` | Payment state machine, payment settings, what customers see to pay |
| 14 | `backend/app/services/delivery.py` | Delivery state machine per method, delivery/discount settings |
| 15 | `backend/app/services/checkout.py` | Guest checkout: stock, snapshots, totals check, customer, notifications, link events |
| 16 | `backend/app/services/pricing.py` | The money math (mirrored in the frontend) |
| 17 | `backend/app/api/shop.py` | All public endpoints and their rate limits |
| 18 | `backend/tests/conftest.py` | Test DB setup and fixtures (with `tests/helpers.py`) |
| 19 | `frontend/src/router.tsx` | Every route |
| 20 | `frontend/src/lib/api.ts` | Fetch client, `ApiError`, token storage and refresh |
| 21 | `frontend/src/lib/types.ts` | TypeScript mirror of the API responses |
| 22 | `frontend/src/auth/AuthContext.tsx` | Session restore, login, register, logout |
| 23 | `frontend/src/dashboard/queries.ts` | Seller query hooks and the query-key map |
| 24 | `frontend/src/shop/queries.ts` | Storefront hooks, order tracking, `useMyOrders` |
| 25 | `frontend/src/lib/pricing.ts` | Frontend copy of the pricing rules (in cents) |

Next in line: `frontend/src/components/ui.tsx` (UI kit),
`frontend/src/index.css` (theme tokens, dark mode),
`frontend/src/i18n/core.ts` (translations), `backend/app/services/notifications.py`
and `telegram.py` (alerts), `backend/app/schemas/store.py` / `payment.py` /
`delivery.py` (settings shapes).
