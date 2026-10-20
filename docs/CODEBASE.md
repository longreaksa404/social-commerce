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
Order" (01 §1.1): the start page, logo, tab title, favicon, the API's
title and the backup files say so; the repo, the dev container and the
Render service (whose onrender.com address the keep-awake ping calls)
still say "social-commerce", on purpose.

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
| 5 | Delivery fee, free delivery, couriers, GPS pin, address note | DONE | `app/services/pricing.py`, `src/shop/MapPicker.tsx` (Leaflet, lazy-loaded), `MapPreview.tsx`, `lookUpAddress.ts` |
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
| Wrong or fake customer phones (founder's picks 2026-10-15) | DONE (bot flow tested through the local webhook, not yet in real Telegram) | Checkout reads the number back (`lib/phone.ts`); "Get updates on Telegram" on the order page (`POST /shop/{slug}/orders/{id}/telegram`, `services/customer_updates.py`, `customer.telegram_user_id` / `telegram_phone`); the seller's order shows "Phone confirmed in Telegram" or the other number; migration `c3f8a1d6e2b4`; `tests/test_customer_updates.py`. Seller tools against fake orders: 03 §6 log |
| Shop links (founder's pick 2026-10-15; a code, not changeable, 2026-10-18) | DONE | A new shop's link is a 6-character code (`services/slugs.py` `new_store_slug`, no 0/o/1/l/i), the same kind whatever the shop's name; nothing to type at sign-up and no changing it (Settings → Link only shows it). Links shops had before keep opening the shop (`store_old_slug`, `store_slug_taken`, the fallback in `storefront.get_store`, the move in `ShopLayout`); migration `e5a9c2f7b318`; `tests/test_store_links.py`. Custom domains: 03 §6 log |
| Plan and billing part 2, hand collection (founder, 2026-10-14; PayWay parked on the `payway` branch) | DONE | The shop's code (`plan.shop_code`) and Oak's KHQR / bank account on Settings → Plan (`OAK_*`), "I've paid" (`POST /seller/plan/paid`, a Telegram alert to the founder), the admin page (confirm / not found / mark paid), daily Telegram reminders on day 1 and day 5 (`POST /billing/run`); migration `b7e2c4a9d1f3`; `tests/test_billing.py`. App: `settings/PlanPage.tsx`, `dashboard/admin/`, `Reminder.tsx`, `lib/khqrImage.ts` |
| Plan and billing, part 1 (pricing decided 2026-10-14, 01 §33.1) | DONE | `store.paid_until`, `plan_payment`, `services/plan.py`, `GET /seller/plan`, checkout refuses new orders 7 days after the trial or paid time runs out, `python -m app.admin paid` / `plans`; migration `d450a35183c0`. Frontend: Settings → Plan (`settings/PlanPage.tsx`), the Plan row in the Settings menu, `PlanReminder` on the Orders tab and New order (`dashboard/Reminder.tsx`), the Terms' Fees (no price under Create shop since 2026-10-18). Part 2 (paying in the app through a gateway) waits for the founder's merchant account |
| Nightly DB backup to R2 | PARTIAL | `.github/workflows/backup.yml` exists but skips until its five secrets are set (04: not set yet) |
| UX pass (shop info, pinned Add to cart, logo, Settings menu, order summary, one row per option) | DONE | `POST /seller/store/logo`; `src/dashboard/settings/` |
| Oak in the shop (founder's picks 2026-10-10: 1A 2A 3B 4B 5B) | DONE (link cards not yet checked live) | The mark is the acorn, tilted, also Oak Solutions' logo (founder's picks 2026-10-15, replacing the stand-in hexagon leaf): alone where the name doesn't fit (`OakMark` in `components/OakMark.tsx`, `public/favicon.svg`, `apple-touch-icon.png`, the corner badge); the name "Oak Order" with the acorn's cap pressed onto the O everywhere else (`OakOrderName`; its O alone is `AcornO`, also on the start page's big name, UI check #20); "Made with Oak Order" with Privacy · Terms at the bottom of the shop's grid pages and the order page (`shop/MadeWithOak.tsx`); link cards titled "… · Oak Order" with our mark on the picture (`middleware.ts`, `GET /shop/{slug}/preview/*`, `services/preview.py`); the generic card `public/og/oak-order.png` |
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
│   ├── alembic/versions/      20 migrations, linear (chain in §5)
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
    ├── linkPreview.ts         Open Graph cards for preview bots on /shop/* (shared by the two hosts below)
    ├── functions/shop/[[path]].ts   Cloudflare Pages Function running linkPreview.ts (the host after the move)
    ├── middleware.ts          Vercel Routing Middleware running linkPreview.ts (until the move)
    ├── vercel.json            SPA rewrite + frame-ancestors 'none' / X-Frame-Options / nosniff (Vercel)
    ├── public/_headers        The same headers for Cloudflare Pages
    ├── .node-version          24, for Cloudflare Pages' build
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
        ├── shop/              Customer shop: ShopLayout, pages, queries.ts, cart.ts, device.ts, MapPicker, MapPreview, lookUpAddress, PaymentCard, ...
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
| `models/plan.py` | `PlanPayment` (what a shop paid, or says it paid, Oak Order), `PlanPeriod`, `PlanPaymentMethod` (`manual`), `PlanPaymentStatus` (pending = said "I've paid", paid, failed = not found) |
| `models/delivery.py` | `Delivery`, `DeliveryMethod`, `DeliveryStatus` |
| `models/link.py` | `ShareableLink`, `LinkEvent`, `LinkTarget`, `LinkEventType` |
| `models/notification.py` | `NotificationLog`, `NotificationChannel`, `NotificationStatus` |
| `services/auth.py` | `create_shop` (seller and store together, with a checked phone), register, login (`login_filter`), `log_in`, refresh rotation and reuse detection, logout, `restart_sessions` (after a password change) |
| `services/social.py` | "Continue with Google / Facebook / TikTok": sign in or start a sign-up (`sign_in`), finish it (`register`), connect an account in Settings (`connect`), list them (`logins`) |
| `services/account.py` | The logged-in seller's own details and password change, closing a shop (unscoped session, filtered by the token's seller id) |
| `services/staff.py` | The owner's staff: list, add, set a password, remove (unscoped session, filtered by the token's store id and role staff) |
| `services/store.py` | Get/update the store; validates the three settings blobs and logo and cover URLs |
| `services/category.py`, `product.py` | Catalog CRUD; variant merge; image URL prefix check |
| `services/images.py` | Presigned R2 PUT URLs (product photo, thumbnail, logo, cover) |
| `services/storefront.py` | Public reads: shop by slug, cards, product, category page, a product's first photo |
| `services/preview.py`, `oak_mark.py` | Link-preview pictures (Pillow): the shop's logo (256 px) or a product's photo (a 1200 × 630 card, the whole photo over a blurred copy) with our mark small in the corner, or the shop's cover (a 1200 × 630 card, the cover's middle with the logo round in the bottom left; 2026-10-15) (the badge: a navy tile with the white acorn in a white ring, drawn from `oak_mark_shape.png` / `oak_mark_outline.png`, masks of the SVG); fetched only from `R2_PUBLIC_URL`, drawn in a thread, the last 64 kept in memory |
| `services/checkout.py` | Guest checkout (`place_order`), tracking lookup (`track_order`), `shop_order_out` |
| `services/pricing.py` | Line totals, discount, delivery fee, order totals (mirrored in `frontend/src/lib/pricing.ts`) |
| `services/order.py` | Order state machine, completion rule, seller list/detail, the payment/delivery record wrappers |
| `services/payment.py` | Payment state machine, payment settings checks, what the customer is shown to pay with |
| `services/delivery.py` | Delivery state machine, delivery/discount settings checks, checkout delivery choice |
| `services/khqr.py` | Builds KHQR (EMVCo) strings with CRC16, no network |
| `services/customer_login.py` | Customers' "Continue with Telegram" (2026-10-20): `create` (a `phone_check` with a `login_` code and the cart), `get` / `set_cart` (only the shop's own check), `describe` (the customer token once shared: `security.create_customer_token`, JWT type `customer`, 180 days), `shop_customer` (this shop's name and address for the phone), `read_token` (→ `TelegramCustomer` or None), the bot's `opened` (asks for the phone, naming the shop) and `finished` ("✅ Done" taking the share button away, then "Open checkout", a `web_app` button to `/shop/{slug}/cart?tg=<check id>`; only "Done … go back to the shop" without an https `PUBLIC_APP_URL`); the mini app's `mini_app_from_check` (initData's user must be the check's) and `mini_app_known` |
| `services/order_reminders.py` | Customers' payment reminder (founder's pick 2026-10-20): `run` (hourly, `POST /reminders/run`; nothing 22:00-7:00 Phnom Penh, `quiet`), `due` (KHQR and bank orders 2 to 24 hours old, payment pending, not rejected / cancelled / completed, customer with a Telegram chat, no "I've paid" row, no reminder row, active seller; unscoped, filtered explicitly), `remind` (on the shop's tenant session: "⏳ waiting for your payment of $X; paid already? tap I've paid", a Pay button to the order page; a `notification_log` row `telegram` / `payment_reminder` / `order_id`, sent or failed, so once; a blocked bot clears the chat) |
| `services/billing.py` | Sellers paying Oak Order by hand: `claim` ("I've paid") and `notify_claim` (Telegram to the founder's own shop chat), `run_daily` / `remind` (payment reminders on day 1 and day 5, once each per paid-until date), the Khmer texts. Writes on its own unscoped session |
| `services/admin.py` | The founder's admin page: `is_admin` (`ADMIN_PHONES`), every shop's plan and code, a shop's payments, mark paid, confirm or reject an "I've paid" |
| `services/plan.py` | The shop's plan with Oak Order: prices, the stage from `store.paid_until` (`stage`, `orders_stopped`, `in_setup`), `open_shop` (starts the trial), the days a payment covers (`next_period`, `add_months`), `record_payment` (the founder's command), `get_plan`, `shop_code` (the code for paying Oak), `pay_to` (Oak's KHQR and bank account), `open_claim` |
| `services/export.py` | The orders export: a .xlsx with one row per order (XlsxWriter, write-only), headings and statuses in English or Khmer |
| `services/customer.py` | Customer list with search, detail with history, "spent" per currency |
| `services/notifications.py` | Web notification rows, Telegram alert text and sending, the low-stock rule; "Received, mark paid" under "says paid" (`payment_claimed_buttons`, `button_tapped`: `paid:<order id>`, only from the order's own shop chat) |
| `services/telegram.py` | `shop_button` / `set_shop_button` (a customer's own menu button beside the message box, "🛍 <shop>" opening `/shop/<slug>`, `setChatMenuButton` per chat; set when they log in or tap Get updates at a shop; https only; 2026-10-20), `read_mini_app_data` (a mini app's signed `initData` → the Telegram user, or None), `/minitest` (the founder's own shop chat only: a `web_app` button to `/tg-test?shop=<slug>`; temporary, 2026-10-20); Bot API over httpx, webhook registration (`ALLOWED_UPDATES`: messages and button taps), signed link codes, `/start` handling (a store's code, `phone_…`, or a customer's `o…`), the share button and shared contact, inline buttons (`url_button`, `tap_button`); a button tap goes to `notifications.button_tapped` |
| `services/customer_updates.py` | Customers' "Get updates on Telegram": signed `o` + 59-character start codes (store id, order id, 30 min), `opened` (a `phone_check` row with that code holds who opened it), `confirmed` (chat and number onto the shop's `customer` row), `news` (what a seller's tap tells the customer, in the order page's Khmer: never twice for the same thing, nothing for processing / completed / cash; sent with a driver, `sent_line`: "📦 your order is with the driver" (the driver's note stays the seller's), or "📦 sent with J&T Express" and the tracking number, 2026-10-20); `notify_placed` (the receipt after a customer's order when they get updates: items (5 shown), total and way to pay, "pay now" or "pay in cash on delivery", the status line; Pay (KHQR, bank) or View order), `notify` (BackgroundTask after the seller's status, payment, delivery and cash-handover endpoints; a blocked bot clears the chat); "Message on Telegram" (`send_from_seller`: the seller's words under the shop's name and order number, buttons "💬 Reply to <shop>" (the shop's own Telegram with "Order #1001: " typed, else its Messenger; with neither, the shop's phone in the message) and View order; waits for Telegram: 409 `NOT_ON_TELEGRAM` without a chat or once blocked (the chat is cleared), 502 `TELEGRAM_FAILED`); `is_customer_chat` (a customer typing to the bot gets `HELP_TEXT`: the bot can't pass replies on, tap the shop's button) |
| `services/phone_check.py` | Proving a phone number through the bot: `create`, `get`, `describe` (with `taken`), `use` (once, in the caller's commit); the bot's side `opened` / `shared` (returns the finished check, a seller's or a customer's; a seller's keeps the Telegram name) |
| `services/link.py` | Shareable links, stats, view recording (background), order events |
| `services/phone.py` | `normalize_phone` (Cambodian → `0XXXXXXXX`), search terms |
| `services/slugs.py` | `slugify` (random 6-hex for non-Latin names), `unique_slug` (products, categories); for shops `new_store_slug` (a 6-character code), `store_slug_taken` (current and old links, unscoped), `unique_store_slug` (only the founder's `test-shop` command, a name link) |

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
| Founder's commands | `python -m app.admin <command> <login>` (a phone number typed any way, or an older account's email; `auth.login_filter`), commands `reset-password`, `close-shop`, `reopen-shop`, `erase-shop` (backend), `test-shop [--name]` (a shop with an email login and no phone, for the load test: sign-up needs a phone checked in Telegram, one shop per number), `forget-customer <shop link name> <phone>` (a customer's name becomes "(removed)"; phone, addresses, map pins and notes go from that shop's customer, orders and alert payloads; the orders' items and money stay; the Data deletion page promises it), and `move-photos <old> <new>` (rewrites the R2 address saved in `product.image_urls`, `store.logo_url` and `store.cover_url`, for `images.oaksolve.com`); `erase-shop` only for a closed shop, after typing its link name: a plain `DELETE` of the seller cascades to the store and every tenant table, then `images.delete_store_files` empties `stores/<id>/` in R2; on the live DB with `DATABASE_URL='<Neon direct URL>'` in front (`docs/ADMIN.md`) |
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
Admin      = Annotated[CurrentSeller, Depends(current_admin)]   # a login in ADMIN_PHONES (read from the DB), else 403 ADMIN_ONLY
TenantDb   = Annotated[AsyncSession, Depends(get_tenant_db)]    # RLS-scoped to the seller's store
UnscopedDb = Annotated[AsyncSession, Depends(get_db)]           # NOT RLS-scoped (auth only)
Shop       = Annotated[Store, Depends(get_shop)]                # store from /shop/{store_slug}, via a short unscoped session
ShopDb     = Annotated[AsyncSession, Depends(get_shop_db)]      # RLS-scoped to that shop
```

Every seller route takes `seller: Seller, db: TenantDb`; Settings routes
take `seller: Owner` instead (store PATCH, logo, cover, Telegram link/disconnect,
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
  /auth/register` takes `store_name`, `password` and
  `phone_check` (and `full_name`, which the page no
  longer sends: the seller's name is then the one Telegram gave with the
  number, `phone_check.telegram_name`, else the shop name): the id of a phone check finished in Telegram
  (`services/phone_check.py`, §9). The number isn't typed. `phone_check.use`
  locks the check, refuses an expired one (422 `PHONE_CHECK_EXPIRED`) or an
  unfinished one (422 `PHONE_NOT_VERIFIED`), and deletes it in the same
  commit, so a check signs up once. A number that already has an account →
  409 `PHONE_TAKEN` (field `phone_check`; also on the unique index). It
  creates `Seller` (phone, no email) and `Store` together, with
  `store.telegram_chat_id` = the Telegram account that shared the number,
  so a new shop starts with order alerts on. The slug is a 6-character code
  (`slugs.new_store_slug`: skips current and old links); a `slug` in the
  request is ignored (2026-10-18). It returns a `TokenPair`; the route sets the
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
  finishes it with `store_name`, a `phone_check` and the provider's name as `full_name` (optional; else the Telegram name) like any
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
| Storefront (`/shop/{slug}/*`) | `Store` found by slug, or by an old slug (`store_old_slug`, a second query only on a miss), joined to `Seller.is_active`, on an unscoped session | `ShopDb` |
| Background task | the `store_id` the request already resolved | `tenant_session(store_id)` |
| Telegram `/start <code>` | store id inside the HMAC-signed, 30-minute code | `tenant_session(store_id)` |
| Auth | none (seller looked up by phone or email / token id; phone checks by id) | `UnscopedDb`, filters explicitly |

**Layer 1 (application).** Every service query filters
`Model.store_id == store_id` explicitly, even on a tenant session. Foreign
key checks bypass RLS, so ownership of referenced rows is checked in code:
`product._check_category` (a category id from another store gets 422) and
image, logo or cover URLs must start with
`{R2_PUBLIC_URL}/stores/{store_id}/products/{product_id}/`, `.../logo/` or `.../cover/`.

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
`ORDER_NOT_DELIVERED`, `ORDER_NOT_FOUND`, `ORDER_NOT_PAID`, `ORDERS_PAUSED`, `PLAN_UNPAID`, `SHOP_NOT_OPEN`, `PAYMENT_NOT_FOUND`, `PAYMENT_NOT_WAITING`, `ADMIN_ONLY`,
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
| `POST /seller/plan/paid` ("I've paid", each alerts the founder) | 10/min |
| `GET /shop/{slug}/preview/*` (on top) | 30/min |

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
| `phone_check` | **NO** (no `app_user` grant) | `code` (`phone_` + 22 random characters, in the `t.me` link), `telegram_user_id` (bigint, who opened the link), `phone` (normalized, once shared), `telegram_name` (a seller's check and a customer's login: the Telegram account's first and last name, sent with the number; the new seller's name; migration `5e89ca8ba3c8`), `verified_at`, `expires_at` (30 min), `cart` (JSONB, a customer's login only: `{"store_id", "lines"}` with each line as the shop's page keeps it; migration `3fe44025aa7b`), `created_at` | none | `uq_phone_check_code`; `ix_phone_check_telegram_user_id`. Expired rows are deleted when a new check starts |
| `seller` | **NO** (an owner owns the tenant, staff belong to one; no RLS, no `app_user` grant) | `phone` (the login, normalized, NULL only for older accounts whose number another account had), `email` (NULL for accounts since 2026-10-09; older ones log in with it; stored lowercased), `password_hash` (NULL for an account made with Google until it adds one), `full_name`, `is_active` (default true), `role` (`owner`/`staff`, default owner), `store_id` (staff only), `created_at` | `store_id → store` CASCADE (`use_alter`: store also points at seller) | `uq_seller_phone`; `uq_seller_email`; `ix_seller_store_id`; CHECK `(role = 'staff') = (store_id IS NOT NULL)` |
| `store` | tenant **root** (RLS on `id`; `app_user` SELECT, UPDATE only) | `name`, `slug` (String(64), **globally** unique), `description`, `logo_url`, `cover_url` (the shop's 3:1 cover photo, 2026-10-15), `color` (`ShopColor`: deep `navy`/`teal`/`forest`/`olive`/`coffee`/`wine`/`plum`/`charcoal` and light `pink`/`sky`/`mint`/`peach`/`lilac`/`sand`, default navy, CHECK `ck_store_shop_color`; the shop's colour for customers), `currency` (`USD`/`KHR`, default USD), `telegram_chat_id` (private), `telegram_username`, `contact_phone` (normalized like customers' phones), `messenger_username` (a Facebook page's username or number) (all three public), `payment_config` JSONB, `delivery_config` JSONB, `discount_config` JSONB (all default `{}`), `order_confirmation_mode` (`automatic`/`manual`, default manual), `orders_paused` (bool, default false), `orders_resume_on` (date NULL: the first day orders open again), `low_stock_alert` (int, default 5, 1–999 by the schema), `paid_until` (date NULL: the last day covered, by the 30-day free trial from the day the owner opens the shop, then by `plan_payment`s; null while the shop is in setup, set by `plan.open_shop`; migration `ffa0fb97ae00`), `created_at` | `seller_id → seller` CASCADE, **unique** (1:1) | `uq_store_seller_id`, `uq_store_slug` |
| `refresh_token` | **NO** (per seller; no RLS, no `app_user` grant) | `id` (= JWT `jti`), `expires_at`, `revoked_at`, `created_at` | `seller_id → seller` CASCADE | `ix_refresh_token_seller_id` |
| `store_old_slug` | yes (`app_user` SELECT, INSERT, DELETE) | `slug` String(64) **primary key** (globally unique, like `store.slug`; `slugs.store_slug_taken` checks both tables on an unscoped session, yes/no only), `created_at` | none besides `store_id` (CASCADE) | `store_id`. A link the shop had: `/shop/<it>` still opens the shop. Added by `store.change_slug` (gone), removed when the shop changed back to it, while Settings → Link could change it (2026-10-15 to 2026-10-18); kept for good |
| `category` | yes | `name`, `slug` String(64), `created_at` | none besides `store_id` | UNIQUE (`store_id`, `slug`) |
| `product` | yes | `name`, `slug`, `description`, `price` Numeric(12,2), `image_urls` JSONB list, `status` (`active`/`inactive`), `has_variants`, `stock_quantity` int NULL (only when no variants), `created_at`, `updated_at` | `category_id → category` ON DELETE SET NULL | UNIQUE (`store_id`, `slug`); (`store_id`, `status`); (`store_id`, `category_id`); CHECK `price >= 0`; CHECK stock NULL or ≥0 |
| `product_variant` | yes (store_id copied from product) | `name` (e.g. "Red / L"), `sku`, `price_override` NULL, `stock_quantity` int default 0, `created_at` | `product_id → product` CASCADE | (`store_id`, `product_id`); CHECK price_override NULL or ≥0; CHECK stock ≥0 |
| `customer` | yes | `name` (latest order's), `phone` (normalized), `address` (latest delivery address), `telegram_user_id` (the customer's chat for order updates, set by "Get updates on Telegram", cleared when they block the bot), `telegram_phone` (the number their Telegram shared, normalized; kept after a block), `created_at` | none | UNIQUE (`store_id`, `phone`) |
| `order` | yes | `number` int (from 1001 per store), `status`, `currency` (copied from store), `subtotal`, `discount`, `delivery_fee`, `total`, `delivery_method`, `delivery_address`, `delivery_lat`/`delivery_lng` Numeric(9,6), `delivery_address_note`, `source` (link's source, or `chat` for an order the seller added; links can't be named "chat"), `notes`, `created_at`, `updated_at` | `customer_id → customer` (no cascade) | UNIQUE (`store_id`, `number`); (`store_id`, `status`); (`store_id`, `created_at`); (`store_id`, `customer_id`); CHECK lat/lng both or neither; CHECK all four money columns ≥0 |
| `order_item` | yes (store_id copied from order) | `product_name_snapshot`, `variant_name_snapshot`, `unit_price_snapshot`, `quantity`, `line_total` (no timestamps) | `order_id → order` CASCADE; `product_id → product` (no cascade; products are never deleted); `variant_id → product_variant` ON DELETE SET NULL | (`store_id`, `order_id`); (`variant_id`); CHECK quantity >0; CHECK unit price ≥0 |
| `payment` | yes (store_id copied from order) | `method` (`cod`/`bank_transfer`/`khqr`), `status` (`pending`/`paid`/`failed`/`refunded`, default pending), `amount` (= order total), `reference` (seller's note), `paid_at`, `created_at` | `order_id → order` CASCADE, **unique** (1:1) | CHECK amount ≥0 |
| `delivery` | yes (store_id copied from order) | `method` (`seller_delivery`/`pickup`), `status` (default `not_assigned`), `courier` (the customer's pick at checkout, else null = the shop chooses; null for pickup), `assignee_note`, `created_at`, `updated_at` | `order_id → order` CASCADE, **unique** (1:1) | none beyond the unique |
| `shareable_link` | yes | `target_type` (`store`/`product`/`category`), `target_id` UUID NULL (**no FK**), `token` (8 chars `[a-z0-9]`, **globally** unique), `source`, `campaign`, `created_at` | none | (`store_id`, `created_at`); CHECK `(target_type = 'store') = (target_id IS NULL)` |
| `link_event` | yes (store_id copied from link) | `event_type` (`view`/`order`), `created_at` | `link_id → shareable_link` CASCADE; `order_id → order` CASCADE NULL | (`store_id`, `link_id`); UNIQUE index on `order_id` (an order counts for one link); CHECK `(event_type = 'order') = (order_id IS NOT NULL)` |
| `notification_log` | yes | `channel` (`web`/`telegram`), `event_type` text (`new_order`/`low_stock`), `payload` JSONB, `status` (`sent`/`failed`), `sent_at` (acts as created_at), `read_at` (web only; null = unread) | none | (`store_id`, `channel`, `sent_at`) |
| `plan_payment` | yes, but `app_user` has **SELECT only** (sellers read; billing and the founder's tools write on their own session) | `period` (`month`/`year`), `amount` Numeric(12,2) USD, `method` (`manual`), `status` (`pending` = the seller said "I've paid" / `paid` / `failed` = the founder didn't find it; default paid), `failure` (the founder's note to the seller), `reference` (the founder's own note), `paid_on`, `covers_from`, `covers_until` (dates, both included; set when paid), `created_at` | none besides `store_id` | CHECK amount ≥0; CHECK covers_from ≤ covers_until; CHECK paid ⇔ the three dates set; (`store_id`, `created_at`) |

**JSONB settings on `store`.** The shapes are Pydantic models, and `{}` or
missing parts read as the defaults:

- `payment_config` ↔ `PaymentSettings` (`schemas/payment.py`): `cod
  {enabled=true}`, `bank_transfer {enabled=false, bank_name, account_name,
  account_number}`, `khqr {enabled=false, bakong_account_id,
  merchant_name, account_information, acquiring_bank}` (the last two: ABA-style banks, put in tag 29 by `khqr.individual_khqr`; read from the seller's own QR picture by `frontend/src/lib/readKhqr.ts`, "Upload your bank's QR" in Settings → Payments, 2026-10-14). A method can't be on without its details, and at least
  one must be on.
- New shops (`auth.create_shop`) start with `delivery_config = {"fee":
  "2.00"}` (`delivery.NEW_SHOP_FEE`: $2, 8,000 riel; founder,
  2026-10-18). Switching currency before Delivery is saved swaps it for
  the other currency's (`delivery.follow_currency` from
  `store.update_store`). Tests' `register` fixture resets it to `{}`
  (free) unless `new_shop_fee=True`.
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

**The plan** (01 §33.1, 2026-10-14; `services/plan.py`): the stage comes
from `store.paid_until` and `clock.today()` the same way, with no job:
`setup` (no `paid_until`: a new shop until the owner opens it, no time
limit, 2026-10-16; `plan.in_setup(store)`), `active`, `ending_soon` (its last 6 days), `overdue` (1–7 days after),
`stopped` (from the 8th day; `plan.orders_stopped(store)`). A stopped shop
is shown as paused to customers (`ShopStoreOut.orders_paused` true,
`orders_resume_on` null) and its checkout answers 409 `ORDERS_PAUSED`, the
same as paused: customers never hear about the plan. An order from a chat
gets 409 `PLAN_UNPAID` instead (paused shops still take those). A shop in
setup is shown the same way plus `ShopStoreOut.opening_soon` ("Opening
soon"), checkout answers `ORDERS_PAUSED` and an order from a chat 409
`SHOP_NOT_OPEN`. `POST /seller/plan/open` (owner) sets `paid_until` to
`account.trial_end()` (day 30 from today); again once open, nothing. Everything
else, orders already placed included, carries on. The seller's own
`StoreOut.orders_paused` is only their switch. A payment, once paid
(`plan.mark_paid`), covers a month or a year from the day after
`paid_until`, or from the day it's paid once the shop has stopped or
while it's still in setup (which opens it, no trial) (`next_period`); `add_months` rolls a missing day (31 Jan + 1 month) to the
1st after.

**Paying Oak Order by hand** (01 §33.1, founder 2026-10-14, until Oak
Solutions qualifies for ABA PayWay; its checkout and auto-charge are on
the `payway` branch, not merged, its migration `747c15ec63b4` never run on
production). Settings → Plan shows the shop's code (`plan.shop_code`:
"OAK-" + 6 letters from the store id's first 30 bits, no column, no 0/O
or 1/I), Oak's KHQR for a month and a year with the code as the bill
number and in its name (`plan.khqr_name`, "OAK ORDER OAK-SBZ9WZ": ABA shows the receiver the name as "Outlet" but not the bill number, tested 2026-10-14) (`OAK_KHQR_ACCOUNT`, `OAK_KHQR_NAME`, and for ABA, whose customers share the bank's Bakong ID `abaakhppxxx@abaa`, `OAK_KHQR_ACCOUNT_INFO` (the account number) and `OAK_KHQR_BANK` ("ABA Bank"), tag 29's subtags 01 and 02; made fresh on each read, a
day's validity) and/or Oak's bank account (`OAK_BANK_*`). "I've paid"
(`POST /seller/plan/paid`, owner, 10/min) saves a pending payment (one at
a time) and, after the response, sends a Telegram alert to the chat of
each shop whose owner is in `ADMIN_PHONES` (`billing.notify_claim`,
logged `plan_claimed` on that shop). The founder confirms it on the admin
page (`mark_paid` on that row, the amount found if different) or marks it
not found (failed, with a note the seller sees; they can say it again).
`POST /billing/run` (cron-job.org once a day, `X-Cron-Secret` =
`BILLING_CRON_SECRET`, else 404; the work runs after the 202) sends each
open shop with Telegram and no waiting "I've paid" a Khmer reminder on day
1 to 4 after its paid time ends (once, "start") and day 5 to 7 (once,
"day5"), deduplicated by `notification_log` rows (`plan_reminder`,
payload `paid_until` + `kind`); a missed run is made up the next day.
Shops without Telegram get the Orders tab's banner (`PlanReminder`),
shown to every owner anyway.
`POST /reminders/run` (cron-job.org every hour, the same secret) sends
customers their KHQR or bank order's payment reminder
(`services/order_reminders.py`).

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
`39a133fd8c02` seller_login.name, facebook and tiktok → `d450a35183c0`
store.paid_until (existing shops: 30 days from that day) + plan_payment
(RLS, `app_user` SELECT only) → `b7e2c4a9d1f3` plan_payment status
(the seller's "I've paid"), failure, dates set when paid → `c3f8a1d6e2b4`
customer.telegram_phone → `e5a9c2f7b318` store_old_slug (RLS) →
`a7d3e9b2c4f1` store.color + cover_url → `b8e4f0c3d5a2` light shop colours
→ `ffa0fb97ae00` store.paid_until nullable (a shop in setup) →
`5e89ca8ba3c8` phone_check.telegram_name → `3fe44025aa7b` phone_check.cart (**head**). (On
the `payway` branch the head is `747c15ec63b4` instead.)

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
- Who takes it (founder, 2026-10-18): `DeliveryUpdate.courier`, only when
  sending (`assigned`; else 422, field `courier`), sets `delivery.courier`
  to one of the shop's couriers (or the order's own, if dropped from the
  list since) or null = the shop's own driver (`delivery.send_with`).
  Left out of the body = unchanged, so the customer's pick stays.
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
| POST | `/auth/register` | none | `RegisterIn` (`full_name`? (else the check's Telegram name, else the shop name), `store_name`, `password`, `phone_check`) | `AccessOut` + cookie (201) | Creates seller + store with the checked phone; 422 `PHONE_NOT_VERIFIED` / `PHONE_CHECK_EXPIRED`, 409 `PHONE_TAKEN` / `SLUG_TAKEN`; 5/min |
| POST | `/auth/login` | none | `LoginIn` (`login`: phone or older account's email; `email` accepted) | `AccessOut` + cookie | 10/min |
| POST | `/auth/refresh` | refresh cookie | none | `AccessOut` + cookie | Rotates; a retry within 60 s gets a new pair, later reuse ends all sessions; 30/min |
| POST | `/auth/logout` | refresh cookie | none | 204 | Deletes that token's session and the cookie; bad tokens ignored |
| POST | `/auth/password-reset` | none | `PasswordResetIn` (`login`) | 202 | Telegram link in the background (§4 Auth); same answer for any login; 5/min |
| POST | `/auth/password-reset/confirm` | none | `PasswordResetConfirm` | `AccessOut` + cookie | Bad, expired or used link → 400 `RESET_LINK_INVALID`; 10/min |
| POST | `/auth/google` | none | `GoogleIn` (`credential`: Google's ID token) | `SocialOut` | Logged in (`access_token` + cookie) or `signup` for someone new; 401 `SOCIAL_SIGN_IN_FAILED`, 503 `SOCIAL_NOT_CONFIGURED`; 10/min |
| POST | `/auth/oauth/{provider}` | none | `OAuthIn` (`code`, `redirect_uri`); provider `facebook` or `tiktok` | `SocialOut` | Logged in or `signup`; 422 `INVALID_REDIRECT`, 401 `SOCIAL_SIGN_IN_FAILED`, 503 `SOCIAL_NOT_CONFIGURED`; 10/min |
| POST | `/auth/social/register` | none | `SocialRegisterIn` (`signup_token`, `full_name`?, `store_name`, `phone_check`) | `AccessOut` + cookie (201) | No password; 400 `SIGNUP_EXPIRED`, 409 `SOCIAL_TAKEN` / `PHONE_TAKEN` / `SLUG_TAKEN`; 5/min |
| POST | `/auth/phone-checks` | none | none | `PhoneCheckOut` (201) | `{id, telegram_url, expires_at, phone: null, taken: false}`; 503 `TELEGRAM_NOT_CONFIGURED` without the bot; 10/min |
| GET | `/auth/phone-checks/{id}` | the check's id | — | `PhoneCheckOut` | `phone` once shared in Telegram; `taken` when an account already has it; expired or unknown → 404 `PHONE_CHECK_EXPIRED`; 60/min (the page reads it every few seconds) |
| GET | `/seller/account` | seller | — | `AccountOut` | The person's own phone (login), email (older accounts, else null), name, role, `has_password`, `logins` (`[{provider, label}]`, label = the email or the name) (`UnscopedDb`, filtered by the token's seller id); `is_admin` (the login is in `ADMIN_PHONES`: the app shows the admin page) |
| PATCH | `/seller/account` | seller | `AccountUpdate` | `AccountOut` | `full_name` only |
| POST | `/seller/account/phone` | seller | `PhoneChange` (`phone_check`) | `AccountOut` | New login number from a finished phone check; another account's → 409 `PHONE_TAKEN` |
| POST | `/seller/account/google` | seller | `GoogleIn` (`credential`) | `AccountOut` | Log in with this Google account too (replaces one connected before); another shop's → 409 `SOCIAL_TAKEN` |
| POST | `/seller/account/oauth/{provider}` | seller | `OAuthIn` | `AccountOut` | Log in with this Facebook / TikTok account too (the code from `/auth/<provider>/callback`); another shop's → 409 `SOCIAL_TAKEN` |
| POST | `/seller/account/close-shop` | seller | `CloseShopIn` (`password`, not needed without one) | 204 | `seller.is_active = false` and every session deleted: the shop page is 404, login 403 `ACCOUNT_DISABLED` ("This shop is closed. Message Oak Order to open it again."). Nothing is erased; wrong password → 422 `WRONG_PASSWORD` |
| POST | `/seller/account/password` | seller | `PasswordChange` | `AccessOut` + cookie | Wrong current password → 422 `WRONG_PASSWORD`; ends every other session (§4 Auth) |
| GET | `/seller/store` | seller | — | `StoreOut` | Includes the three settings, `payment_set_up` (false until `payment_config` was saved once; the setup checklist), `delivery_set_up` (false until Settings → Delivery was saved once, which stores every part: a new shop runs on own delivery at the new-shop fee, `delivery_config = {"fee": ...}` only; a shop from before 2026-10-18 on free own delivery, `{}`), `telegram_connected`, `telegram_bot_available` |
| PATCH | `/seller/store` | seller | `StoreUpdate` | `StoreOut` | Partial; settings blobs saved whole; null on name/currency/mode = leave; no `slug` (ignored: the link can't change, 2026-10-18); `logo_url` / `cover_url` only from this store's logo / cover folder (null removes); `color` one of the eight (null = leave) |
| POST | `/seller/store/logo` | seller | `ImageUploadIn` | `ImageUploadOut` | Presigned PUT into `stores/<id>/logo/` |
| POST | `/seller/store/cover` | seller | `ImageUploadIn` | `ImageUploadOut` | Presigned PUT into `stores/<id>/cover/` (owner; 2026-10-15) |
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
| GET | `/seller/plan` | seller (staff too) | — | `PlanOut` | The shop's plan with Oak Order (01 §33.1): `stage` (`setup`/`active`/`ending_soon`/`overdue`/`stopped`), `on_trial` (no payment yet), `paid_until`, `pay_by` (paid_until + 7: the last day before new orders stop), `days_left` (today included, 0 once run out) (these three null in setup), `trial_until` (in setup: the trial's last day if opened today), `prices` (`month` "9.99", `year` "99.00", USD), `code` (the shop's code), `pay_to` (`khqr_month`, `khqr_year`, `khqr_name`, `bank`; all empty without `OAK_*`), `claim` (an "I've paid" waiting for the founder), `payments` newest first: paid ones and ones not found |
| POST | `/seller/plan/open` | owner | — | `PlanOut` | Open the shop: the 30-day free trial starts today and it takes orders (the dashboard asks first). Again once open: nothing changes |
| POST | `/seller/plan/paid` | owner | `PaidClaimIn` (`period`) | `PlanOut` | "I've paid": a pending payment and a Telegram alert to the founder (after the response); while one waits, nothing new. 10/min |
| GET | `/admin/shops` | **admin** (`ADMIN_PHONES`) | — | `list[AdminShopOut]` | Every shop, the soonest to run out first: code, login, open or closed, Telegram or not, stage, trial or paying, paid until, pay by, last paid, a waiting "I've paid". Others 403 `ADMIN_ONLY` |
| GET | `/admin/shops/{store_id}` | admin | — | `AdminShopDetailOut` | The same, with every payment (with the founder's notes) |
| POST | `/admin/shops/{store_id}/payments` | admin | `AdminPaymentIn` (`period`, `amount` or the price, `note`) | `AdminShopDetailOut` | Mark paid by hand; `amount` 0 gives free time |
| POST | `/admin/shops/{store_id}/payments/{payment_id}/confirm` | admin | `AdminConfirmIn` (`amount` if different, `note`) | `AdminShopDetailOut` | The seller's "I've paid", found: paid, the next month or year covered. Another shop's payment → 404; checked already → 409 `PAYMENT_NOT_WAITING` |
| POST | `/admin/shops/{store_id}/payments/{payment_id}/reject` | admin | `AdminRejectIn` (`note`) | `AdminShopDetailOut` | Not found: failed, the seller sees the note |
| GET | `/seller/orders` | seller | `?status=` (repeatable) `&created_from=&created_to=&limit=1..100(50)&offset=` | `OrderListOut` | By number desc; `counts` per status ignore the status filter; each row leads with its biggest line (`first_item_name`, `line_count`, `first_item_image_url`: that product's photo now), also on a customer's and a link's orders; `payment_claimed_at`: when the customer last tapped "I've paid" while the payment is pending (one query for the page, `notifications.last_payment_claims`), so the row says "Says paid" |
| GET | `/seller/orders/export` | seller | `?first=&last=` (dates, Phnom Penh days, both included) `&lang=en\|km` | `.xlsx` file | One row per order, oldest first: number, date, customer, phone (as text), items, the four amounts (number format per currency), payment, delivery, statuses, address, source, note; frozen, filterable heading row. Over a year or ending before it starts → 422 `INVALID_DATE_RANGE`. Declared before `/{order_id}` |
| GET | `/seller/orders/{order_id}` | seller | — | `OrderOut` | With `next_statuses` on order, payment, delivery; each item carries its product's current first photo (`image_url`, as on the shop's order page; also on the three PATCHes below) |
| PATCH | `/seller/orders/{order_id}/status` | seller | `OrderStatusUpdate` | `OrderOut` | §6. This and the next three tell a customer with Telegram updates after the response (`customer_updates.notify`) |
| PATCH | `/seller/orders/{order_id}/payment` | seller | `PaymentUpdate` | `OrderOut` | §6 |
| PATCH | `/seller/orders/{order_id}/delivery` | seller | `DeliveryUpdate` | `OrderOut` | §6 |
| POST | `/seller/orders/{order_id}/cash-handover` | seller | — | `OrderOut` | Cash on delivery: delivery delivered + payment paid, both or neither (§6) |
| POST | `/seller/orders/{order_id}/telegram-message` | seller | `CustomerMessageIn` (`text`, 1-1000) | 204 | "Message on Telegram" (founder's pick 2026-10-20): Oak's bot sends it to the order's customer (`customer_updates.send_from_seller`); 409 `NOT_ON_TELEGRAM` when they don't get updates there (or blocked the bot), 502 `TELEGRAM_FAILED`, 503 `TELEGRAM_NOT_CONFIGURED`; 20/min |
| GET | `/seller/customers` | seller | `?q=(≤100)&limit=1..100(50)&offset=` | `CustomerListOut` | Last ordered first; `q` matches name (case-insensitive) or phone typed any way |
| GET | `/seller/customers/{customer_id}` | seller | — | `CustomerDetailOut` | Latest 100 orders |
| GET | `/seller/notifications` | seller | `?limit=1..50(20)&offset=` | `NotificationListOut` | Web rows, newest first (`new_order`, `low_stock`, `payment_claimed`); listing doesn't mark read |
| GET | `/seller/notifications/unread` | seller | — | `UnreadOut` | The bell; counts only what the Orders tab can't show (says paid, low stock, sold out): new orders stay in the list but aren't counted (UX check #20, 2026-10-17) |
| POST | `/seller/notifications/read` | seller | `MarkReadIn` (`up_to`) | `UnreadOut` | Marks read where `sent_at <= up_to` |
| GET | `/seller/links` | seller | — | `list[LinkOut]` | Newest 200, with view/order counts |
| POST | `/seller/links` | seller | `LinkCreate` | `LinkOut` (201) | Same target + source + campaign returns the existing link; hidden product → 409 `PRODUCT_HIDDEN` |
| GET | `/seller/links/{link_id}/stats` | seller | — | `LinkStatsOut` | + its orders (≤100) |
| GET | `/shop/{store_slug}` | public | — | `ShopStoreOut` | Categories with active products, `cover_url` and `color`, payment method names, delivery options, discounts, `telegram_username` / `messenger_username` / `contact_phone`, `orders_paused` / `orders_resume_on`, `opening_soon` (in setup: not opened by its owner yet) |
| GET | `/shop/{store_slug}/products` | public | — | `list[ShopProductCard]` | Active only; **no paging**; `has_variants` and `stock_quantity` (null with variants) let the grid's + add to the cart |
| GET | `/shop/{store_slug}/products/{product_slug}` | public | — | `ShopProductOut` | Variants with effective price and stock |
| GET | `/shop/{store_slug}/categories/{category_slug}` | public | — | `ShopCategoryPageOut` | |
| POST | `/shop/{store_slug}/orders` | public, or header `X-Customer-Token` | `OrderCreate` | `ShopOrderOut` (201) | Guest checkout; 409 `ORDERS_PAUSED` while paused; +10/min; the seller's Telegram alert and the customer's receipt (`customer_updates.notify_placed`, when they get updates) in background. With a good customer token whose phone is the order's, the shop's customer gets `telegram_user_id` / `telegram_phone` (updates on); a bad token is ignored (a guest order) |
| POST | `/shop/{store_slug}/telegram-login` | public | `TelegramLoginIn` (`lines`: the cart, up to 50) | `TelegramLoginOut` (201) | "Continue with Telegram" (2026-10-20): a `phone_check` with a `login_` code and `cart`; `telegram_url` opens Oak's bot; 503 without the bot; 30/min |
| GET | `/shop/{store_slug}/telegram-login/{id}` | the check's id | — | `TelegramLoginOut` | `customer` (`token`, `name`, `phone`, `address`: this shop's name and address for that phone, else the Telegram name) once the phone is shared; another shop's or expired → 404 `LOGIN_EXPIRED`; 60/min (read every 2.5 s) |
| POST | `/shop/{store_slug}/telegram-login/{id}/cart` | the check's id | JSON in `text/plain` (`navigator.sendBeacon`) | 204 | The cart as the page leaves for Telegram; 422 if it doesn't read |
| GET | `/shop/{store_slug}/me` | header `X-Customer-Token` | — | `ShopCustomerOut` | What this shop's checkout fills in for a logged-in customer; 401 `CUSTOMER_LOGIN_EXPIRED` for a bad token (the app logs them out) |
| POST | `/shop/{store_slug}/telegram-login/{id}/mini-app` | Telegram's signed `initData` | `MiniAppIn` | `MiniAppLoginOut` (`customer`, `lines`) | Inside Telegram, from the bot's "Open checkout": only for the account that shared the phone (else 404 `LOGIN_EXPIRED`); data Telegram didn't sign → 401 `TELEGRAM_DATA_INVALID`; 30/min |
| POST | `/shop/{store_slug}/mini-app-login` | Telegram's signed `initData` | `MiniAppIn` | `CustomerSessionOut` | Inside Telegram on a phone that forgot the login: this account's proved phone from this shop's customers, else any shop's (its own number, to itself); never shared → 404 `TELEGRAM_NOT_KNOWN`; 30/min |
| GET | `/shop/{store_slug}/orders/{order_id}` | public | `?phone=` (≤32) | `ShopOrderOut` | 404 unless phone matches (any spelling); includes how to pay while pending; each item carries its product's current first photo (`image_url`, not a snapshot); `telegram_updates` `unavailable` / `off` / `on` |
| POST | `/shop/{store_slug}/track-view` | public | `TrackViewIn` (`token`) | 204 | View written in background; unknown token ignored; +60/min |
| GET | `/shop/{store_slug}/preview/logo` | public | `?v=` (ignored; changes with the photo) | JPEG, or 302 | og:image for a shop link (`frontend/middleware.ts`, founder's pick 5B): the logo with our mark bottom right; no logo, or the photo can't be read: 302 to the app's `/og/oak-mark.png` (`PUBLIC_APP_URL`). `Cache-Control` one day; +30/min |
| GET | `/shop/{store_slug}/preview/cover` | public | `?v=` (changes with the cover and the logo) | JPEG 1200 × 630, or as `/preview/logo` | og:image for a shop link once it has a cover (founder's pick 4A, 2026-10-15): the cover's middle filling the card, the logo round in the bottom left (left out if it can't be read), our mark bottom right; no cover: as `/preview/logo`; cover unreadable: the plain mark; +30/min |
| GET | `/shop/{store_slug}/preview/products/{product_slug}` | public | `?v=` | JPEG 1200 × 630, or 302 | og:image for a product (or category) link: the first photo with our mark; 404 for another shop's or a hidden product; no photo: as `/preview/logo`; +30/min |
| POST | `/shop/{store_slug}/orders/{order_id}/paid` | public | `PaymentClaimIn` (`phone`) | 204 | "I've paid" (founder's pick 6B): the order link + phone like tracking (404 otherwise); 409 `NOTHING_TO_PAY` unless a pending KHQR / bank payment on an order that's on. Saves a web `payment_claimed` row and sends a Telegram alert in the background, not again within 30 min; the payment stays pending. +10/min |
| POST | `/shop/{store_slug}/orders/{order_id}/telegram` | public | `TelegramUpdatesIn` (`phone`) | `TelegramUpdatesOut` (`telegram_url`, `expires_at`) | "Get updates on Telegram": the order link + phone like tracking (404 otherwise); 503 `TELEGRAM_NOT_CONFIGURED` without the bot. The page asks for it as it opens, so +30/min |
| POST | `/billing/run` | header `X-Cron-Secret` | — | 202 `{"started": true}` | The daily payment reminders, after the response (cron-job.org); wrong or no secret → 404; hidden |
| POST | `/reminders/run` | header `X-Cron-Secret` (`BILLING_CRON_SECRET`) | — | 202 `{"started": true}` | The hourly customers' payment reminders (`order_reminders.run`), after the response (cron-job.org); wrong or no secret → 404; hidden |
| POST | `/telegram/webhook` | header `X-Telegram-Bot-Api-Secret-Token` | Telegram update (raw dict) | Bot API method call as JSON, or `{}` | 404 if the secret is wrong or the bot is off |
| POST | `/telegram/mini-app/check` | Telegram's signed `initData` | `{init_data}` | `{id, first_name, auth_date}` | The founder's mini app test (2026-10-20, temporary): `telegram.read_mini_app_data` checks the signature with the bot's token (HMAC-SHA256 keyed by HMAC("WebAppData", token)) and that it's under a day old; else 401 `TELEGRAM_DATA_INVALID`; 30/min; hidden |

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
- `courier` is optional (founder, 2026-10-18): one of the shop's couriers
  the customer would like, or null = the shop chooses, accepted even when
  own delivery is off (`delivery.check_checkout_choice`; a name no longer
  on the list is 409 `DELIVERY_OPTION_UNAVAILABLE`, field `courier`).
  Checkout (`ShopCheckout.tsx`) offers two cards, Delivery and Pickup,
  and under Delivery, when the shop lists couriers, "Delivery company
  (optional)" pills (`Pills` in `components/ui.tsx`): "Shop chooses"
  first, then each courier. The customer's order page says "Delivery"
  until a courier is set or it's sent.
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
@fontsource-variable/noto-sans-khmer and inter. No automated frontend tests.

### Routes (`src/router.tsx`)

| Path | Component | Notes |
|---|---|---|
| `/` | `pages/Home` | Landing: Register / Log in |
| `/login`, `/register` | `pages/Login`, `pages/Register` | Register asks only the phone check, shop name and password (the seller's name is their Telegram name; the link is a code the API makes). Under each form, "or sign up with" / "or log in with" and a row of Google, Facebook and TikTok logos (`auth/SocialButtons.tsx` with its `label`: Google's square icon button, `ProviderButton` `iconOnly`; each only when its `VITE_` ID is set); Login has "Forgot password?" |
| `/register/finish` | `pages/FinishSignup` | Someone new from Google, Facebook or TikTok: shop name, phone checked in Telegram (the name is the provider's) → `POST /auth/social/register`. The signup comes in the navigation state or `sessionStorage` `sc.signup` (`lib/signup.ts`); without one, back to `/register` |
| `/auth/:provider/callback` | `pages/OAuthCallback` | Back from Facebook / TikTok with `code` and `state`. Only the sign-in this tab started (`sessionStorage` `sc.oauth`, 15 min, `lib/oauth.ts`) is finished: log in (`POST /auth/oauth/{provider}`, then like Google, `auth/useSocialResult.ts`) or connect (waits for the session, `POST /seller/account/oauth/{provider}`, back to Your account). Cancelled, refused or someone else's → "Couldn't log you in" with a link back |
| `/tg-test` | `pages/TelegramTest` (lazy) | The founder's mini app test (2026-10-20, temporary, English only), opened inside Telegram from `/minitest`: loads Telegram's `telegram-web-app.js` on this page only, asks the server who opened it (`POST /telegram/mini-app/check`), and has a row per thing the shop needs inside Telegram (save the QR both ways, location, links both ways, copy, share, back arrow) plus the founder's shop (`?shop=`); results copy as text |
| `/privacy`, `/terms`, `/data-deletion` | `pages/Legal` | Public, no login; English or Khmer with the language switch. The text is in `pages/legal/content.ts` (what's kept, the hosts, cookies, how long, deletion: keep it true to the code), the date in `UPDATED`; Contact links `VITE_SUPPORT_TELEGRAM` (else "Settings → Get help"). The Terms' Fees state the plan (01 §33.1: the trial, $9.99 / $99, the 7 days, no new orders after), as does `services/plan.py`'s `PRICES` (shown in Settings → Plan): change them together. Linked from the start page (`LegalLinks`) and under "Create shop" (`pages/AgreeLine.tsx`). Meta and TikTok ask for these URLs (2026-10-09) |
| `/forgot-password`, `/reset-password#<token>` | `pages/ForgotPassword`, `pages/ResetPassword` | The link goes to the shop's Telegram; without Telegram, "Message Oak Order" (if `VITE_SUPPORT_TELEGRAM`). Saving logs in (`startSession` in `AuthContext`) |
| `/dashboard` | `dashboard/Layout` (`DashboardLayout`) | **Auth guard**: spinner while loading, retry card if unreachable, `Navigate` to `/login` if anonymous; index redirects to `orders` |
| `/dashboard/settings/setup` | `settings/SetupPage.tsx`, `settings/setup.ts` | A new shop's checklist (founder's pick 7C), owners only: add a product, delivery fee (`delivery_set_up`), ways to pay (`payment_set_up`), Telegram alerts (when the bot exists), contact buttons, logo, Open your shop (to Settings → Plan; done once the plan isn't `setup`); each opens its page. "Set up your shop · 2 of 7 done" tops the Settings menu until all are done or "Hide this list" (per device, `sc.setup.hidden.<store id>`); an amber dot on the Settings tab (and sidebar) until the first three and opening are done. While those aren't done (and the list isn't hidden), the same list tops Orders as "Get your shop ready" (`SetupCard`, `useSetupOnOrders`; UX check #3, 2026-10-17), the next step with its button in its row (Open shop asks first), in place of the delivery reminder |
| `/dashboard/orders/new` | `orders/NewOrder.tsx` | An order from a chat (picks 3A, 4A; "+ New order" beside the Orders title). Phone first: a customer found by phone fills in their name and latest address. Products from the seller's list (search, tap to add; options as chips; sold out can't be added), Delivery or Pickup (no courier: the seller picks one when sending; founder, 2026-10-18) and ways to pay, a note; totals with `lib/pricing.ts` like the cart; pinned Save with the total. The saved order says "Added by you from a chat" and has "Copy link for the customer". While the shop's plan has stopped it taking orders, `PlanReminder stoppedOnly` tops the form (saving gets 409 `PLAN_UNPAID`); in setup the form is replaced by "Open your shop first" with Open shop (`NotOpenYet`; saving would get 409 `SHOP_NOT_OPEN`) |
| `/dashboard/orders`, `/orders/:orderId` | `OrdersPage` (`OrderList.tsx`: the list, with `OrderDetail` beside it on laptops) | Orders tab is the start page; phones show the list or the order; rows (`OrderRow.tsx`) lead with the customer and have no buttons; rejecting in the open order (`useMoveOrder.ts`) opens the next new order of the tab (`nextNewOrder`); accepting keeps it open (its next step is sending it out) with "Accepted. 3 more new orders · Next ›" (UX check #6, 2026-10-17); neither when it was opened from a customer's or a link's page. The open order (`OrderDetail.tsx`, founder's picks 1A 2A 3A 4A 5A, 2026-10-15): the title is the customer's name, with the number (bold), time and total under it (`PageHeader` `subtitle`); a ⋯ menu (`MenuButton`) holds the rare actions: Cancel order, Delivery failed, Payment failed (asks first), Not paid after all / Back to not paid (asks first). Then `StatusCard.tsx`: one card, a row each for the order, the delivery and the payment, each with its status (coloured words, grey icon; no pop when it changes, and no confetti or vibration on Complete: founder, 2026-10-15) and its own buttons, so every button shows once. `nextStep` (`orderSteps.ts`) picks the one row waiting on the seller (accept; a failed payment: Back to not paid or Cancel order on the card, out of the ⋯ menu meanwhile; a KHQR or bank payment still to check, before sending, with "Not paid yet" under the delivery's buttons (UX check #7, 2026-10-17); send to a driver; deliver; complete): it's shaded (`bg-navy-50`) with the dark button. A new order shows only Reject (`danger`) / Accept; a closed one no buttons and the red note above, its delivery and payment rows with grey status words (`muted`, UI check #4). Order row: Complete once `next_statuses` has it ("Cash received, complete" while cash on delivery is still to record, `cashAndComplete`: the payment, then the order; "Complete without the cash" in the ⋯ menu; UX check #8, 2026-10-17), else "+ Tell the customer a step", which opens the optional chips (`StepChips`): processing / ready / shipped and, once someone has the parcel, picked up / on the way (UX check #14, 2026-10-17). Delivery row (fee, courier, who's delivering as "Driver:" or a courier's "Tracking:"; "Not sent yet", "With the driver" / "Sent with J&T Express": UX check #13, 2026-10-17): not sent out yet → Send to driver (Send for a courier, Try again) plus the short path's Delivered ("Delivered, cash received" for cash on delivery, `useCashHandover`; "Delivered, complete" / "Collected, complete" once paid, `deliverAndComplete`: the delivery, then the order; UX check #15, 2026-10-17); with a driver → "Delivered, cash received" / Delivered, "Send again" (picked up / on the way are with the order's optional steps). Payment row (method, amount, marked paid, note; after the customer's "I've paid" the status line is "Says paid at …" in amber words with "Check your bank app for $X"; without it, a KHQR or bank order 24 hours old reads "Not paid after 24 h" in amber words with "Check your bank app before you cancel." (`unpaidLong` in `lib/payments.ts`, on `created_at`, worked out in the app; the list row says it too) and, once accepted, its step is `cancelUnpaid`: Mark paid and Cancel order (`danger`, the pinned one), founder's pick 2026-10-20): Mark paid opens a note form (`PaidForm`); cash on delivery gets "Cash received" once delivered. All the recording goes through `useOrderActions.ts`. Phones (pick 6A, `PinnedStep.tsx`): while the shaded row's dark button (`data-next-step`) is off the screen or behind the bar (an `IntersectionObserver` on that button, not the card: on a short order the card never leaves the screen), the same buttons slide up in a bar at the bottom (Reject / Accept, Mark paid (opens the form and scrolls to it), Send to driver, Delivered, Complete); not while the Mark paid form is open, not on laptops. Send to driver (pick 4A, `SendToDriver.tsx`; "Send with" pills when the shop has couriers: Your driver (if own delivery is on, which Settings now saves with Delivery) and each courier, starting from the customer's pick, sent as `courier` (founder, 2026-10-18); an order the customer left to the shop says "Your driver or a courier" on the card with a "Send" button (`courierToChoose`, `lib/delivery.ts`); for a courier "Send with J&T Express": "Tracking number (optional)", "Save: sent with J&T Express" first and "Share the details" second): a sheet (bottom sheet on phones, `<dialog>`) with the message (`driverMessage`: labelled blocks split by blank lines: shop name and order number; customer, phone, address (or "none given, call the customer"), map link, note; item count and bulleted items; "COLLECT $X CASH" with how it adds up (items − discount + delivery) / "Paid already" / "Paying by KHQR"; the shop's contact phone if set; in the app's language), "Driver's name and phone number (optional)", Send (the share list on touch phones, copied on laptops; once it went out the delivery is recorded as assigned with that note; a closed share list changes nothing) and "Save without sending". Under it the items (count, the customer's note as a grey message bubble (pick 7A) under "Note from the customer", or "Your note" on a chat order; lines, totals), then one customer card: name and View customer, the phone with Call and Copy round buttons and the Telegram check, "Message on Telegram" when `customer.on_telegram` (`MessageCustomer.tsx`: a sheet like Send to driver with two ready messages, "Can't reach you" (with the order's phone) and "Driver is near", that fill the box in the app's language, and Send; amber "Add your Telegram in Settings → Contact" when the shop has no Telegram, Messenger or phone to reply to; a 409 closes it and reloads the order; founder's pick 2026-10-20), Copy link for the customer on chat orders, where it came from, Deliver to with the address, note and Open in Google Maps. Reminders above the list (amber words on a plain card) (`Reminder` in `dashboard/Reminder.tsx`, opening the setting for owners): the plan (`PlanReminder`, from `GET /seller/plan`: owners from its last 6 days, "Your free trial ends on …", then "Pay by …", then "isn't taking new orders"; after "I've paid", "Oak Order is checking your payment"; staff only the last one; for shops without Telegram it is the payment reminder), orders paused, and delivery not set up (`delivery_set_up` and a zero fee, "free for customers"; the Settings menu's Delivery row says the same, or "Not set yet: $2.00 a delivery" for a new shop). No orders yet: with the setup list on top, only "No orders yet" (in setup: "Orders will show up here once your shop is open"); otherwise "Add your first product" while the shop has none; then, in setup, "Your shop isn't open yet" with Open shop (owners) and View your shop (`NotOpenYet`, `dashboard/OpenShop.tsx`); else "No orders yet" with View your shop. Open shop (`OpenShopButton`) asks first in the confirm dialog ("Start your 30-day free trial": customers can order from today, free until `trial_until`, then the prices, no card) and calls `POST /seller/plan/open` (`useOpenShop`). |
| `/dashboard/customers`, `/customers/:customerId` | `CustomerList`, `CustomerDetail` | Laptops: a sortable table (sorts the customers loaded); a customer has Call / Copy phone |
| `/dashboard/products`, `/products/new`, `/products/:productId` | `ProductList`, `ProductEdit` | Photos (cards as tall as the photo) or List (rows; a sortable table on laptops), kept in `sc.products.view`; stock tags: the seller's `low_stock_alert` or fewer is "Only N left" |
| `/dashboard/categories` | `Categories` | Button on Products on phones; sidebar entry on desktop. "New category" opens a labelled form; each row's actions (share link, rename, delete) are in one ⋯ menu (`MenuButton`) |
| `/dashboard/links`, `/links/new`, `/links/:linkId` | `LinkList`, `NewLink`, `LinkDetail` | First "Your shop link" with Copy (`ShopLinkCard`; Settings → Shop link until the settings check, founder 2026-10-19), then links as cards with Copy, views, orders and % ordered |
| `/dashboard/settings`, `/settings/:section` | `SettingsPage` (`SettingsMenu` beside `SettingsSection` on laptops) | Store sections (`SECTION_IDS` in `form.ts`, saved with `PATCH /seller/store`): `shop` (the cover, the logo and the shop's colour are part of the form and change only on Save (founder, 2026-10-15); a picked picture is uploaded to R2 at once, the store keeps its old one until Save, and the API accepts the store's current picture back unchanged; the phone crops a cover to its middle 3:1 strip, at most 1800 × 600 JPEG (`prepareCover`, `lib/images.ts`), as it crops a logo to a 256 px square; the colour as eight swatches, each showing its own colour; `ShopPreview` at the top shows the cover, logo, name and a Buy now button in the picked colour before Save, the picture fields under it being only their buttons (settings check #8, founder 2026-10-19)), `orders` (titled Orders and alerts since the settings check, founder 2026-10-19: Take orders, Accept automatically, then Telegram, which connects at once, the low-stock level, and Export orders under the form (`ExportOrders.tsx`, its own form: This month / Last month / Choose days; downloads with `apiBlob` in `lib/api.ts`; `AFTER` in `SettingsSection.tsx`); the old `telegram` and `export` addresses open it, and `link` opens the Links page (`MOVED` in `form.ts`)), `payments`, `delivery` (one Delivery switch, founder 2026-10-18: on = `own_delivery.enabled` with the fee, free-delivery rules and "Couriers (optional)" under it; off saves no couriers; `DeliveryForm.delivers` in `form.ts` reads on for own delivery or any courier; then Pickup), `discounts`, `contact` (Telegram username, Messenger page, phone). Pages with their own endpoint (`PAGE_IDS`, `PAGES` in `SettingsSection.tsx`): `account`, `plan` (`PlanPage.tsx`, `GET /seller/plan`: in setup "Your shop isn't open yet", when the trial starts and the prices, Open shop, and no Pay section; else the trial or paid-until date with days left, what's included; during the trial with more than a week left and no "I've paid" yet, Pay is folded behind "Pay early" (`PaySection`, UX check #23, 2026-10-17); Monthly / Yearly; the shop's code (copy); Oak's KHQR for that amount drawn with `lib/khqrImage.ts` (Save QR to photos, the dark button; "I've paid" plain) and/or Oak's bank account; without `OAK_*`, "Pay … on Telegram" (a message to `VITE_SUPPORT_TELEGRAM` with the code); "I've paid" (`POST /seller/plan/paid`), then "Oak Order is checking your …" until the founder answers; the payments, ones not found with the founder's note; its menu row says "Not open yet: free trial not started", until when, "Oak Order is checking your payment", or "Pay by …" / "Not taking new orders"), `close` (password, confirm, then log out; no menu row since the settings check, founder 2026-10-19: `CloseShopRow` at the bottom of `shop` opens it, and its back arrow returns there), `staff`. Staff see a note instead of the store rows, then Your account, Get help, language and log out; any other settings address sends them to `account` (`useRole()` from `GET /seller/account`). Laptops open `shop` when none is chosen |
| `/dashboard/notifications?from=<page>` | `Notifications` | The bell opens it with the page it was tapped on as `from` (`notificationsLink` in `useBackTo.ts`); the back arrow and the bell tapped again ("Close notifications") both go back there, Orders if `from` is missing. Rows pass the page with its `from` as `back`, so returning from an order keeps it. |
| `/dashboard/admin`, `/admin/:storeId` | `admin/AdminShops.tsx`, `admin/AdminShop.tsx` | Oak Order's admin page (founder's pick 2B), reached from Settings → "Oak Order admin" when `GET /seller/account` says `is_admin` (others are sent to /dashboard; the API answers 403 anyway). The list: search by shop, code, link or phone; All / Said paid / Ends soon / Unpaid / No orders; each shop with its code, stage, trial or paying, closed, no Telegram, paid until (pay by), a waiting "I've paid". A shop: the code, "Says paid … on …" with Found it: mark paid (the amount found if different, a note) or Not found (the note the seller sees), "Mark paid" (a month or a year, the amount or the price, 0 = free time, a note; confirm), and every payment with status, dates and notes. English and Khmer |
| `/shop/:storeSlug` | `shop/ShopLayout` → `ShopHome` | Public. An old link: the shop answers with its current `slug`, and `ShopLayout` replaces the address with it (rest of the path, `?l=`, hash kept); link views are counted under the current slug. A shop with a cover (founder's pick 3A, 2026-10-15): `ShopIntro`'s `CoverBand` shows it 3:1 across the top (edge to edge on phones, rounded from `sm`), the logo over its bottom edge and the name beside it on every size; the header then stays small on laptops, turns solid as soon as the page moves, and shows the small name once it has scrolled under the header (`belowCover`). While paused, `PausedNotice` (`shop/components.tsx`) tops every shop page and the cart's Place order is disabled; the seller's Orders tab shows a reminder. A shop in setup (`opening_soon`, 2026-10-16) shows `PausedNotice` as "Opening soon" in plain words, and checkout's button reads "Opening soon" |
| `/shop/:storeSlug/product/:productSlug` | `ShopProduct` | |
| `/shop/:storeSlug/category/:categorySlug` | `ShopCategory` | A tab of the same page as `ShopHome` (`handle: { page: 'products' }`): switching between All and a category doesn't fade the page in |
| `/shop/:storeSlug/cart` (`/checkout` forwards here) | `ShopCheckout` (with `CartItems` / `EmptyCart` from `ShopCart.tsx`) | The cart and checkout on one page (redesign 2026-10-06). Under the phone field, `PhoneHint` reads the number back ("The seller will call 012 345 678") or warns about an unusual prefix (2026-10-15). Your details starts with "Continue with Telegram" (`shop/TelegramLogin.tsx`, when `telegram_login`; outlined so Place order stays the one dark button), then "or type your details": a plain link to the check made ahead (`useNewTelegramLogin`), which on tap beacons the cart (`sendCartWithLogin`), keeps the check in sessionStorage for a reload (`pendingLogin`), and reads it every 2.5 s ("Share your phone in Telegram, then come back here."); once it holds the token, `saveTelegramCustomer` (localStorage `sc.telegram`, every Oak shop on the device, `useTelegramCustomer`) and the name and address fill in. Logged in: the phone with "Confirmed in Telegram" and "Not you?" (logs out), and the Name box; `useShopCustomer` (`GET /me`) fills in this shop's name and address once; the order goes with `X-Customer-Token` (`customerHeaders`). Inside Telegram (`shop/miniApp.ts`, `useMiniApp` in `ShopLayout`): `insideTelegram` (Telegram's launch data in the first page's hash, remembered in sessionStorage `sc.miniapp`) loads `telegram-web-app.js` (only then), `ready()` / `expand()`; `?tg=<check id>` → `POST …/mini-app` → `saveTelegramCustomer` and `replaceCart` (the cart brought from the browser), then the parameter goes; without it and not logged in → `POST /mini-app-login`; Telegram's BackButton off the shop's home (back, or the home when it opened straight on a page). There, Continue with Telegram opens the bot with `openTelegramLink` |
| `/shop/:storeSlug/order/:orderId` | `ShopOrderPage` | Confirmation + tracking. While in progress, the status card has "Get updates on Telegram" (`TelegramUpdates`: the link fetched ahead with `useTelegramUpdates`, a plain `t.me` link; after the tap the order is checked every 3 s until `on`), then "You'll get updates on Telegram". The seller's order shows `TelegramPhone` under the customer's phone |
| `/shop/:storeSlug/orders` | `ShopOrders` | Orders placed on this device |
| `*` | redirect to `/` | |

The dashboard shell has a bottom tab bar on phones (Orders, Customers,
Products, Links, Settings) and a sidebar from `lg`, whose first row is the
shop's logo and name alone; on laptops the bell and share sit in a slim
sticky bar at the page's top right (`LaptopTopBar`, UI check #10). Beside the bell, a
share button (`ShareShopButton`, `dashboard/ShareShop.tsx`, UX check #10,
2026-10-17) opens the phone's share list with the shop's link, or copies
it on a laptop; the Links page starts with the shop's link and Copy
(`useShareShop`). The product edit, order
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
"Start again" button once it has expired (30 min). `resume` picks up a
check opened before a reload (the sign-up draft) instead of making a new
one; `onOpen` hands the check out when Telegram is opened, so the page can
keep it. A number that already has an account shows, when the page passes
`taken` (`message` and an `action`, e.g. Log in), in a plain box with the
message in amber words, the action and "Use another number". On load, if
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
window), `sc.chatOrder.<store id>` (the delivery and payment picked on the
last chat order, picked again on the next), `sc.register` and
`sc.register.social` (the shop name typed on Create your shop / Set up your
shop and the phone check they opened in Telegram, never the password; 30
minutes; `lib/signup.ts` `useSavedDraft` / `useKeepDraft`). `sessionStorage`: "confetti already shown" per order. Every access
is wrapped in try/catch (private mode).

### Shared components and helpers

- `components/ui.tsx`: `Field`, `Input`, `MoneyInput`, `PasswordInput`,
  `TextArea`, `Select`, `Switch`, `Button`, `IconButton`, `Card`,
  `Section`, `PageHeader` (with back link; an optional `subtitle` line
  under the title), `MenuButton` (a ⋯ button with a small menu: closes on a
  choice, a tap outside or Escape, arrow keys between items; red words for
  danger items, no red hover), `PageOutlet` (outlet that
  fades a page in when another route opens; routes with the same
  `handle.page` count as one page and don't fade: the shop's All and
  category tabs), `Badge` (coloured words in every tone, no pill; UI check #8), `LiveBadge`, `DotList` (short words with a grey dot between, for status and stock lines), `Skeleton`, `EmptyState`, `ErrorMessage`,
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
  secondary, danger (anything that removes or ends something, also the
  confirm dialog's danger button: a plain outlined button with red words),
  ghost; sizes md, lg) and `cardClass`.
- `components/feedback.ts` + `FeedbackProvider.tsx`: `useFeedback()` →
  `toast(message, tone)` and `await confirm({title, message,
  confirmLabel, danger})` (a bottom sheet).
- `components/SourceLogo.tsx`: the real Facebook, TikTok, Instagram,
  Telegram and Messenger logos in their own colours, wherever a link's
  place shows (link cards, New link picker, link page, an order's "Came
  through" line). Shapes in `lib/sourceLogos.ts` (Simple Icons, CC0);
  `hasLogo(source)` is false for a place the seller typed in.
- `components/revealChosen.ts`: scrolls a sideways row (category chips,
  Orders tabs) so the chosen item shows with the one before it; with the
  `fade-x` utility (`index.css`) such rows fade at both ends (UI check #12).
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
  product pages, the cart or Your orders: "Made with Oak Order", the
  acorn as its O (`OakOrderName`, to `/`), then Privacy · Terms, each in a
  new tab (founder's picks 1A 2A, 2026-10-10).
- `shop/components.tsx`: `NoPhoto` (a product without a photo: a picture
  icon on `bg-tile`, a grey token that stays grey in dark mode; used by
  every thumbnail, UI check #11), `ProductImage` (thumbnail with fallback;
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
  `links.ts`, `customers.ts`, `products.ts`, `useDebounced.ts`,
  `phone.ts` (`lookAtPhone`: the checkout's phone hint reads the number back
  once it's whole, and warns, without blocking, when no Cambodian mobile or
  landline prefix matches; `normalize_phone` in the API still decides).
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
  the sidebar layout. The dashboard column is `max-w-3xl` (wider for the
  order, product, customer and link lists and Settings, `Layout.tsx`),
  left-aligned beside the sidebar from `lg` so every page starts at the
  same edge (UI check #9); the shop is `max-w-5xl`.
- **Write classes for light mode only.** Dark mode (`:root[data-theme='dark']`
  in `index.css`) flips the slate, navy, emerald, red, amber and sky scales.
  Solid fills that must not flip use the tokens `bg-surface` (cards, bars,
  inputs; **never `bg-white`**), `bg-raised`, `bg-accent` / `hover:bg-accent-hover`,
  and `bg-brand`, with `text-white`.
- **Red and amber go on words only** (founder, 2026-10-15): no red or amber
  fills, tints, pills, borders or icon circles, anywhere (dashboard and
  shop). A status, a warning or a problem is coloured text (`text-red-700`,
  `text-amber-700`/`800`) on a plain card or the page; its icon in a grey
  circle; `Badge` renders words without a pill in every tone (UI check #8);
  `ErrorMessage` is red words; a field with a problem keeps its grey border
  (the red words under it say why); danger buttons and menu items are red
  words with a grey outline or hover. The bell's count and the setup dot
  are navy. Left as they are: the small dot before a status word in the
  order list and the shop's stock line.
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
- **A shop's own colour** (founder's picks 1A 2A, 2026-10-15):
  `store.color` is one of eight; `src/shop/colors.css` (imported by
  `index.css`) has, for each but navy, a light and a dark scale that
  replace `navy-*`, `accent`, `accent-hover` and `brand` under
  `[data-shop-color='<name>']` (dark selectors carry `:root` to outrank the
  dark block). `ShopLayout` puts the attribute on `<html>` while a shop page
  shows (`useShopColor`, `src/shop/colors.ts`), so sheets and toasts take
  it too; Settings puts it on each swatch. So in the shop, write `navy-*` /
  `bg-accent` as usual and they follow the shop's colour. Words on
  `bg-accent` are `text-on-accent`, never `text-white`: white for the deep
  colours, the colour's own deep shade on the light ones (pastel buttons). Oak's own things
  that must stay navy use `text-oak`; the name "Oak Order" on a page (the
  shop's "Made with Oak Order", the log-in header) is all `text-oak-ink`,
  navy, light navy in dark mode (UI check #15).
  The seller's dashboard sets it too (`dashboard/Layout.tsx`, founder
  2026-10-15), so the dashboard is in the shop's colour as well; a
  `navy` block lets the Navy swatch show navy inside another colour.
- Animations are theme tokens (`animate-rise`, `animate-fade-in`,
  `animate-pop`, `animate-sheet-up`, `animate-shimmer`, `animate-wiggle`,
  `animate-drive`, `animate-arrive`, ...); a `prefers-reduced-motion` rule turns them off.
  Entrance animations use `backwards` fill so no transform lingers (it
  would pin fixed bars inside cards).
- Fonts (founder's pick A, 2026-10-17; Kantumruy Pro before): **Noto Sans
  Khmer** for Khmer (~59 KB) and **Inter** for Latin letters and numbers
  (~48 KB), self-hosted variable files picked by `unicode-range` in
  `index.css`, each downloaded once; `--font-sans` puts Inter first (it
  has no Khmer, so Khmer falls to Noto Sans Khmer before any system font).
  The name "Oak Order" (`OakOrderName`, the start page's big name) uses
  `font-wordmark`: a 2 KB Kantumruy Pro subset holding only "Oak Order"
  (`src/assets/fonts/oak-wordmark.woff2`, inlined into the CSS), because
  the acorn O is drawn from Kantumruy Pro Bold's O. The command that made
  it is in `index.css`.
- **Small Khmer text is 13px** (UI check #1, 2026-10-17): `index.css`
  redefines `--text-xs` / `--text-xs--line-height` on `:root[lang='km']`
  (13px on 20px), so every `text-xs` grows in Khmer and stays 12px in
  English. Use `text-xs` for small text, not `text-[11px]`-style sizes.
- **Text links: the `link` utility** (`index.css`, UI check #2): every
  text link and text-only button (and the `ghost` button variant) is
  underlined with a thin, light line at `text-underline-offset: 0.42em`,
  which clears Khmer subscripts; `html` sets the same offset so any other
  underline does too. Don't use `hover:underline` or `underline-offset-2`.
- **A label over a group** (options, contact buttons, "Deliver to") uses
  the field label's style, `text-sm font-medium text-slate-700` (UI check #17).
- **Dark status colours are softer than Tailwind's** (UI check #3): the
  dark block in `index.css` sets the emerald, red, amber and sky 600-800
  shades (text and dots) to lower-chroma values, so status words stay
  calm on dark cards. Change them there, not per component.

### Link previews (`frontend/linkPreview.ts`)

The logic is in `linkPreview.ts` (plain web APIs: `isPreviewBot`,
`previewResponse`), run on `/shop/*` by the host: a Cloudflare Pages
Function (`frontend/functions/shop/[[path]].ts`, `env.ASSETS` for
`index.html`, `env.VITE_API_URL`) and, until the move to Cloudflare Pages
(decided 2026-10-14; the founder switches the domain), Vercel Routing
Middleware (`frontend/middleware.ts`, `matcher: '/shop/:path*'`,
`process.env.VITE_API_URL`). For preview-bot user agents only (Facebook,
Telegram, TikTok, WhatsApp, ...), it fetches the storefront API (6 s
timeout) and returns `index.html` with `og:` title, description and image
filled in, in Khmer. Everyone else passes straight through to the SPA
(Cloudflare: its SPA fallback, as there's no `404.html`; Vercel: the
`vercel.json` rewrite). The security headers are in both `vercel.json` and
`public/_headers` (Cloudflare). Both hosts were run locally with bot and
phone requests against the API (2026-10-14).

Oak in every card (founder's picks 3B and 5B, 2026-10-10): titles end in
"· Oak Order" (the page's own words are cut first, never the suffix), with
`og:site_name` Oak Order; a product's title carries its price. The picture
is the API's copy with our mark in the corner: `/shop/{slug}/preview/logo`
(a small square, `twitter:card` summary), or, for a shop with a cover,
`/preview/cover` (1200 × 630 with the logo, summary_large_image; its `?v=`
comes from both addresses; founder's pick 4A, 2026-10-15), or `/preview/products/{slug}` (a
1200 × 630 card, summary_large_image; a category uses its first product
with a photo), each with `?v=` from the photo's address so a new photo is
a new URL. No logo: `public/og/oak-mark.png`. Every other page, and a shop
link while the API is asleep, gets the generic card in `index.html`:
`public/og/oak-order.png` ("Oak Order" with the acorn O and the line from
the start page). `public/apple-touch-icon.png` is the iPhone home-screen icon (iPhones
don't take the SVG favicon). The three PNGs were drawn from the mark's SVG
(the card's text with Kantumruy Pro); redraw them, and the backend's two
`oak_mark_*.png` masks, if the mark changes.

---

## 9. Integrations

| Integration | State | Details |
|---|---|---|
| **Google sign-in** ("Continue with Google") | WIRED, env-gated (`GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID`); not set up yet (needs the founder's Google Cloud client) | Google Identity Services script (`accounts.google.com/gsi/client`, loaded on first use, `src/lib/google.ts`), its own button (`auth/GoogleButton.tsx`, outline, in the app's language: as wide as the form up to 400 px in Settings → Your account, its square "G" with `icon` under the Login and Register forms), popup mode; the ID token is checked by the API (`core/google.py`). No secret, no redirect URL; the client must list `https://order.oaksolve.com` and `http://localhost:5173` as JavaScript origins. Tested with a key made in the tests and a stand-in button in the browser, not yet with real Google |
| **Facebook / TikTok sign-in** | WIRED, env-gated (`FACEBOOK_APP_ID`+`_SECRET` / `TIKTOK_CLIENT_KEY`+`_SECRET`, and the `VITE_` IDs); not set up yet (needs the founder's Meta and TikTok apps, and their reviews) | Redirect flow, no SDK: `lib/oauth.ts` sends the browser to `facebook.com/v26.0/dialog/oauth` (scope `public_profile,email`) or `tiktok.com/v2/auth/authorize/` (scope `user.info.basic`) with a random `state`; the API trades the code (`core/oauth.py`). Redirect URIs to register: `https://order.oaksolve.com/auth/facebook/callback` (+ `http://localhost:5173/...` for Facebook in development mode) and `https://order.oaksolve.com/auth/tiktok/callback` (TikTok takes https only, so no localhost). Their buttons are drawn like Google's outline button (`auth/ProviderLogo.tsx`). Tested with the providers' answers faked (tests and the browser), not yet with the real ones |
| **Telegram bot** (seller alerts) | WIRED, env-gated | `services/telegram.py`: plain `httpx` calls to the Bot API (`sendMessage`, `setWebhook` with messages and button taps, `editMessageText`, `answerCallbackQuery`). Webhook registered at startup only when `PUBLIC_API_URL` is set. Webhook checks the secret header with `hmac.compare_digest`. `/start <code>` in a private chat stores `store.telegram_chat_id` (the code is store id + expiry + 12-byte HMAC-SHA256, base64url, 43 chars, key derived from `JWT_SECRET`). Groups are ignored. Replies go back in the webhook response. Alerts (`services/notifications.py`) for new orders and low stock (crossing the shop's `low_stock_alert`, 5 to start, or to 0), and "<name> says they paid #1001" when a customer taps "I've paid" (`notify_payment_claimed`), go out after the response (`_send_all`). The "says paid" alert has two buttons: "✅ បានទទួល កត់ថាបានបង់" (Received, mark paid; `callback_data` `paid:<order id>`) and Open order. A tap (`callback_query`, `notifications.button_tapped`) records the payment paid only when the tap's chat is the order's shop's `telegram_chat_id` (anyone holding a bot message can send any data), not for a rejected or cancelled order or a failed or paid payment; it answers with `answerCallbackQuery` in the webhook response, edits the alert (`editMessageText`: the last line becomes "✅ បានកត់ថាបានបង់", Open order stays) and tells the customer like the app's Mark paid. An order the seller added from a chat sends only low stock. Bot texts point to Settings → Alerts. Each writes a `notification_log` row (`telegram`, sent or failed). A 403, or a 400 "chat not found", disconnects the store. Every bot message (alerts, connect and help replies, the password reset) is in Khmer only, the app's default language, in the app's own Khmer words (decided 2026-10-09; no per-seller language is stored); HTML-escaped. The same chat gets "Forgot password?" links (`auth.send_password_reset`, no log row). **Phone check** (founder's choice 2026-10-09, instead of SMS codes; `services/phone_check.py`): `/start phone_<code>` remembers who opened it and answers with a reply keyboard button `request_contact` ("📱 ចែករំលែកលេខទូរស័ព្ទ"); the contact that comes back counts only if `contact.user_id` is the sender's own id (anyone can attach someone else's contact card), then completes the newest open check that account opened and removes the keyboard. Telegram numbers come without the + (`855…`), so the + is added before `normalize_phone`. Codes starting `phone_` go to the phone check, the rest to the store link. On a laptop, `python -m app.telegram_poll` stands in for the webhook. Live and tested by the founder (04). |
| **"Ask seller": Telegram, Messenger, call** | WIRED (no bot) | `shop/ContactSeller.tsx` (+ `contact.ts`) on the product page and the order page: `https://t.me/<telegram_username>?text=<question>`; `https://m.me/<messenger_username>` (m.me can't type a message, so the question is copied to the clipboard first); `tel:<contact_phone>`. Each hidden when empty; one way shows as one button, more as a row that wraps. Set in Settings → Contact; `StoreUpdate` accepts a page's m.me / facebook.com link (`profile.php?id=` too) and any phone spelling. |
| **Web notifications** | WIRED | `notification_log` rows with `channel=web`, written in the checkout transaction; the dashboard polls. No push. |
| **Payments: COD, bank transfer** | WIRED, manual | No provider. Bank details from `payment_config` (current values, not a copy at order time) are shown on the order page while the payment is pending and the order isn't rejected or cancelled. |
| **ABA PayWay** (sellers paying Oak Order) | PARKED on the `payway` branch (2026-10-14) | Pay now, the monthly auto-charge and callbacks, built with a fake PayWay, never tried against PayWay. Waits for Oak Solutions' MOC registration and 6 months of business (ABA's conditions). Main collects by hand (above). |
| **Payments: KHQR** | WIRED, manual confirmation | `services/khqr.py` builds an individual KHQR (EMVCo TLV + CRC16) for the exact total, bill number `#<order number>`, 24 h expiry, made fresh on every order-page load; none for riel totals with cents. Tests pin it to strings from NBC's `bakong-khqr` 1.0.20 SDK. Drawn in the browser with `uqr`. |
| **Bakong Open API** (auto-confirm) | NOT BUILT | Post-MVP (02 §10.3). |
| **Cloudflare R2** (images) | WIRED, env-gated | `services/images.py`: boto3 S3 client against `https://<account>.r2.cloudflarestorage.com`, presigned `put_object` URLs (10 min) signed with exact `ContentType` + `ContentLength`. Keys: `stores/<store>/products/<product>/<hex>[-m].<ext>`, thumbnail `<hex>-s.jpg`, logo `stores/<store>/logo/<hex>.<ext>`, cover `stores/<store>/cover/<hex>.<ext>`. Public URL = `R2_PUBLIC_URL/<key>`, stored **absolute** in `product.image_urls` / `store.logo_url` / `store.cover_url`. The browser PUTs directly. Removing a photo only unlinks it; the object stays. |
| **R2 backup bucket** | PARTIAL | `.github/workflows/backup.yml` (02:00 Phnom Penh, `pg_dump` 17, custom format, `--no-owner`, grants kept) uploads with the AWS CLI. It skips until its secrets exist (`docs/BACKUPS.md`). |
| **Sentry** | WIRED, env-gated | Backend `sentry_sdk.init` (errors only); frontend `@sentry/react`. |
| **Maps** | WIRED (frontend only) | Leaflet + OpenStreetMap tiles in `MapPicker.tsx` (no key). Once pinned, checkout shows a small still map (`MapPreview.tsx`, lazy, tap = Change) and fills the address box from the pin with OpenStreetMap's free address lookup, Nominatim reverse (`lookUpAddress.ts`, no key, in the page's language; road, village, sangkat, khan, province; no shop names, postcode or country). `ShopCheckout.pinLocation` fills only an empty box or one still holding an earlier pin's words, never the customer's typing, and clears untouched pin words when the pin is removed; a failed lookup leaves the box as it was. Nominatim allows about one lookup a second for the whole app; move to a paid geocoder if that's ever hit. The seller opens the pin in Google Maps by URL. |
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
  `image_urls` (or the store's `logo_url` / `cover_url`) and the backend only checks the
  URL prefix. It doesn't check the object exists in R2.
- **§6.2 orders "filter by status, date range":** the API supports both;
  the dashboard only uses status.
- **§5.2 `customer.telegram_user_id`:** the column exists and nothing ever
  writes it.
- **§5 data model:** `store_old_slug` (a shop's earlier links, 2026-10-15)
  isn't in 02 yet.
- **§13 rate limiting** names login and storefront; the code also limits
  register (5/min) and refresh (30/min). Logout is unlimited.
- **Brand:** 01 §1.1 names the product Oak Order (renamed from Sroul Order
  2026-10-08). The start page (`pages/Home.tsx`, "Oak Order" in big
  letters), `BrandMark` in `pages/AuthLayout.tsx` (`OakOrderName` from
  `components/OakMark.tsx`: the name with the acorn's cap pressed onto
  the O, drawn from Kantumruy Pro Bold's own O; founder's picks
  2026-10-15, replacing the stand-in hexagon leaf), `public/favicon.svg`
  (the acorn alone, navy, light blue on a dark tab), and
  `index.html` (title, `apple-mobile-web-app-title`, so also the generic
  preview card), the FastAPI title and the nightly backup files
  (`oak-order-<date>.dump`) say Oak Order. Still "social-commerce": the repo,
  Render, the backup bucket (`social-commerce-backups`) and dev container
  names (left on purpose: links and the keep-awake ping depend on them,
  and R2 can't rename a bucket).

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
  absolute URLs in `product.image_urls` / `store.logo_url` / `store.cover_url` must be
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
