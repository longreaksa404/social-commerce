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
| `web` | React SPA, static build served via CDN/static host; on Vercel, a Routing Middleware (`frontend/middleware.ts`) gives preview bots on `/shop/*` the page's title, description and photo (link previews, §9.3) |
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
| Auth | **JWT (access + refresh)**, `bcrypt` (used directly; passlib is unmaintained) for passwords; sign-up with a phone number proved through the Telegram bot; "Continue with Google" (ID token checked with PyJWT against Google's keys); Facebook and TikTok to follow (decided 2026-10-09) | Stateless, simple, no session-store dependency; the phone check is free (no SMS) and Google needs no secret |
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
| Frontend hosting | **Vercel** or **Netlify** (static React build) | Free tier sufficient at MVP scale, instant rollbacks, preview deployments per PR |
| Object storage | **Cloudflare R2** or **AWS S3** | R2 has no egress fees, which matters once product images are viewed at volume by customers in Cambodia |
| Domain/DNS | **Cloudflare**: oaksolve.com, bought through Cloudflare Registrar 2026-10-09 (auto-renew on). `order.oaksolve.com` → Vercel (the app and every shop link), `api.oaksolve.com` → Render, `images.oaksolve.com` → the R2 bucket; `oaksolve.com` forwards to `order.` | Free DNS, at-cost domain. The Vercel and Render records are DNS only (grey cloud): both make their own HTTPS certificates and edge, and rate limits read `CF-Connecting-IP` from Render's own Cloudflare edge. App and API on one site (oaksolve.com) lets the refresh token live in an httpOnly cookie |
| Telegram webhook | Hosted on the same FastAPI service (`api`), no separate infra | One less moving part |

A VPS (DigitalOcean/Hetzner) is **not recommended** for the MVP: it trades a small cost saving for meaningful ongoing operational burden (patching, TLS renewal, process supervision, backups) that directly works against the founder's time constraint. Revisit VPS/self-hosting only if managed-platform costs become material at scale — this is a "build later" decision per the `01_PRODUCT.md` §44 decision framework, not a day-one one.

**Estimated MVP infra cost:** roughly $0–25/month at low traffic (most of the above have functional free tiers), scaling gradually with usage — consistent with the "low operating cost" constraint.

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
 ├─ seller_login (Google; later Facebook, TikTok)
 └─ store (1:1 in MVP)
     ├─ seller (staff logins, role staff)
     ├─ category
     ├─ product
     │   └─ product_variant
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
| slug | text, unique | used in shareable URLs, e.g. `/shop/{slug}` |
| description | text, nullable | |
| logo_url | text, nullable | the shop's logo, uploaded with `POST /seller/store/logo` (Phase 9); shown in the shop and dashboard headers |
| telegram_chat_id | text, nullable | for seller notifications; private, never shown on the shop |
| telegram_username | text, nullable | the seller's own Telegram username (without @), public on the shop page for "Ask seller" |
| contact_phone | text, nullable | a number customers can call, stored like customers' phones (`012345678`); public (2026-10-08) |
| messenger_username | text, nullable | a Facebook page's username or number, for a Messenger button (`m.me/<it>`); public (2026-10-08) |
| payment_config | JSONB | which methods are on, with their details: `{"cod": {"enabled": true}, "bank_transfer": {"enabled", "bank_name", "account_name", "account_number"}, "khqr": {"enabled", "bakong_account_id", "merchant_name"}}`. A method can only be on with its details filled in; at least one must be on. Missing parts read as the defaults (cash on delivery on, the others off), so a new store takes cash on delivery. Details are kept while a method is off. |
| delivery_config | JSONB | `{"fee", "free_from_amount", "free_from_items", "own_delivery": {"enabled"}, "couriers": ["J&T Express", ...], "pickup": {"enabled", "address"}}`. One fee for any delivery (own or courier); free from an amount (items before discount) or a number of units; pickup free. At least one of own delivery, a courier, or pickup. Missing parts read as the defaults (own delivery on, free), so a new store can take orders at once. |
| discount_config | JSONB | `{"rules": [{"min_subtotal", "amount_off"}]}`, up to 5; the biggest rule the items reach applies, never more than the items |
| order_confirmation_mode | enum(`automatic`,`manual`) | default `manual` |
| currency | enum(`USD`,`KHR`) | default `USD`; currency all prices in the store are shown in |
| orders_paused | bool | default false; not taking orders for a while: the shop can be browsed, checkout is refused (2026-10-08) |
| orders_resume_on | date, nullable | the first day orders open again (Phnom Penh), by themselves; null: until the seller turns them back on (2026-10-08) |
| low_stock_alert | int | default 5; an order leaving this many or fewer alerts the seller (bell, Telegram). Customers' "Only N left" stays at 5 (2026-10-08) |
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
| source | text, nullable | e.g. `tiktok`, from link tracking (§9) |
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
| courier | text, nullable | the courier the customer chose ("VET Express"); null for the seller's own delivery and pickup |
| assignee_note | text, nullable | the seller's note, e.g. "Sokha, 012 999 888" or "VET Takeo branch, no. 123456" — no courier integration in MVP |
| created_at / updated_at | timestamptz | |

### `shareable_link`
| id, store_id (FK), target_type (`store`,`product`,`category`), target_id (nullable for store links; no foreign key, as it points at a product or a category), token (8 lowercase letters/digits, unique), source (where it's posted, e.g. `tiktok`), campaign (nullable; the seller's own name for it, e.g. "Video 3 Oct"), created_at |

### `link_event`
| id, store_id (FK; for RLS, like the other tenant tables), link_id (FK), event_type (`view`,`order`), order_id (nullable FK, unique: an order counts for one link at most), created_at |

> Kept deliberately minimal per `01_PRODUCT.md` §20.1 — "advanced marketing analytics are not required for the first MVP." This just supports counting views/orders per link/source.

### `notification_log`
| id, store_id (FK), channel (`web`,`telegram`), event_type, payload (JSONB), sent_at, status (`sent`,`failed`), read_at (nullable; web only: when the seller opened the list with it in; null = unread) |

### `refresh_token`
| id (= the JWT's jti), seller_id (FK), expires_at, revoked_at (nullable), created_at |

> Each refresh token works once; reusing one revokes all of that seller's tokens (§13).

### `seller_login` (2026-10-09)
| id, seller_id (FK, cascade), provider (`google`; later `facebook`, `tiktok`), provider_user_id (Google's `sub`), email (Google's, when verified; shown in Settings), created_at |

> Unique (provider, provider_user_id) and (seller_id, provider). Not tenant data: no RLS grant.

### `phone_check` (2026-10-09)
| id (the page's secret), code (in the `t.me` link), telegram_user_id, phone (normalized, once shared), verified_at, expires_at (30 min), created_at |

> A phone number being proved through the bot (§12.4); used once by the form that needs it. Not tenant data: no RLS grant.

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
POST   /api/v1/auth/register                # shop name, name, password, phone_check (2026-10-09)
POST   /api/v1/auth/login                   # phone number, or an older account's email; password
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/password-reset            # Forgot password? a link to the shop's Telegram chat; same answer for any login
POST   /api/v1/auth/password-reset/confirm    # the link's token + a new password; logs in
POST   /api/v1/auth/phone-checks              # start proving a phone number in Telegram (§12.4)
GET    /api/v1/auth/phone-checks/{id}         # read until it has the number
POST   /api/v1/auth/google                    # Google's ID token: logged in, or a sign-up to finish
POST   /api/v1/auth/social/register           # finish it: shop name, name, phone_check; no password
```

### Seller — Account and staff (2026-10-08)
```
GET    /api/v1/seller/account                 # the logged-in person's name, phone, email (older accounts), role, password and Google status
PATCH  /api/v1/seller/account                 # name only
POST   /api/v1/seller/account/phone           # a new login number, from a phone check
POST   /api/v1/seller/account/google          # log in with this Google account too
POST   /api/v1/seller/account/password        # needs the current one if there is one; logs out other phones
POST   /api/v1/seller/account/close-shop      # owner; password, if the account has one; link and logins stop, nothing erased
GET    /api/v1/seller/staff                   # owner only, like everything under Settings
POST   /api/v1/seller/staff                   # name, phone (their login), first password
POST   /api/v1/seller/staff/{id}/password
DELETE /api/v1/seller/staff/{id}
```

### Seller — Store
```
GET    /api/v1/seller/store
PATCH  /api/v1/seller/store                   # owner only; takes logo_url only from a logo upload below; null removes it
POST   /api/v1/seller/store/logo              # presigned logo upload, see §11
POST   /api/v1/seller/store/telegram/link     # signed t.me/<bot>?start=<code> link, 30 min
DELETE /api/v1/seller/store/telegram          # disconnect the seller's chat
```

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
```

### Seller — Customers
```
GET    /api/v1/seller/customers               # whoever ordered last first; ?q= part of a name or phone
GET    /api/v1/seller/customers/{id}          # includes order history (latest 100)
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
PENDING ──accept──▶ ACCEPTED ──▶ PROCESSING ──▶ READY ──▶ SHIPPED ──▶ DELIVERED ──▶ COMPLETED
   │                    │
   └──reject──▶ REJECTED └──cancel──▶ CANCELLED
```

- Allowed transitions enforced via a transition table in code, e.g.:
```python
ALLOWED_ORDER_TRANSITIONS = {
    "pending": {"accepted", "rejected"},
    "accepted": {"processing", "cancelled"},
    "processing": {"ready", "cancelled"},
    "ready": {"shipped", "cancelled"},
    "shipped": {"delivered"},
    "delivered": {"completed"},
    "completed": set(),
    "rejected": set(),
    "cancelled": set(),
}
```
- `order_confirmation_mode` (on `store`) determines whether a new order enters `pending` (manual) or is auto-transitioned to `accepted` immediately (automatic) via the same service function.

## 7.2 Payment State Machine
```
PENDING ──▶ PAID
   │
   └──▶ FAILED

PAID ──▶ REFUNDED   (future; not required for MVP transitions, but schema supports it)
```
- In the MVP there are no transitions out of PAID or FAILED, so the seller is asked to confirm before recording either. Every payment starts PENDING, for every method.
- The seller records the payment with `PATCH /seller/orders/{id}/payment` (optionally with a `reference` note); `paid_at` is set when it becomes PAID. Recording a payment never changes the order's status, and changing the order's status never changes the payment's.

## 7.3 Delivery State Machine
```
NOT_ASSIGNED ──▶ ASSIGNED ──▶ PICKED_UP ──▶ IN_TRANSIT ──▶ DELIVERED
                                                  │
                                                  └──▶ FAILED
```
- `FAILED ──▶ ASSIGNED`: the seller tries again, e.g. nobody was home (decided 2026-10-03).
- For `pickup` delivery method, the flow simplifies: `NOT_ASSIGNED → DELIVERED` (marked by seller when customer collects), skipping the intermediate states.
- The seller moves it with `PATCH /seller/orders/{id}/delivery` (optionally with an `assignee_note`). Moving the delivery never changes the order's status, or the other way round.

## 7.4 Cross-State Validity (Rule 4 / Rule 5)

No database constraint forces payment/delivery status to match order status — this is intentional. Valid real-world combinations like `order=shipped, payment=pending` (COD) must remain possible. The only enforced coupling: an order cannot move to `completed` unless `delivery.status = delivered` **and** (`payment.status = paid` **or** `payment.method = cod`) (COD orders complete on delivery regardless of when cash changes hands; the delivery condition was added 2026-10-03) — this single business rule lives in the order-transition service function, not the schema.

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

Facebook, Messenger, Telegram, TikTok and similar apps build a link's preview card from the HTML without running JavaScript. A Vercel Routing Middleware (`frontend/middleware.ts`, decided 2026-10-03) on `/shop/*` gives those preview bots `index.html` with `og:` title, description and photo from the storefront API; people pass through untouched, so a slow API never slows a customer. If the API doesn't answer in 6 s (e.g. Render asleep), the bot gets the generic card. The card's own words (e.g. "Order online", a category's product count) are in Khmer, the default language. Preview bots don't run JavaScript, so they never count as views.

---

# 10. Payment Integration

Matches `01_PRODUCT.md` §25: **COD + KHQR + manual bank transfer**, no additional providers.

**Decided (2026-10-02):**
- The customer chooses the method at checkout, from those the store has on (`payment_config`). Only method names are public; account details and the KHQR code come with the order.
- **Payment timing: pay right after ordering.** The order page shows how to pay as soon as the order is placed, before the seller accepts it. If the seller then rejects or cancels an order that was already paid, they refund it themselves.
- **Every payment is confirmed by hand by the seller**, for all three methods.
- Payment details shown are the store's current ones, not a copy from ordering time, and disappear if the seller turns that method off.

## 10.1 Cash on Delivery (COD)
No integration. `payment.status` starts `pending`, seller manually marks `paid` after collecting cash (`PATCH /seller/orders/{id}/payment`). A COD order can be completed without the cash being recorded (§7.4).

## 10.2 Manual Bank Transfer
No integration. Store's `payment_config.bank_transfer` holds account details (bank, name on the account, account number), shown to the customer on the order page right after they order, with the amount and a request to put the order number (e.g. "#1001") in the transfer note. Customer transfers manually; seller manually marks `paid` after checking their bank app. `payment.reference` can store a free-text note (e.g., last 4 digits, transfer time) for reconciliation.

## 10.3 KHQR
- NBC's KHQR standard, which all Bakong member banks/wallets (ABA, ACLEDA, Wing, …) can scan and pay.
- **Generated on our own server, without the Bakong API (spike result, 2026-10-02).** A KHQR is an EMVCo QR payload pointing at the seller's Bakong ID, so building one needs no Bakong account, API token, or network call. The store's `payment_config.khqr` holds the seller's Bakong ID (e.g. `name@aclb`, from their bank app) and the name customers see (English letters, max 25). The format follows NBC's KHQR SDK (v2.9); tests pin it to strings the official SDK generated.
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
- Notification triggers (`01_PRODUCT.md` §19, decided 2026-10-03): only events the seller didn't cause: new order, and low stock (an order takes a product or option to 5 or fewer, or to 0). Cancellation, payment, and delivery changes are the seller's own actions in the MVP. Each alert writes a `notification_log` row (sent / failed) and calls the Bot API; a failed send never affects the order.
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

## 12.3 Webhook
- Single endpoint: `POST /api/v1/telegram/webhook`, registered with Telegram at startup where `PUBLIC_API_URL` is set (production only, so a laptop never takes the bot over).
- Validates the Telegram secret token header before processing, per Telegram's webhook security guidance.

## 12.4 Phone Check (decided 2026-10-09)
- Sellers prove their phone number through the bot instead of an SMS code (free). The page starts a check and opens `t.me/{bot_username}?start=phone_{code}`; `/start phone_{code}` answers with a "Share my phone number" button (`request_contact`).
- The shared contact counts only if it's the sender's own (`contact.user_id` = the sender); it completes the newest open check that account opened. The page reads the check until it has the number, then hands the check's id in with the form (sign-up, a new login number). A check lasts 30 minutes and works once.
- Signing up connects that chat with the bot to the new shop's alerts (§12.1). One account per number.

---

# 13. Auth & Security

- **Passwords:** `bcrypt` (used directly; passlib is unmaintained), never stored/logged in plaintext.
- **Sign-up (2026-10-09):** a phone number proved in Telegram (§12.4), one account per number; login by that number (any spelling) or, for accounts from before, their email.
- **Google (2026-10-09):** the ID token is checked (signature against Google's keys, audience = our client ID, issuer, expiry); nothing is stored but Google's account id and its verified email. A Google account is joined to a shop only from that shop's own Settings, never by a matching phone number or email.
- **Tokens:** short-lived access JWT (~15 min) + longer-lived refresh JWT (~7 days), refresh rotated on use. The access token is in the response body and kept in memory only; the refresh token is an httpOnly, Secure, SameSite=Lax cookie on the API's host, path `/api/v1/auth`, so no script can read it (app and API share the site oaksolve.com, 2026-10-09).
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
