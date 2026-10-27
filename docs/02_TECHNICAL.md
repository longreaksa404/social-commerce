# Social Commerce SaaS — Technical Design

> **Status:** Draft — derived from `01_PRODUCT.md`
>
> This document defines **HOW** the system works technically: architecture, stack, data model, APIs, integrations, and infrastructure.
>
> Product scope, business rationale, and MVP boundaries belong in `01_PRODUCT.md`.
> Task breakdown and timeline belong in `03_DEVELOPMENT.md`.
>
> Decisions here follow the constraints set in `01_PRODUCT.md` §2.3: low infra complexity, low operating cost, fast validation, solo/part-time maintainability.

---

# 1. Architecture Overview

## 1.1 Guiding Principle

Build a **modular monolith**, not microservices. `01_PRODUCT.md` §28 explicitly defers Kubernetes, Kafka, multiple databases, and complex event-driven architecture. One deployable backend, one deployable frontend, one database — until real load or real requirements justify otherwise.

## 1.2 High-Level Diagram

```
                    ┌─────────────────────┐
                    │   React SPA (Vite)   │
                    │  Seller Dashboard    │
                    │  Customer Storefront │
                    └──────────┬───────────┘
                               │ HTTPS / REST (JSON)
                               ▼
                    ┌─────────────────────┐
                    │   FastAPI Backend    │
                    │  (single service)    │
                    │  ─────────────────   │
                    │  Auth                │
                    │  Stores/Products     │
                    │  Orders              │
                    │  Payments            │
                    │  Delivery            │
                    │  Notifications       │
                    │  Link Tracking       │
                    └──────────┬───────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
   ┌───────────────┐  ┌────────────────┐  ┌─────────────────┐
   │  PostgreSQL    │  │  Object Storage │  │  Telegram Bot    │
   │  (single DB,   │  │  (product       │  │  API (webhook)   │
   │  tenant_id on  │  │  images)        │  │                  │
   │  every table)  │  └────────────────┘  └─────────────────┘
   └───────────────┘
```

## 1.3 Deployment Units

| Unit | Description |
|---|---|
| `api` | FastAPI backend, serves REST API + Telegram webhook endpoint |
| `web` | React SPA, static build served via CDN/static host; on `/shop/*` the host runs `frontend/linkPreview.ts`, which gives preview bots the page's title, description and photo (link previews, §9.3): a Cloudflare Pages Function (`frontend/functions/shop/[[path]].ts`) and, until the move to Cloudflare Pages (2026-10-14), Vercel Routing Middleware (`frontend/middleware.ts`) |
| `db` | Single PostgreSQL instance (managed) |
| `storage` | Object storage bucket for product images |
| `worker` (later) | Background jobs (notifications, link analytics rollups) — deferred until needed; run as FastAPI `BackgroundTasks` in MVP instead of a separate worker process |

No separate worker service in the MVP. No message queue in the MVP. `BackgroundTasks` (built into FastAPI) is sufficient for sending a Telegram notification or writing a link-tracking event after a response is returned.

---

# 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | **FastAPI** (Python 3.12) | Fast to build, strong typing via Pydantic, async support, good solo-dev velocity |
| ORM | **SQLAlchemy 2.0** (async) + **Alembic** for migrations | Standard, mature, works cleanly with multi-tenant row-level patterns |
| Validation | **Pydantic v2** | Comes with FastAPI, request/response schemas double as API contracts |
| Frontend | **React** + **Vite** + **TypeScript** | Fast dev loop, typed, large ecosystem |
| Styling | **Tailwind CSS** | Fast to build simple, consistent seller/customer UI without a design system overhead |
| State/data fetching | **TanStack Query (React Query)** | Handles server state, caching, and loading/error states with minimal boilerplate |
| Routing | **React Router** | Standard for SPA |
| Languages | Own typed messages, no library (`frontend/src/i18n`, Phase 9) | Khmer / English: each text is an `{ en, km }` pair, and the build fails if one is missing; Khmer by default, chosen per device. API errors stay English and are translated on the frontend by message, then code |
| Light / dark | Tailwind color scales flipped in `index.css` (Phase 9) | Follows the phone; sellers have Auto / Light / Dark in Settings and customers a light / dark button in the shop header, both per device; classes are written for light mode only, plus a few fixed tokens (`bg-surface`, `bg-accent`, …) for fills that must not flip |
| Fonts | **Kantumruy Pro** for all text, Khmer and Latin (`@fontsource-variable`, self-hosted, two variable files picked by `unicode-range`) | One look for Khmer, English and prices on every phone; Khmer 57 KB + Latin 33 KB, each loaded once (Khmer 2026-10-04, Latin 2026-10-06) |
| Motion | CSS keyframes (`index.css`) and the Web Animations API, no library | Taps get an answer (add to cart, order placed, a status moving on) without adding weight; off when the phone asks for reduced motion |
| Database | **PostgreSQL 16** | Relational integrity for orders/payments/inventory; JSONB available for flexible fields (e.g., variant attributes) without needing a second database |
| Auth | **JWT (access + refresh)**, `bcrypt` (used directly; passlib is unmaintained) for passwords; sign-up with a phone number proved through the Telegram bot; "Log in with Telegram" for shop owners (the same phone check, 2026-10-24); "Continue with Google" (ID token checked with PyJWT against Google's keys); "Continue with Facebook" (redirect with a one-time code, traded by the API with the app's secret; built, off until Meta's business verification) (decided 2026-10-09; TikTok's login removed 2026-10-27 after TikTok turned the app down) | Stateless, simple, no session-store dependency; the phone check is free (no SMS) and Google needs no secret |
| Image storage | **S3-compatible object storage** (see §11) | Decoupled from app servers, cheap, standard presigned-upload pattern |
| Background tasks | **FastAPI `BackgroundTasks`** (MVP) → Celery/RQ only if volume demands it later | Avoids running a queue + worker for MVP scale |
| Telegram | Bot API called directly with **httpx** (webhook mode) | One message type and one command don't need a bot framework (decided 2026-10-03, instead of python-telegram-bot) |
| Payments | KHQR via **Bakong API** (see §10), COD (no integration), manual bank transfer (manual confirmation, no integration) | Matches validated MVP payment scope from `01_PRODUCT.md` §25 |

---

# 3. Hosting & Infrastructure Recommendation

Given the constraint of a solo, part-time founder (`01_PRODUCT.md` §2.3, §38.8), the priority is **minimum operational surface area**, not lowest possible cost or maximum control.

**Recommendation: Managed platform, not a raw VPS.**

| Component | Recommendation | Reasoning |
|---|---|---|
| Backend hosting | **Render** (Docker deploy of FastAPI; free web service, Singapore, for the MVP; stays free for the first seller, decided 2026-10-04; a free cron-job.org call to `/health` every 10 minutes keeps it awake from 7:00 to midnight Phnom Penh time, decided 2026-10-08, so only a visit after midnight following 15 quiet minutes waits up to a minute, and the app says so; Starter ($7/month) once the seller is earning or another free Render service is added) | Git-push deploys, managed TLS, no server patching, environment variables UI, built-in logs |
| Database | **Neon** (free plan, Singapore region) for the MVP; Render Postgres is the upgrade path if Neon's limits are hit | No manual DB ops, branching useful for staging; Render's free Postgres expires after 30 days |
| Frontend hosting | **Cloudflare Pages** (static React build; decided 2026-10-14, founder's pick 6A). The app runs on Vercel's free Hobby plan until the move, which happens before the first seller pays Oak Order | Vercel's Hobby plan is for non-commercial use only and Pro costs $20/month; Cloudflare Pages' free plan has no such rule (check its terms when moving), and the domain, DNS and photos are already on Cloudflare. Preview deployments and rollbacks as on Vercel. The link-preview code (`frontend/middleware.ts`, §9.3) moves to a Pages Function |
| Object storage | **Cloudflare R2** or **AWS S3** | R2 has no egress fees, which matters once product images are viewed at volume by customers in Cambodia |
| Domain/DNS | **Cloudflare**: oaksolve.com, bought through Cloudflare Registrar 2026-10-09 (auto-renew on). `order.oaksolve.com` → Vercel (the app and every shop link), `api.oaksolve.com` → Render, `images.oaksolve.com` → the R2 bucket; `oaksolve.com` forwards to `order.` | Free DNS, at-cost domain. The Vercel and Render records are DNS only (grey cloud): both make their own HTTPS certificates and edge, and rate limits read `CF-Connecting-IP` from Render's own Cloudflare edge. App and API on one site (oaksolve.com) lets the refresh token live in an httpOnly cookie |
| Telegram webhook | Hosted on the same FastAPI service (`api`), no separate infra | One less moving part |

A VPS (DigitalOcean/Hetzner) is **not recommended** for the MVP: it trades a small cost saving for meaningful ongoing operational burden (patching, TLS renewal, process supervision, backups) that directly works against the founder's time constraint. Revisit VPS/self-hosting only if managed-platform costs become material at scale — this is a "build later" decision per the `01_PRODUCT.md` §44 decision framework, not a day-one one.

**Estimated MVP infra cost:** roughly $0–25/month at low traffic (most of the above have functional free tiers), scaling gradually with usage — consistent with the "low operating cost" constraint. Once sellers pay (2026-10-14): about $8/month (Render Starter $7, the domain ~$10/year; Neon, R2 and Cloudflare Pages free), where staying on Vercel would add $20/month for Pro. Collecting by hand adds nothing; cron-job.org (free) also calls the daily billing run.

---

# 4. Multi-Tenancy Model

## 4.1 Approach

**Shared database, shared schema, row-level isolation via `tenant_id`.**

Rejected alternatives and why:
- *Separate database per tenant* — operationally heavy (migrations × N tenants), contradicts "architecture should not require separate infrastructure for each seller" (`01_PRODUCT.md` §21).
- *Separate schema per tenant* — still requires per-tenant migration management; unnecessary complexity at this scale.

## 4.2 Enforcement

- Every tenant-owned table has a non-nullable `tenant_id` (= `store.id` or a dedicated `seller.id`, see §5).
- All queries go through a repository/service layer that **always** filters by `tenant_id` from the authenticated session — never trust a `tenant_id` passed in a request body.
- Postgres **Row-Level Security (RLS)** is applied as a second line of defense: policies restrict rows to the `tenant_id` set in the session context (`SET LOCAL app.tenant_id = ...` per request). This protects against an application-layer bug that forgets to filter.
- Seller requests run as the non-login role `app_user` (`SET LOCAL ROLE` per transaction). Public storefront requests do too, scoped to the store named in the URL; only the lookup of that store by its slug runs as the table owner. Migrations, auth and that lookup are not restricted by RLS, so that code filters explicitly.
- Database indexes are composite, leading with `tenant_id` (e.g., `(tenant_id, id)`, `(tenant_id, status)`), so isolation doesn't cost query performance.

## 4.3 Seller Identity vs. Store

A `seller` (the account that logs in) owns one `store` in the MVP (1:1). The schema still models them as separate entities so a future "one seller, multiple stores" case doesn't require a migration — but the MVP UI and business logic assume 1:1.

**Staff logins (decided 2026-10-08):** an owner owns one store; staff logins belong to one store (`seller.role = staff`, `seller.store_id`) and can do everything except Settings. The owner adds them with a phone number (their login since 2026-10-09; typed by the owner, not checked in Telegram) and a first password (nothing is sent), sets a new password for them, and removes them. The access token carries the role; Settings endpoints refuse staff (403 `OWNER_ONLY`).

---

# 5. Data Model

## 5.1 Core Entities (MVP)

```
seller (owner)
 ├─ seller_login (Google, Facebook)
 └─ store (1:1 in MVP)
     ├─ seller (staff logins, role staff)
     ├─ category
     ├─ product
     │   └─ product_variant
     ├─ sale (products on sale, 2026-10-24)
     ├─ customer
     ├─ order
     │   ├─ order_item
     │   ├─ payment
     │   └─ delivery
     ├─ shareable_link
     │   └─ link_event (view/order tracking)
     └─ notification_log
```

## 5.2 Table Definitions

### `seller`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| phone | text, unique, nullable | the login (2026-10-09): a number proved in Telegram (staff: typed by the owner), normalized; null only for accounts from before 2026-10-09 |
| email | text, unique, nullable | accounts from before 2026-10-09 log in with it |
| password_hash | text, nullable | null for an account made with Google until it adds one |
| full_name | text | |
| created_at | timestamptz | |
| is_active | bool | default true; false once the shop is closed (the shop page and logins stop) |
| role | enum(`owner`,`staff`) | default `owner` (2026-10-08) |
| store_id | UUID FK → store, nullable | staff only: the store they work in; deleted with it. CHECK `(role = 'staff') = (store_id IS NOT NULL)` (2026-10-08) |

### `store` (tenant root)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | **this is the `tenant_id` used everywhere below** |
| seller_id | UUID FK → seller | |
| name | text | |
| slug | text, unique | used in shareable URLs, e.g. `/shop/{slug}`; a 6-character code made at sign-up, not changeable (2026-10-18) |
| description | text, nullable | |
| logo_url | text, nullable | the shop's logo, uploaded with `POST /seller/store/logo` (Phase 9); shown in the shop and dashboard headers |
| cover_url | text, nullable | the shop's cover photo, 3:1, uploaded with `POST /seller/store/cover`: across the top of the shop's grid pages with the logo over its bottom edge, and the shop's large link card (founder's picks 3A, 4A; 2026-10-15) |
| color | enum(`navy`,`teal`,`forest`,`olive`,`coffee`,`wine`,`plum`,`charcoal`, and the light `pink`,`sky`,`mint`,`peach`,`lilac`,`sand`) | default `navy`; the light ones have dark words on their buttons (2026-10-15); the shop's colour for customers: everything navy in the shop takes it (buttons, the chosen tab, links, the wash at the top). Each has a light and a dark scale; the seller's dashboard takes it too (founder, 2026-10-15) (founder's picks 1A, 2A; 2026-10-15) |
| telegram_chat_id | text, nullable | for seller notifications; private, never shown on the shop |
| telegram_username | text, nullable | the seller's own Telegram username (without @), public on the shop page for "Ask seller" |
| contact_phone | text, nullable | a number customers can call, stored like customers' phones (`012345678`); public (2026-10-08) |
| messenger_username | text, nullable | a Facebook page's username or number, for a Messenger button (`m.me/<it>`); public (2026-10-08) |
| instagram_username | text, nullable | an Instagram username, for an Instagram button (`ig.me/m/<it>`); public (2026-10-24) |
| payment_config | JSONB | which methods are on, with their details: `{"cod": {"enabled": true}, "bank_transfer": {"enabled", "bank_name", "account_name", "account_number"}, "khqr": {"enabled", "bakong_account_id", "merchant_name", "account_information", "acquiring_bank"}}` (the last two for banks like ABA whose customers share the bank's Bakong ID, 2026-10-14). A method can only be on with its details filled in; at least one must be on. Bank transfer is never on since 2026-10-24 (§10.2); its details stay for orders placed with it before. Missing parts read as the defaults (cash on delivery on, the others off), so a new store takes cash on delivery. Details are kept while a method is off. |
| delivery_config | JSONB | `{"fee", "free_from_amount", "free_from_items", "own_delivery": {"enabled"}, "couriers": ["J&T Express", ...], "pickup": {"enabled", "address"}}`. One fee for any delivery (own or courier); free from an amount (items before discount) or a number of units; pickup free. At least one of own delivery, a courier, or pickup. Missing parts read as the defaults (own delivery on, free), so a new store can take orders at once. A new store starts with `{"fee": "2.00"}` (8000.00 for riel, following a currency change until delivery is saved; decided 2026-10-18); stores from before keep `{}`, free. |
| discount_config | JSONB | `{"rules": [{"min_subtotal", "amount_off"}]}`, up to 5; the biggest rule the items reach applies, never more than the items |
| order_confirmation_mode | enum(`automatic`,`manual`) | default `manual` |
| currency | enum(`USD`,`KHR`) | default `USD`; currency all prices in the store are shown in |
| orders_paused | bool | default false; not taking orders for a while: the shop can be browsed, checkout is refused (2026-10-08) |
| orders_resume_on | date, nullable | the first day orders open again (Phnom Penh), by themselves; null: until the seller turns them back on (2026-10-08) |
| low_stock_alert | int | default 5; an order leaving this many or fewer alerts the seller (bell, Telegram). Customers' "Only N left" stays at 5 (2026-10-08) |
| paid_until | date NULL | the last day the shop is covered (Phnom Penh): null while the shop is in setup (no orders); opening the shop sets the end of the 30-day free trial (2026-10-16; before that, sign-up did), each `plan_payment` moves it on (one made in setup opens the shop from that day, with no trial). From it: reminders in its last 6 days, 7 days to pay after it, then no new orders (§6.2 Plan; 01 §33.1; 2026-10-14). Shops that existed when it shipped got 30 days from that day |
| created_at | timestamptz | |

### `category`
| id, store_id (FK), name, slug, created_at |

### `product`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| store_id | UUID FK | tenant scope |
| category_id | UUID FK, nullable | |
| name | text | |
| slug | text | unique per store |
| description | text, nullable | |
| price | numeric(12,2) | base price |
| image_urls | JSONB (array of text) | |
| status | enum(`active`,`inactive`) | |
| has_variants | bool | |
| stock_quantity | int, nullable | used only when `has_variants = false` |
| created_at / updated_at | timestamptz | |

### `product_variant`
| id, store_id (FK, tenant scope), product_id (FK), name (e.g. "Red / L"), sku (nullable), price_override (nullable), stock_quantity (int), created_at |

### `sale` (2026-10-24)
| id, store_id (FK, tenant scope, RLS), name (nullable), percent_off (int 1–90) **or** amount_off (numeric(12,2) > 0), product_ids (JSONB list of the store's product ids), ends_on (date, nullable: the last day, Phnom Penh; null until removed), created_at |

A product's price today is the lowest of its price and each active sale's price for it (percent: riel rounded to the nearest 100, dollars to the cent; amount: never below 0). Checkout, the shop and the seller's chat orders all use it; bill discounts count on the sale prices.

### `customer`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| store_id | UUID FK | tenant scope — a customer record is per-store, not global, in MVP (guest checkout; see §5.4) |
| name | text | as typed at their latest order |
| phone | text | primary identifier for guest customers; stored normalized (`012 345 678` and `+855 12 345 678` both become `012345678`); unique per store `(store_id, phone)` |
| address | text, nullable | their latest delivery address (each order keeps its own) |
| telegram_user_id | text, nullable | if they contacted via Telegram |
| created_at | timestamptz | |

### `order`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| store_id | UUID FK | tenant scope |
| number | int, unique per store | #1001, #1002, … per store: what sellers and customers say in chat. The id stays the real key and is what the tracking link uses |
| customer_id | UUID FK | |
| status | enum: `pending, accepted, processing, ready, shipped, delivered, completed, cancelled, rejected` | see §7.1 |
| currency | enum(`USD`,`KHR`) | the store's currency when the order was placed, so changing the store's currency later doesn't relabel old totals |
| subtotal | numeric(12,2) | |
| discount | numeric(12,2), default 0 | the shop's bill discount (`store.discount_config`) |
| delivery_fee | numeric(12,2), default 0 | |
| total | numeric(12,2) | subtotal − discount + delivery_fee |
| delivery_address | text, nullable | null if pickup; a delivery has this, the GPS location, or both |
| delivery_lat / delivery_lng | numeric(9,6), nullable | the pin the customer placed on the checkout map, both or neither; the seller opens it in Google Maps |
| delivery_address_note | text, nullable | for the driver, e.g. "blue gate, next to the pagoda" |
| delivery_method | enum(`seller_delivery`,`pickup`) | |
| source | text, nullable | e.g. `tiktok`, from link tracking (§9); `chat` for an order the seller added (2026-10-09) |
| notes | text, nullable | |
| created_at / updated_at | timestamptz | |

### `order_item`
| id, store_id (FK, tenant scope, copied from the order so RLS covers items directly), order_id (FK), product_id (FK), variant_id (FK, nullable, ON DELETE SET NULL), product_name_snapshot, variant_name_snapshot, unit_price_snapshot, quantity, line_total |

> Snapshots are stored because product name/price may change after the order is placed — orders must reflect what was actually purchased. Variants removed from a product are deleted; an order line then keeps its snapshots and loses only the link (`variant_id` becomes null).

### `payment`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| store_id | UUID FK | tenant scope, copied from the order so RLS covers payments directly |
| order_id | UUID FK, unique | 1:1 with order in MVP; created with the order at checkout |
| method | enum(`cod`,`khqr`,`bank_transfer`) | chosen by the customer at checkout, from the methods the store has on |
| status | enum(`pending`,`paid`,`failed`,`refunded`) | see §7.2 |
| amount | numeric(12,2) | the order total, in the order's currency |
| reference | text, nullable | the seller's note when recording it, e.g. "ABA, 2:05 PM, last digits 123" |
| paid_at | timestamptz, nullable | |
| created_at | timestamptz | |

### `delivery`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| store_id | UUID FK | tenant scope, copied from the order so RLS covers deliveries directly |
| order_id | UUID FK, unique | 1:1 with order; created with it at checkout |
| status | enum(`not_assigned`,`assigned`,`picked_up`,`in_transit`,`delivered`,`failed`) | see §7.3 |
| method | enum(`seller_delivery`,`pickup`) | |
| courier | text, nullable | the courier the customer would like ("VET Express"), optional at checkout, then the one the seller sends with; null = the shop chooses or its own driver (decided 2026-10-18), and null for pickup |
| assignee_note | text, nullable | the seller's note, e.g. "Sokha, 012 999 888" or "VET Takeo branch, no. 123456" — no courier integration in MVP |
| created_at / updated_at | timestamptz | |

### `shareable_link`
| id, store_id (FK), target_type (`store`,`product`,`category`), target_id (nullable for store links; no foreign key, as it points at a product or a category), token (8 lowercase letters/digits, unique), source (where it's posted, e.g. `tiktok`), campaign (nullable; the seller's own name for it, e.g. "Video 3 Oct"), created_at |

### `link_event`
| id, store_id (FK; for RLS, like the other tenant tables), link_id (FK), event_type (`view`,`order`), order_id (nullable FK, unique: an order counts for one link at most), created_at |

> Kept deliberately minimal per `01_PRODUCT.md` §20.1 — "advanced marketing analytics are not required for the first MVP." This just supports counting views/orders per link/source.

### `notification_log`
| id, store_id (FK), channel (`web`,`telegram`), event_type (`new_order`, `low_stock`, `payment_claimed`), payload (JSONB), sent_at, status (`sent`,`failed`), read_at (nullable; web only: when the seller opened the list with it in; null = unread) |

### `refresh_token`
| id (= the JWT's jti), seller_id (FK), expires_at, revoked_at (nullable), created_at |

> Each refresh token is swapped once. Shown again within 60 seconds it gets a new pair (a retry after the answer was lost); later, reusing it ends all of that seller's sessions (§13). Logging out deletes the row.

### `seller_login` (2026-10-09)
| id, seller_id (FK, cascade), provider (`google`, `facebook`; `tiktok` rows from before 2026-10-27 may remain, unused), provider_user_id (Google's `sub`, Facebook's id), email (the provider's, when verified), name (the provider's), created_at |

> Unique (provider, provider_user_id) and (seller_id, provider). Not tenant data: no RLS grant. TikTok's login went on 2026-10-27: its rows (only test accounts, as TikTok never approved the app) no longer log in or show in Settings; whether to delete them is open (04).

### `phone_check` (2026-10-09)
| id (the page's secret), code (in the `t.me` link), telegram_user_id, phone (normalized, once shared), telegram_name (a seller's Telegram name, sent with the number; the new seller's name, 2026-10-18; also a customer's at login), verified_at, expires_at (30 min), cart (JSONB, a customer's login only: `{store_id, lines}`, the shop and cart being checked out, 2026-10-20), created_at |

> A phone number being proved through the bot (§12.4); used once by the form that needs it, or read by checkout for a customer's "Continue with Telegram" (§12.6). Not tenant data: no RLS grant.

### `plan_payment` (2026-10-14)
| id, store_id (FK, tenant scope), period (`month`, `year`), amount (numeric(12,2), US dollars: $9.99 a month, $99 a year unless the founder records another amount), method (`manual`: KHQR or transfer to Oak's account), status (`pending`: the seller said "I've paid"; `paid`; `failed`: the founder didn't find it), failure (nullable; the founder's note to the seller), reference (nullable; the founder's own note), paid_on (date), covers_from / covers_until (dates, both included; the three set once paid), created_at |

> One payment a shop made, or says it made, to Oak Order (01 §33.1). Once paid it sets `store.paid_until` to `covers_until`. A payment carries on from the day after `paid_until`; once the shop has stopped taking orders, from the day it's paid. Only the founder marks one paid (§6.2 Admin). RLS like every tenant table, but `app_user` may only SELECT: billing writes the seller's "I've paid" on its own session. The ABA PayWay version (transactions, saved tokens) is parked on the `payway` branch.

## 5.3 Entity-Relationship Summary

```
seller 1───1 store
seller 1───N refresh_token
seller 1───N seller_login
store 1───N category
store 1───N product ──N product_variant
store 1───N customer
store 1───N order ──N order_item
order 1───1 payment
order 1───1 delivery
store 1───N shareable_link ──N link_event
store 1───N notification_log
store 1───N plan_payment
```

## 5.4 Guest Checkout Decision

**Decided (2026-10-02): guest checkout for MVP, no customer login.**

- `customer` records are created/matched by `(store_id, phone)` at checkout time — no password, no account.
- This avoids building an entire customer auth system before validating whether customers even want to leave the chat app to order (Critical Assumption 2, `01_PRODUCT.md` §35).
- Order tracking (§8) uses a token-based lookup (order ID + phone), not login.
- Chosen because `01_PRODUCT.md` §24 notes that "reducing checkout friction is important." Customer accounts remain a post-MVP option (§14).

---

# 6. API Design

## 6.1 Conventions

- REST, JSON, versioned under `/api/v1/`.
- Seller-facing endpoints require `Authorization: Bearer <JWT>`, scoped to their `store_id` (derived from the token, never from the URL/body).
- Customer-facing (storefront) endpoints are public but scoped by `store_slug` in the path.
- Pydantic schemas define request/response contracts; auto-generated OpenAPI docs at `/docs` double as living API documentation — no separate API spec to maintain by hand.

## 6.2 Endpoint Groups (MVP)

### Auth
```
POST   /api/v1/auth/register                # shop name, password, phone_check (2026-10-09); name from Telegram, link a code (2026-10-18)
POST   /api/v1/auth/login                   # phone number, or an older account's email; password
POST   /api/v1/auth/telegram                # "Log in with Telegram": an owner's phone_check verified in the bot (2026-10-24)
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/password-reset            # Forgot password? a link to the shop's Telegram chat; same answer for any login
POST   /api/v1/auth/password-reset/confirm    # the link's token + a new password; logs in
POST   /api/v1/auth/phone-checks              # start proving a phone number in Telegram (§12.4)
GET    /api/v1/auth/phone-checks/{id}         # read until it has the number
POST   /api/v1/auth/google                    # Google's ID token: logged in, or a sign-up to finish
POST   /api/v1/auth/oauth/facebook          # the code from /auth/facebook/callback: logged in, or a sign-up to finish (TikTok's removed 2026-10-27)
POST   /api/v1/auth/social/register           # finish it: shop name, phone_check; no password
```

### Seller — Account and staff (2026-10-08)
```
GET    /api/v1/seller/account                 # the logged-in person's name, phone, email (older accounts), role, password and Google status
PATCH  /api/v1/seller/account                 # name only
POST   /api/v1/seller/account/phone           # a new login number, from a phone check
POST   /api/v1/seller/account/google          # log in with this Google account too
POST   /api/v1/seller/account/oauth/facebook          # or this Facebook account
POST   /api/v1/seller/account/password        # needs the current one if there is one; logs out other phones
POST   /api/v1/seller/account/close-shop      # owner; password, if the account has one; link and logins stop, nothing erased
GET    /api/v1/seller/staff                   # owner only, like everything under Settings
POST   /api/v1/seller/staff                   # name, phone (their login), first password
PATCH  /api/v1/seller/staff/{id}              # name, phone (2026-10-24)
POST   /api/v1/seller/staff/{id}/password
DELETE /api/v1/seller/staff/{id}
```

### Seller — Store
```
GET    /api/v1/seller/store
PATCH  /api/v1/seller/store                   # owner only; takes logo_url / cover_url only from the uploads below; null removes each
POST   /api/v1/seller/store/logo              # presigned logo upload, see §11
POST   /api/v1/seller/store/cover             # presigned cover photo upload, see §11 (2026-10-15)
POST   /api/v1/seller/store/telegram/link     # signed t.me/<bot>?start=<code> link, 30 min
DELETE /api/v1/seller/store/telegram          # disconnect the seller's chat
```

### Seller — Plan (2026-10-14)
```
GET    /api/v1/seller/plan                    # the shop's plan with Oak Order: stage, free trial or not, paid-until date, prices, payments; staff may read it
POST   /api/v1/seller/plan/open               # owner; opens a shop in setup: its 30-day free trial starts today
```

Stages from `store.paid_until` (01 §33.1): `setup` (none yet: until the owner opens the shop; customers see "Opening soon" (`opening_soon`), checkout answers 409 `ORDERS_PAUSED` and an order from a chat 409 `SHOP_NOT_OPEN`; 2026-10-16); `active`; `ending_soon` (its last 6 days; the dashboard reminds the seller); `overdue` (1–7 days after; orders still come); `stopped` (from the 8th day). A stopped shop shows customers the paused notice with no reopening day, checkout answers 409 `ORDERS_PAUSED` (nothing about payment) and an order from a chat 409 `PLAN_UNPAID`; orders already placed carry on. Paying Oak Order by hand (founder, 2026-10-14; ABA PayWay later, parked on the `payway` branch):

```
POST   /api/v1/seller/plan/paid                # owner; {period}: "I've paid": a pending payment, a Telegram alert to the founder
POST   /api/v1/billing/run                     # cron-job.org, daily, X-Cron-Secret: payment reminders (day 1 and day 5)
POST   /api/v1/reminders/run                   # cron-job.org, hourly, X-Cron-Secret: customers' payment reminders (§12.2)
```

`GET /seller/plan` also gives the shop's code ("OAK-K7Q2MX", from the store id; the KHQR's bill number and the transfer's note), Oak's KHQR for a month and a year and/or bank account (`OAK_*` settings), and a waiting "I've paid". The daily run sends Telegram reminders (Khmer) on day 1 and day 5 after the paid time ends ("pay by hand; new orders stop on day 8"), once each, to shops with Telegram and no waiting "I've paid"; the others see the Orders tab's banner.

### Admin (the founder's page, 2026-10-14)
```
GET    /api/v1/admin/shops                     # every shop's plan: code, stage, paid until, a waiting "I've paid"
GET    /api/v1/admin/shops/{store_id}          # the same, with every payment
POST   /api/v1/admin/shops/{store_id}/payments # mark paid by hand: {period, amount (0 = free time), note}
POST   /api/v1/admin/shops/{store_id}/payments/{id}/confirm   # the seller's "I've paid", found: paid
POST   /api/v1/admin/shops/{store_id}/payments/{id}/reject    # not found: {note} the seller sees
```

Only for a login whose phone number is in `ADMIN_PHONES` (checked in the database on each request), else 403 `ADMIN_ONLY`. The only endpoints that read across shops, on an unscoped session.

### Seller — Products
```
GET    /api/v1/seller/products
POST   /api/v1/seller/products
GET    /api/v1/seller/products/{id}
PATCH  /api/v1/seller/products/{id}
DELETE /api/v1/seller/products/{id}          # soft delete → status=inactive
POST   /api/v1/seller/products/{id}/images   # presigned upload flow, see §11
```

### Seller — Categories
```
GET    /api/v1/seller/categories
POST   /api/v1/seller/categories
PATCH  /api/v1/seller/categories/{id}
DELETE /api/v1/seller/categories/{id}
```

### Seller — Orders
```
GET    /api/v1/seller/orders                 # filter by status, date range
GET    /api/v1/seller/orders/export?first=&last=&lang=   # owner; an Excel file, one row per order (2026-10-08)
GET    /api/v1/seller/orders/{id}
PATCH  /api/v1/seller/orders/{id}/status      # transitions order state, see §7.1
PATCH  /api/v1/seller/orders/{id}/payment     # mark paid/failed
PATCH  /api/v1/seller/orders/{id}/delivery    # update delivery status
POST   /api/v1/seller/orders                  # an order that came by chat, added by the seller at the shop's prices (2026-10-09)
POST   /api/v1/seller/orders/{id}/cash-handover   # "Delivered, cash received": delivery delivered + payment paid, both or neither (§7.3)
POST   /api/v1/seller/orders/{id}/telegram-message # "Message on Telegram": the bot sends the seller's words to a customer who gets updates there (§12.2)
GET    /api/v1/seller/stats?period=today|week|month   # owner; sales and orders, for a seller dashboard (not shown in the app yet)
```

### Seller — Customers
```
GET    /api/v1/seller/customers               # whoever ordered last first; ?q= part of a name or phone
GET    /api/v1/seller/customers/{id}          # includes order history (latest 100)
POST   /api/v1/seller/customers/{id}/telegram-message   # "Message on Telegram" from the customer's page (2026-10-24)
```

### Seller — Sales (2026-10-24)
```
GET    /api/v1/seller/sales                   # owner; newest first, ended ones too
POST   /api/v1/seller/sales                   # name?, percent_off or amount_off, product_ids, ends_on?
PUT    /api/v1/seller/sales/{id}
DELETE /api/v1/seller/sales/{id}
```

### Seller — Notifications
```
GET    /api/v1/seller/notifications           # newest first, with the unread count
GET    /api/v1/seller/notifications/unread    # the count on the bell
POST   /api/v1/seller/notifications/read      # marks read up to the newest one shown
```

### Seller — Links
```
GET    /api/v1/seller/links
POST   /api/v1/seller/links                   # generate store/product/category link
GET    /api/v1/seller/links/{id}/stats
```

### Storefront (public, scoped by store slug)
```
GET    /api/v1/shop/{store_slug}
GET    /api/v1/shop/{store_slug}/products
GET    /api/v1/shop/{store_slug}/products/{product_slug}
GET    /api/v1/shop/{store_slug}/categories/{category_slug}
POST   /api/v1/shop/{store_slug}/orders        # create order (guest checkout)
GET    /api/v1/shop/{store_slug}/orders/{order_id}?phone={phone}   # order tracking lookup
POST   /api/v1/shop/{store_slug}/track-view    # a page opened through a link (§9.2)
POST   /api/v1/shop/{store_slug}/orders/{order_id}/paid   # "I've paid" (link + phone): tells the seller; the payment stays pending (2026-10-09)
POST   /api/v1/shop/{store_slug}/telegram-login            # "Continue with Telegram": a check with the cart (§12.6)
GET    /api/v1/shop/{store_slug}/telegram-login/{id}       # read it; the customer token once the phone is shared
POST   /api/v1/shop/{store_slug}/telegram-login/{id}/cart  # the cart as the page leaves for Telegram (sendBeacon)
GET    /api/v1/shop/{store_slug}/me                        # X-Customer-Token: what checkout fills in at this shop
POST   /api/v1/shop/{store_slug}/telegram-login/{id}/mini-app  # inside Telegram, from "Open checkout": initData → the login and the cart
POST   /api/v1/shop/{store_slug}/mini-app-login            # inside Telegram: initData → the login, if this account shared its phone before
```

### Telegram
```
POST   /api/v1/telegram/webhook               # receives bot updates
```

## 6.3 Error Format

Consistent envelope for all errors:
```json
{
  "error": {
    "code": "PRODUCT_OUT_OF_STOCK",
    "message": "This variant is no longer available.",
    "field": null
  }
}
```
Machine-readable `code` lets the frontend branch on specific failures (e.g. stock issues at checkout) without string-matching messages.

---

# 7. State Machines (Technical Implementation)

Matches `01_PRODUCT.md` §29–§31 and Rule 4/Rule 5 (§32): order, payment, and delivery are independent state machines, each stored on its own table, each with its own allowed-transition rules enforced in the service layer (not just in the frontend).

## 7.1 Order State Machine

```
PENDING ──accept──▶ ACCEPTED ──▶ (READY: pickup only) ──▶ COMPLETED
   │                    │
   └──reject──▶ REJECTED └──cancel──▶ CANCELLED
```

- Allowed transitions enforced via a transition table in code. Accept, then Complete (2026-10-24; before, the short path of 2026-10-09 had optional steps between). `*` = only if §7.4 holds:
```python
ALLOWED_ORDER_TRANSITIONS = {
    "pending": {"accepted", "rejected"},
    "accepted": {"ready", "completed*", "cancelled"},   # ready: pickup orders only
    "ready": {"completed*", "cancelled"},
    "processing": {"completed*", "cancelled"},          # retired 2026-10-24
    "shipped": {"completed*"},                          # retired 2026-10-24
    "delivered": {"completed*"},                        # retired 2026-10-24
    "completed": set(),
    "rejected": set(),
    "cancelled": set(),
}
```
- **Fewer steps (2026-10-24):** the order's own processing, shipped and delivered steps were retired (the delivery's status says where the parcel is); orders in them were moved back to accepted. `ready` stays for pickup orders only ("Ready to collect"). The values stay in the enum.
- `order_confirmation_mode` (on `store`) determines whether a new order enters `pending` (manual) or is auto-transitioned to `accepted` immediately (automatic) via the same service function.

## 7.2 Payment State Machine
```
PENDING ──▶ PAID
   │
   └──▶ FAILED

PAID ──▶ PENDING, FAILED ──▶ PENDING   ("Not paid after all", 2026-10-09)
PAID ──▶ REFUNDED   (future; not required for MVP transitions, but schema supports it)
```
- PAID → PENDING and FAILED → PENDING: "Not paid after all" (a wrong tap, or a transfer that never arrived), any time, after a confirm; it clears `paid_at` and the note, and the customer is shown how to pay again (decided 2026-10-09). Every payment starts PENDING, for every method.
- The seller records the payment with `PATCH /seller/orders/{id}/payment` (optionally with a `reference` note); `paid_at` is set when it becomes PAID. Recording a payment never changes the order's status, and changing the order's status never changes the payment's.

## 7.3 Delivery State Machine
```
NOT_ASSIGNED ──▶ ASSIGNED ──▶ PICKED_UP ──▶ IN_TRANSIT ──▶ DELIVERED
                                                  │
                                                  └──▶ FAILED
```
- `seller_delivery` transitions (the steps in between are optional, decided 2026-10-09): not_assigned → assigned | picked_up | in_transit | delivered; assigned → picked_up | in_transit | delivered | failed; picked_up → in_transit | delivered | failed; in_transit → delivered | failed; failed → assigned | delivered.
- `FAILED ──▶ ASSIGNED`: the seller tries again, e.g. nobody was home (decided 2026-10-03); `FAILED ──▶ DELIVERED`: it went through on a second try.
- "Delivered, cash received" (cash on delivery, 2026-10-09) records the delivery delivered and the payment paid in one seller action, each through its own state machine, both or neither; the order's status is not touched.
- For `pickup` delivery method, the flow simplifies: `NOT_ASSIGNED → DELIVERED` (marked by seller when customer collects), skipping the intermediate states.
- The seller moves it with `PATCH /seller/orders/{id}/delivery` (optionally with an `assignee_note`, and when sending a `courier`: one of the shop's couriers, or null for their own driver, whatever the customer picked; decided 2026-10-18). Moving the delivery never changes the order's status, or the other way round.

## 7.4 Cross-State Validity (Rule 4 / Rule 5)

No database constraint forces payment/delivery status to match order status — this is intentional. Valid real-world combinations like `order=shipped, payment=pending` (COD) must remain possible. The only enforced coupling: an order cannot move to `completed` unless `delivery.status = delivered` **and** (`payment.status = paid` **or** `payment.method = cod`) (COD orders complete on delivery regardless of when cash changes hands; the delivery condition was added 2026-10-03) — this single business rule lives in the order-transition service function, not the schema.

**Completes by itself (2026-10-24):** once the delivery is `delivered` **and** the payment is `paid`, recording the last of the two moves the order to `completed` through the same transition function, in the same commit. Cash on delivery therefore waits for the cash to be recorded; the seller can still complete a COD order by hand without it, as above.

## 7.5 Oak Order's Own Billing (2026-10-14)

Separate from the shop's orders: what a shop pays Oak Order (`plan_payment`, 01 §33.1). By hand until ABA PayWay:

```
(seller taps "I've paid") → pending ──(founder: found it)──→ paid      (store.paid_until moves on)
                                     └─(founder: not found)─→ failed    (note to the seller; they can say it again)
(founder marks a payment made by hand) ───────────────────→ paid
```

One pending payment per shop at a time. The shop's own stage (taking orders or not) follows only `store.paid_until` (services/plan.py), never a pending payment.

---

# 8. Order Tracking (Customer-Facing)

Since there's no customer login (§5.4), order tracking uses:
```
GET /api/v1/shop/{store_slug}/orders/{order_id}?phone={phone}
```
- **Decided (2026-10-02): the order link plus the phone used at checkout.** The order ID is in the link given at checkout (or in a Telegram confirmation); the phone is matched however it's typed. A simple shared-secret pattern, not real auth, appropriate for the low-sensitivity data involved (order status, not payment credentials). The device that placed the order remembers the phone, so the customer only types it on another device. A wrong phone gets the same 404 as a missing order.
- **The device's orders (Phase 9, 2026-10-04):** the shop's pages show a bar while an order placed (or opened) on this device is in progress, and `/shop/{store_slug}/orders` lists them with their status; each is read through the endpoint above with the remembered phone (the last 3 of the past 30 days for the bar). The order page checks again every 30 seconds while it's open and the order is in progress.
- Returns order status, items, delivery status, and payment status, plus how to pay while the payment is pending and the order isn't rejected or cancelled (the store's bank account, or a KHQR code; §10). No other customer's orders or details are exposed.

---

# 9. Shareable Links & Tracking

## 9.1 Link Structure

```
/shop/{store_slug}                                → store link
/shop/{store_slug}/product/{product_slug}          → product link
/shop/{store_slug}/category/{category_slug}        → category link
/shop/{store_slug}/orders                          → this device's orders (not a shared link)
```

A seller's link is the page's own address plus `?l=<token>`, e.g. `/shop/dara/product/red-dress?l=k3f9a2x7`. The seller makes one per place they post (decided 2026-10-03): what it opens, where it's posted (`source`), and an optional name (`campaign`), all saved on the `shareable_link` row. Making the same link again returns the existing one. The address is built from the current slugs, so it changes if the seller renames the shop or product.

## 9.2 Tracking Flow

1. Frontend reads the `l` query param on page load.
2. Frontend calls a lightweight `POST /api/v1/shop/{store_slug}/track-view` (fire-and-forget) with `{token}`, once per device per link per 30 minutes (reloads don't count again).
3. Backend writes a `link_event(event_type=view)` row via `BackgroundTasks` (non-blocking). An unknown token, or another shop's, is ignored with the same answer.
4. The device remembers the last link opened per shop for 7 days (localStorage, **not** a database session; decided 2026-10-03). An order placed in that time sends the token: the order gets the link's `source` and a `link_event(event_type=order)` is written in the order's transaction.

This is intentionally simple — no attribution modeling, no multi-touch tracking, consistent with `01_PRODUCT.md` §20.1's explicit scope limit.

## 9.3 Link Previews

Facebook, Messenger, Telegram, TikTok and similar apps build a link's preview card from the HTML without running JavaScript. Code on `/shop/*` (`frontend/linkPreview.ts`, decided 2026-10-03; run by a Cloudflare Pages Function, `frontend/functions/shop/[[path]].ts`, and by Vercel Routing Middleware, `frontend/middleware.ts`, until the move to Cloudflare Pages, 2026-10-14) gives those preview bots `index.html` with `og:` title, description and photo from the storefront API; people pass through untouched, so a slow API never slows a customer. If the API doesn't answer in 6 s (e.g. Render asleep), the bot gets the generic card. The card's own words (e.g. "Order online", a category's product count) are in Khmer, the default language. Preview bots don't run JavaScript, so they never count as views.

**Oak in every card (decided 2026-10-10):** titles end in "· Oak Order" (a product's title also carries its price), and the picture is the shop's logo or the product's photo with Oak's mark (the oak leaf) small in the corner. The API draws those pictures (`GET /api/v1/shop/{slug}/preview/logo` and `/preview/products/{slug}`, Pillow, photos fetched only from our R2 address, 30/min per IP); a shop without a logo gets Oak's plain mark. **A shop with a cover photo (2026-10-15, founder's pick 4A)** gets a large 1200 × 630 card instead: the cover's middle filling it, the logo round in the bottom left, Oak's mark in the bottom right (`/preview/cover`). Every other page, and a shop link while the API is asleep, shows the generic card in `index.html`: Oak's own picture with the leaf, "Oak Order" and the start page's line.

---

# 10. Payment Integration

Matches `01_PRODUCT.md` §25: **COD + KHQR**, no additional providers (manual bank transfer removed 2026-10-24, §10.2).

**Decided (2026-10-02):**
- The customer chooses the method at checkout, from those the store has on (`payment_config`). Only method names are public; account details and the KHQR code come with the order.
- **Payment timing: pay right after ordering.** The order page shows how to pay as soon as the order is placed, before the seller accepts it. If the seller then rejects or cancels an order that was already paid, they refund it themselves.
- **Every payment is confirmed by hand by the seller**, for all three methods.
- Payment details shown are the store's current ones, not a copy from ordering time, and disappear if the seller turns that method off.

## 10.1 Cash on Delivery (COD)
No integration. `payment.status` starts `pending`, seller manually marks `paid` after collecting cash (`PATCH /seller/orders/{id}/payment`). A COD order can be completed without the cash being recorded (§7.4).

## 10.2 Manual Bank Transfer
**Removed 2026-10-24:** no longer offered at checkout or in Settings; `bank_transfer.enabled` is never on. Orders placed with it before still show the stored account while unpaid. What follows is how it worked.

No integration. Store's `payment_config.bank_transfer` holds account details (bank, name on the account, account number), shown to the customer on the order page right after they order, with the amount and a request to put the order number (e.g. "#1001") in the transfer note. Customer transfers manually; seller manually marks `paid` after checking their bank app. `payment.reference` can store a free-text note (e.g., last 4 digits, transfer time) for reconciliation.

## 10.3 KHQR
- NBC's KHQR standard, which all Bakong member banks/wallets (ABA, ACLEDA, Wing, …) can scan and pay.
- **Generated on our own server, without the Bakong API (spike result, 2026-10-02).** A KHQR is an EMVCo QR payload pointing at the seller's Bakong ID, so building one needs no Bakong account, API token, or network call. The store's `payment_config.khqr` holds the seller's Bakong ID (e.g. `name@aclb`, from their bank app) and the name customers see (English letters, max 25). The format follows NBC's KHQR SDK (v2.9); tests pin it to strings the official SDK generated.
- **Filled from the seller's own QR (2026-10-14):** Settings → Payments → "Upload your bank's QR": the seller picks the picture of their bank app's receive-money KHQR; the phone reads it (`frontend/src/lib/readKhqr.ts`, jsQR; nothing is uploaded), checks its checksum, and fills in the Bakong ID (tag 29/00), the account number and bank (29/01, 29/02: ABA gives every customer its own `abaakhppxxx@abaa` plus the account), and the name (59). A QR whose currency (53) isn't the shop's gets a warning: an ABA QR points at the default account, and money in the wrong currency is exchanged. Business (tag 30) QRs aren't taken. The upload is the whole step: the form then shows who customers pay ("SOK DARA · ABA Bank ···2164") with Upload another QR; the four fields show only through "No QR? Type the details instead" / "Edit the details", or when Save finds a problem in them.
- Flow:
  1. When the customer opens the order page (`method=khqr`, payment pending, order not rejected/cancelled), the backend builds a KHQR string for the order total in the order's currency, with the order number as the bill number. A KHQR with an amount must expire: each code works for 24 hours, and the order page makes a fresh one each time it opens. Riel totals with cents get no code (the SDK refuses them too).
  2. Frontend draws the QR code, with a "Save QR code" button: customers usually order on the same phone they pay with, so they save the image and scan it from their gallery in their bank app.
  3. **MVP approach: manual confirmation.** Seller checks their bank app for the incoming transfer and marks the order `paid` manually — same UX as bank transfer, just with a QR code for convenience. This avoids needing Bakong's transaction-verification/webhook API (which requires additional merchant onboarding) before validating the product.
  4. **Post-MVP upgrade path:** integrate Bakong's transaction check/webhook API for automatic payment confirmation once a seller's volume justifies the integration effort — flagged in §14 as a fast-follow, not blocking MVP launch.

- Automatic confirmation (step 4) needs the Bakong Open API: a token from api-bakong.nbc.gov.kh, renewed every 90 days, and its transaction check is reported to work only from servers in Cambodia.
- Opening the customer's bank app with the amount filled in ("one-tap pay") isn't possible for free: each bank's app-to-app payment is its own merchant service. Logged in the Requirements Log (`03_DEVELOPMENT.md` §6) as Validate First.

This mirrors `01_PRODUCT.md` §38.4's guidance: "start with the simplest validated payment workflow."

---

# 11. Image Storage

- Object storage: Cloudflare R2 (or S3-compatible equivalent).
- Upload flow: backend issues a **presigned upload URL** (`POST /seller/products/{id}/images` returns a presigned PUT URL) → frontend uploads the file directly to storage → frontend confirms completion → backend stores the resulting public URL in `product.image_urls`.
- This keeps large file bytes off the FastAPI service entirely (no multipart handling on the app server), which matters for keeping the backend lightweight and cheap to run.
- Basic constraints enforced client-side and re-validated server-side: max 5 images per product, max 5MB per image, JPEG/PNG/WebP only.
- **Shop logo (Phase 9, 2026-10-04):** `POST /seller/store/logo` signs one PUT into `stores/<store_id>/logo/`; the seller's phone first crops the picture to a 256 px square JPEG. `PATCH /seller/store` accepts a `logo_url` only from that store's folder (null removes the logo). Uses the existing `store.logo_url`; no data model change.
- **Shop cover photo (2026-10-15):** `POST /seller/store/cover` signs one PUT into `stores/<store_id>/cover/`; the seller's phone first crops the middle of the picture to 3:1 (1800 × 600 JPEG). `PATCH /seller/store` accepts a `cover_url` only from that store's folder (null removes it). Erasing a shop empties `stores/<store_id>/`, cover included.
- **Small copies (Phase 9, decided 2026-10-04):** the seller's phone also makes a small JPEG copy of each new photo (short side ~480 px, max 512 KB) and uploads it first, next to the photo: the photo is named `<name>-m.<ext>`, the copy `<name>-s.jpg` (the images endpoint takes `thumbnail_size` and signs a second PUT). Product grids, the cart and the seller's lists use the copy when the photo's name ends in `-m`; older photos, and a copy that fails to load, fall back to the photo itself. No data model change.

---

# 12. Telegram Integration

## 12.1 Seller Notifications
```
New Order Created (backend event)
        │
        ▼
 BackgroundTask: format message → call Telegram Bot API
        │
        ▼
 Sent to store.telegram_chat_id
```
- Seller links their Telegram from Settings → "Connect Telegram", which opens `t.me/{bot_username}?start={code}`. The code is signed, not stored (store id + 30-minute expiry + HMAC). Tapping Start sends `/start {code}`; the webhook checks it and saves the chat as `store.telegram_chat_id`. Disconnect clears it; if the seller blocks the bot, the next alert clears it.
- Notification triggers (`01_PRODUCT.md` §19, decided 2026-10-03): only events the seller didn't cause: new order, and low stock (an order takes a product or option to 5 or fewer, or to 0). Cancellation, payment, and delivery changes are the seller's own actions in the MVP. Also (2026-10-09): "the customer says they paid" (I've paid; not again within 30 minutes); an order the seller added from a chat sends only low stock. Every bot message is in Khmer only, the app's default language (2026-10-09; following each seller's language would need a store column). Each alert writes a `notification_log` row (sent / failed) and calls the Bot API; a failed send never affects the order.
- "Received, mark paid" (founder, 2026-10-20): the "says paid" alert has a button that records the payment paid, as the app's Mark paid does (§7.2; the order's status is untouched), after the seller checks their bank app. Telegram sends the tap to the webhook (`callback_query`); it counts only from the order's own shop chat, and not for a rejected or cancelled order or a payment marked failed. The alert then says "Marked paid", and a customer who gets updates hears that the seller received the payment.
- Web notifications (Phase 7): the same events also write a `web` row in `notification_log`, in the order's own transaction, whether or not Telegram is connected. The bell counts rows with `read_at` null; opening the list marks them read up to the newest one shown.

## 12.2 Customer "Ask Seller"
```
Customer taps "Ask seller on Telegram" on the product page
        │
        ▼
 https://t.me/{store.telegram_username}?text=<product name (option) and link>
        │
        ▼
 Customer's Telegram opens a chat with the seller's own account,
 message already typed
        │
        ▼
 Seller replies from their own Telegram (outside the platform)
        │
        ▼
 Customer returns to the product page link to complete checkout
```
- Decided 2026-10-03: the platform's bot isn't involved and nothing is logged; the platform doesn't proxy or store the conversation (`01_PRODUCT.md` §11, §27). No username, no button.
- This keeps the integration to a single webhook endpoint and avoids building a chat-relay system.
- **The other way, "Message on Telegram" (founder, 2026-10-20):** for a customer who gets their order's updates from the bot, the seller's order page can send them a message through it, above all when their phone doesn't answer (a wrong digit, a second SIM). It carries a "Reply to <shop>" button to the shop's own Telegram (`t.me/{store.telegram_username}?text=Order #1001: `), else its Messenger, else the shop's phone in the text. The bot still doesn't relay or store a conversation: a customer typing to it is told to tap the shop's button.
- **Payment reminder (founder, 2026-10-20):** a KHQR or bank order still unpaid 2 hours after it was placed, whose customer gets updates and hasn't tapped "I've paid", gets one reminder from the bot (the amount, a Pay button to the order page). An hourly run (cron-job.org calls `POST /api/v1/reminders/run`, the billing run's secret) finds them; nothing goes out from 22:00 to 7:00 Phnom Penh time. From 24 hours (a KHQR code's life, §10.3) the seller's order and list read "Not paid after 24 h" and, once accepted, Cancel order is its next step, after a look in the bank app. Nothing is cancelled automatically: the order's status never follows the payment's (§7).

## 12.3 Webhook
- Single endpoint: `POST /api/v1/telegram/webhook`, registered with Telegram at startup where `PUBLIC_API_URL` is set (production only, so a laptop never takes the bot over).
- Validates the Telegram secret token header before processing, per Telegram's webhook security guidance.

## 12.4 Phone Check (decided 2026-10-09)
- Sellers prove their phone number through the bot instead of an SMS code (free). The page starts a check and opens `t.me/{bot_username}?start=phone_{code}`; `/start phone_{code}` answers with a "Share my phone number" button (`request_contact`).
- The shared contact counts only if it's the sender's own (`contact.user_id` = the sender); it completes the newest open check that account opened. The page reads the check until it has the number, then hands the check's id in with the form (sign-up, a new login number). A check lasts 30 minutes and works once.
- Signing up connects that chat with the bot to the new shop's alerts (§12.1). One account per number.
- The same check logs a shop owner in ("Log in with Telegram", 2026-10-24, §13). It's the way in that every shop has; Google (and Facebook, once Meta allows it) are shortcuts. TikTok's login went on 2026-10-27, after TikTok turned the app down.

## 12.6 Customers Log In With Telegram (founder, 2026-10-20)
- Optional: checkout's "Continue with Telegram" (outlined, above "or type your details"); customers without Telegram stay guests (§5.4, §8 unchanged).
- Like a seller's phone check (§12.4): checkout makes a check ahead (`login_` code, with the shop and cart in `phone_check.cart`), the customer opens Oak's bot, shares their phone, and the page reads the check until it holds a **customer token** (JWT, type `customer`, 180 days: the Telegram user id, the proved phone, the Telegram name; not stored). The device keeps it for every Oak shop. No password, no profile, no account across shops: each shop still knows its customers by phone, and `GET /shop/{slug}/me` gives that shop's name and address for them.
- An order placed with the token (`X-Customer-Token`) and the proved phone sets the shop's `customer.telegram_user_id` / `telegram_phone`, so the order's news goes to Telegram as after "Get updates on Telegram".
- **Inside Telegram (the mini app):** after the phone is shared the bot sends "✅ Done", then "Finish your order at <shop> here, or go back to the shop page you were on" with **Open checkout**, a `web_app` button to `/shop/{slug}/cart?tg={check id}`. The shop opens inside Telegram (the same pages), sends Telegram's signed `initData` with the check id and gets the login and the cart, only if Telegram says the opener is the account that shared the phone. Opened again later on a phone that forgot the login, `initData` alone logs in a Telegram account that shared its phone before (with this shop, else another Oak shop). Telegram's script loads only inside Telegram; Telegram's back arrow goes back. Shop pages may be framed by `https://web.telegram.org` (Telegram on the web); the rest of the app can't be framed.
- **Like a shop's own bot** (founder, 2026-10-20, from a shop bot's "Go Shopping"): the button beside the message box in the customer's chat with Oak's bot reads "🛍 <shop>" and opens that shop inside Telegram. Oak's bot serves every shop, so it's set per chat (`setChatMenuButton`) when the customer logs in or taps Get updates at a shop: the last one wins.
- **The customer's Telegram photo** (2026-10-20): once their Telegram is linked to a shop's customer, the bot copies their profile photo (if they show it to bots) to R2 (`customer.photo_url`); the seller sees it beside the name on the order and the customer's page. Refreshed on their later orders; forgetting the customer deletes it.
- **OPEN in Telegram's chat list** is the bot's main mini app (one address for everyone, set in BotFather): `/shops`, "Your shops", the Oak shops this Telegram account has ordered from (`POST /api/v1/telegram/my-shops`, by `initData`, or the browser's customer token), latest first; with one, straight into it.
- **Alerts for the customer** (with the updates of 2026-10-15): a receipt when they place an order (what they ordered, the total and way to pay, a Pay button for KHQR and bank), and "Sent" when the seller sends it ("with the driver", or the courier and its tracking number; the driver's own name and phone stay the seller's). Still not sent: preparing, completed, cash received.

## 12.5 Oak Order's Billing Messages (2026-10-14)
- **To the seller, payment reminders:** a daily run (cron-job.org calls `POST /api/v1/billing/run`) sends a Khmer reminder on day 1 and day 5 after a shop's paid time ends ("pay by hand with your code; new orders stop on day 8"), once each per paid-until date (logged as `plan_reminder`), and not while an "I've paid" waits. Telegram is optional (01 §32 Rule 7): shops without it see the reminder on the Orders tab instead.
- **To the founder:** "I've paid" sends the shop's name, code and amount to the Telegram chat of each shop whose owner is in `ADMIN_PHONES` (their own shop's alerts chat), with a button to the admin page.

---

# 13. Auth & Security

- **Passwords:** `bcrypt` (used directly; passlib is unmaintained), never stored/logged in plaintext.
- **Sign-up (2026-10-09):** a phone number proved in Telegram (§12.4), one account per number; login by that number (any spelling) or, for accounts from before, their email.
- **Log in with Telegram (2026-10-24):** a shop owner proves their number in the Telegram bot (the same phone check as sign-up, §12.4) and `POST /auth/telegram` logs them in; a number without a shop gets 404 and keeps its check for sign-up; staff numbers are refused (staff use their password). Owners keep their password.
- **Google, Facebook (2026-10-09):** Google's ID token is checked (signature against Google's keys, audience = our client ID, issuer, expiry). Facebook sends the browser back to `/auth/facebook/callback` with a one-time code and the `state` the tab saved; the API trades the code with the app's secret and `appsecret_proof`, and only for the app's own callback address. Facebook is built and off (no `VITE_FACEBOOK_APP_ID`) until Meta's business verification and App Review. TikTok's login was removed on 2026-10-27 (TikTok turned the app down): no route, no settings, no button; a TikTok sign-up started before can't be finished. Nothing is stored but the account's id and its name and verified email. An account is joined to a shop only from that shop's own Settings, never by a matching phone number or email.
- **Privacy policy, terms, data deletion (2026-10-09):** public pages at `/privacy`, `/terms` and `/data-deletion`, in English and Khmer, which Meta requires; they must stay true to what the code keeps and to how sellers pay (Terms → Fees, 01 §33.1).
- **Tokens:** short-lived access JWT (~15 min) + longer-lived refresh JWT (~7 days), refresh rotated on use; a retry within 60 s of a rotation gets a new pair, later reuse ends every session of that seller. The access token is in the response body and kept in memory only; the refresh token is an httpOnly, Secure, SameSite=Lax cookie on the API's host, path `/api/v1/auth`, so no script can read it (app and API share the site oaksolve.com, 2026-10-09).
- **Tenant isolation:** enforced at both application layer (service functions always scope by `store_id` from the authenticated token) and database layer (Postgres RLS, §4.2) — defense in depth, matching Rule 2 (`01_PRODUCT.md` §32).
- **Rate limiting:** basic IP-based rate limiting on `/auth/login` and public storefront endpoints (e.g., via `slowapi`) to blunt brute-force and scraping — lightweight, no separate infra required. The client IP is taken from `CF-Connecting-IP` (set by Render's Cloudflare edge), not `X-Forwarded-For`, which clients can write and Render keeps (Phase 9 security review).
- **CORS:** locked to the known frontend origin(s).
- **Input validation:** all request bodies validated via Pydantic schemas; no raw SQL string interpolation (SQLAlchemy parameterized queries only).
- **Secrets:** environment variables in the Render and Vercel dashboards, never committed to the repo.
- **Framing:** the web app sends `frame-ancestors 'none'` / `X-Frame-Options: DENY`, so the dashboard can't be loaded inside another site (`frontend/vercel.json`).

---

# 14. Post-MVP Technical Fast-Follows

Not required to launch, but designed for in the schema/architecture so they don't require rework:

- Bakong webhook-based automatic KHQR payment confirmation (§10.3)
- Stock reservation on "add to cart" (currently, decided 2026-10-02: stock is checked and taken when the order is placed, in one statement per line so two checkouts can't oversell, and returned when the order is rejected or cancelled; per `01_PRODUCT.md` §32 Rule 3 — reservation logic is deferred until abandoned-cart overselling is shown to be a real problem)
- Background worker (Celery/RQ) if notification/tracking volume outgrows `BackgroundTasks`
- Delivery-provider API integrations, e.g. booking and tracking with J&T or VET (replacing the hand-typed `courier` choice and `assignee_note`)
- Customer accounts (replacing phone-based guest lookup)

---

# 15. Non-Functional Requirements (MVP-Appropriate)

- **Performance:** no specific SLA needed at MVP scale (single-digit sellers, low order volume). Standard indexing (§4.2) and avoiding N+1 queries is sufficient — no caching layer, no read replicas.
- **Availability:** best-effort; managed platform's default uptime is acceptable. No multi-region, no failover architecture at this stage.
- **Backups:** a nightly `pg_dump` (GitHub Actions, `.github/workflows/backup.yml`) into a private R2 bucket, last 30 nights kept (decided 2026-10-04; $0, no new service). Neon's free plan only goes back 6 hours, which still covers same-day mistakes. Setup and restore: `docs/BACKUPS.md`.
- **Observability:** platform-provided logs (Render dashboard) + Sentry (free tier, errors only) for the FastAPI app and the React app. No custom monitoring stack.

---

# 16. Technical Risks

| Risk | Mitigation |
|---|---|
| Bakong/KHQR API access requirements unclear until merchant onboarding is attempted | Validate Bakong integration feasibility early (spike task) before committing to it in a seller demo |
| Telegram Bot API rate limits under notification bursts | Unlikely at MVP volume; `BackgroundTasks` naturally serializes enough to avoid bursts |
| RLS + app-layer double-enforcement adds query complexity | Acceptable tradeoff for tenant-isolation safety; documented in code comments at the repository layer |
| Solo founder is also the only on-call engineer | Managed platform choices in §3 exist specifically to minimize 2am-pager scenarios |

---

This document should be read alongside `01_PRODUCT.md` (why/what) and `03_DEVELOPMENT.md` (how/when).
