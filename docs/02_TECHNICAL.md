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
| `web` | React SPA, static build served via CDN/static host |
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
| Database | **PostgreSQL 16** | Relational integrity for orders/payments/inventory; JSONB available for flexible fields (e.g., variant attributes) without needing a second database |
| Auth | **JWT (access + refresh)**, `bcrypt` (used directly; passlib is unmaintained) for password hashing | Stateless, simple, no session-store dependency |
| Image storage | **S3-compatible object storage** (see §11) | Decoupled from app servers, cheap, standard presigned-upload pattern |
| Background tasks | **FastAPI `BackgroundTasks`** (MVP) → Celery/RQ only if volume demands it later | Avoids running a queue + worker for MVP scale |
| Telegram | **python-telegram-bot** (webhook mode) | Official-adjacent, well maintained |
| Payments | KHQR via **Bakong API** (see §10), COD (no integration), manual bank transfer (manual confirmation, no integration) | Matches validated MVP payment scope from `01_PRODUCT.md` §25 |

---

# 3. Hosting & Infrastructure Recommendation

Given the constraint of a solo, part-time founder (`01_PRODUCT.md` §2.3, §38.8), the priority is **minimum operational surface area**, not lowest possible cost or maximum control.

**Recommendation: Managed platform, not a raw VPS.**

| Component | Recommendation | Reasoning |
|---|---|---|
| Backend hosting | **Render** (Docker deploy of FastAPI; free web service, Singapore, for the MVP) | Git-push deploys, managed TLS, no server patching, environment variables UI, built-in logs |
| Database | **Neon** (free plan, Singapore region) for the MVP; Render Postgres is the upgrade path if Neon's limits are hit | No manual DB ops, branching useful for staging; Render's free Postgres expires after 30 days |
| Frontend hosting | **Vercel** or **Netlify** (static React build) | Free tier sufficient at MVP scale, instant rollbacks, preview deployments per PR |
| Object storage | **Cloudflare R2** or **AWS S3** | R2 has no egress fees, which matters once product images are viewed at volume by customers in Cambodia |
| Domain/DNS | **Cloudflare** | Free, also gives CDN + basic DDoS protection in front of the frontend |
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

---

# 5. Data Model

## 5.1 Core Entities (MVP)

```
seller
 └─ store (1:1 in MVP)
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
| email | text, unique | login |
| password_hash | text | |
| full_name | text | |
| phone | text | |
| created_at | timestamptz | |
| is_active | bool | default true |

### `store` (tenant root)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | **this is the `tenant_id` used everywhere below** |
| seller_id | UUID FK → seller | |
| name | text | |
| slug | text, unique | used in shareable URLs, e.g. `/shop/{slug}` |
| description | text, nullable | |
| logo_url | text, nullable | |
| telegram_chat_id | text, nullable | for seller notifications |
| payment_config | JSONB | which methods enabled, e.g. `{"cod": true, "khqr": true, "bank_transfer": {"account": "...", "bank": "..."}}` |
| delivery_config | JSONB | e.g. `{"seller_managed": true, "pickup": true, "pickup_address": "..."}` |
| order_confirmation_mode | enum(`automatic`,`manual`) | default `manual` |
| currency | enum(`USD`,`KHR`) | default `USD`; currency all prices in the store are shown in |
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
| store_id | UUID FK | tenant scope — a customer record is per-store, not global, in MVP (matches "guest checkout" default; see §5.4) |
| name | text | |
| phone | text | primary identifier for guest customers |
| address | text, nullable | |
| telegram_user_id | text, nullable | if they contacted via Telegram |
| created_at | timestamptz | |

### `order`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| store_id | UUID FK | tenant scope |
| customer_id | UUID FK | |
| status | enum: `pending, accepted, processing, ready, shipped, delivered, completed, cancelled, rejected` | see §7.1 |
| subtotal | numeric(12,2) | |
| delivery_fee | numeric(12,2), default 0 | |
| total | numeric(12,2) | |
| delivery_address | text, nullable | null if pickup |
| delivery_method | enum(`seller_delivery`,`pickup`) | |
| source | text, nullable | e.g. `tiktok`, from link tracking (§9) |
| notes | text, nullable | |
| created_at / updated_at | timestamptz | |

### `order_item`
| id, order_id (FK), product_id (FK), variant_id (FK, nullable), product_name_snapshot, variant_name_snapshot, unit_price_snapshot, quantity, line_total |

> Snapshots are stored because product name/price may change after the order is placed — orders must reflect what was actually purchased.

### `payment`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| order_id | UUID FK, unique | 1:1 with order in MVP |
| method | enum(`cod`,`khqr`,`bank_transfer`) | |
| status | enum(`pending`,`paid`,`failed`,`refunded`) | see §7.2 |
| amount | numeric(12,2) | |
| reference | text, nullable | KHQR transaction ref, or bank transfer note |
| paid_at | timestamptz, nullable | |
| created_at | timestamptz | |

### `delivery`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| order_id | UUID FK, unique | |
| status | enum(`not_assigned`,`assigned`,`picked_up`,`in_transit`,`delivered`,`failed`) | see §7.3 |
| method | enum(`seller_delivery`,`pickup`) | |
| assignee_note | text, nullable | free text, e.g. "Sokha delivering" — no courier integration in MVP |
| updated_at | timestamptz | |

### `shareable_link`
| id, store_id (FK), target_type (`store`,`product`,`category`), target_id (nullable for store links), slug/token, source (nullable, e.g. `tiktok`), campaign (nullable), created_at |

### `link_event`
| id, link_id (FK), event_type (`view`,`order`), order_id (nullable FK), created_at |

> Kept deliberately minimal per `01_PRODUCT.md` §20.1 — "advanced marketing analytics are not required for the first MVP." This just supports counting views/orders per link/source.

### `notification_log`
| id, store_id (FK), channel (`web`,`telegram`), event_type, payload (JSONB), sent_at, status (`sent`,`failed`) |

### `refresh_token`
| id (= the JWT's jti), seller_id (FK), expires_at, revoked_at (nullable), created_at |

> Each refresh token works once; reusing one revokes all of that seller's tokens (§13).

## 5.3 Entity-Relationship Summary

```
seller 1───1 store
seller 1───N refresh_token
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

`01_PRODUCT.md` §46 leaves "guest checkout vs. customer accounts" open. **Technical recommendation: guest checkout for MVP, no customer login.**

- `customer` records are created/matched by `(store_id, phone)` at checkout time — no password, no account.
- This avoids building an entire customer auth system before validating whether customers even want to leave the chat app to order (Critical Assumption 2, `01_PRODUCT.md` §35).
- Order tracking (§8) uses a token-based lookup (order ID + phone), not login.
- This is flagged as an **open decision requiring product sign-off**, not fully closed — but it's the technically recommended default given `01_PRODUCT.md` §24's note that "reducing checkout friction is important."

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
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
```

### Seller — Store
```
GET    /api/v1/seller/store
PATCH  /api/v1/seller/store
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
GET    /api/v1/seller/orders/{id}
PATCH  /api/v1/seller/orders/{id}/status      # transitions order state, see §7.1
PATCH  /api/v1/seller/orders/{id}/payment     # mark paid/failed
PATCH  /api/v1/seller/orders/{id}/delivery    # update delivery status
```

### Seller — Customers
```
GET    /api/v1/seller/customers
GET    /api/v1/seller/customers/{id}          # includes order history
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

## 7.3 Delivery State Machine
```
NOT_ASSIGNED ──▶ ASSIGNED ──▶ PICKED_UP ──▶ IN_TRANSIT ──▶ DELIVERED
                                                  │
                                                  └──▶ FAILED
```
For `pickup` delivery method, the flow simplifies: `NOT_ASSIGNED → DELIVERED` (marked by seller when customer collects), skipping the intermediate states.

## 7.4 Cross-State Validity (Rule 4 / Rule 5)

No database constraint forces payment/delivery status to match order status — this is intentional. Valid real-world combinations like `order=shipped, payment=pending` (COD) must remain possible. The only enforced coupling: an order cannot move to `completed` unless `payment.status = paid` **or** `payment.method = cod` (COD orders complete on delivery regardless of when cash changes hands) — this single business rule lives in the order-transition service function, not the schema.

---

# 8. Order Tracking (Customer-Facing)

Since there's no customer login (§5.4), order tracking uses:
```
GET /api/v1/shop/{store_slug}/orders/{order_id}?phone={phone}
```
- Requires both the order ID (given at checkout / in Telegram confirmation) and the phone number used at checkout — a simple shared-secret pattern, not real auth, appropriate for the low-sensitivity data involved (order status, not payment credentials).
- Returns order status, items, and delivery status only — no other customer orders are exposed.

---

# 9. Shareable Links & Tracking

## 9.1 Link Structure

```
/shop/{store_slug}                                → store link
/shop/{store_slug}/product/{product_slug}          → product link
/shop/{store_slug}/category/{category_slug}        → category link
```

Optional query params for source tracking, appended by the seller when sharing:
```
?src=tiktok&campaign=september_sale
```

## 9.2 Tracking Flow

1. Frontend reads `src`/`campaign` query params on page load.
2. Frontend calls a lightweight `POST /api/v1/shop/{store_slug}/track-view` (fire-and-forget) with `target_type`, `target_id`, `source`, `campaign`.
3. Backend writes a `link_event(event_type=view)` row via `BackgroundTasks` (non-blocking).
4. At checkout, if an order is created within the same browser session (tracked via a short-lived cookie/localStorage value, **not** a database session), the `order.source` field is populated and a `link_event(event_type=order)` is written.

This is intentionally simple — no attribution modeling, no multi-touch tracking, consistent with `01_PRODUCT.md` §20.1's explicit scope limit.

---

# 10. Payment Integration

Matches `01_PRODUCT.md` §25: **COD + KHQR + manual bank transfer**, no additional providers.

## 10.1 Cash on Delivery (COD)
No integration. `payment.status` starts `pending`, seller manually marks `paid` after collecting cash (`PATCH /orders/{id}/payment`).

## 10.2 Manual Bank Transfer
No integration. Store's `payment_config.bank_transfer` holds account details shown to the customer at checkout. Customer transfers manually; seller manually marks `paid` after checking their bank app. `payment.reference` can store a free-text note (e.g., last 4 digits, transfer time) for reconciliation.

## 10.3 KHQR
- Generated via the **Bakong Open API** (NBC's KHQR standard), which most Cambodian banks/wallets support for QR-based payment.
- Flow:
  1. On checkout with `method=khqr`, backend calls Bakong API to generate a KHQR string/image for the order total.
  2. Frontend displays the QR code.
  3. **MVP approach: manual confirmation.** Seller checks their bank app for the incoming transfer and marks the order `paid` manually — same UX as bank transfer, just with a QR code for convenience. This avoids needing Bakong's transaction-verification/webhook API (which requires additional merchant onboarding) before validating the product.
  4. **Post-MVP upgrade path:** integrate Bakong's transaction check/webhook API for automatic payment confirmation once a seller's volume justifies the integration effort — flagged in §14 as a fast-follow, not blocking MVP launch.

This mirrors `01_PRODUCT.md` §38.4's guidance: "start with the simplest validated payment workflow."

---

# 11. Image Storage

- Object storage: Cloudflare R2 (or S3-compatible equivalent).
- Upload flow: backend issues a **presigned upload URL** (`POST /seller/products/{id}/images` returns a presigned PUT URL) → frontend uploads the file directly to storage → frontend confirms completion → backend stores the resulting public URL in `product.image_urls`.
- This keeps large file bytes off the FastAPI service entirely (no multipart handling on the app server), which matters for keeping the backend lightweight and cheap to run.
- Basic constraints enforced client-side and re-validated server-side: max 5 images per product, max 5MB per image, JPEG/PNG/WebP only.

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
- Seller links their Telegram by starting a chat with the platform's bot and sending a linking code shown in their dashboard settings (`/settings`) — bot resolves the code to `store_id` and stores the resulting `chat_id`.
- Notification triggers (from `01_PRODUCT.md` §19): new order, order cancellation, payment received, payment failed, delivery update, low stock. Each writes a `notification_log` row and calls the Bot API.

## 12.2 Customer "Ask Seller"
```
Customer taps "Ask Seller" on product page
        │
        ▼
 Deep link: https://t.me/{bot_username}?start={store_id}_{product_id}
        │
        ▼
 Customer's Telegram opens, bot greets them, forwards message thread
 context to seller's linked chat (or a dedicated seller-facing group)
        │
        ▼
 Seller replies directly in Telegram (outside the platform)
        │
        ▼
 Customer manually returns to the product page link to complete checkout
```
- The platform does **not** proxy or store the back-and-forth conversation content — per `01_PRODUCT.md` §8.3/§27, Telegram is a communication channel, not the source of truth. The platform only logs that an "ask seller" event occurred (for link/product analytics), not the conversation itself.
- This keeps the integration to a single webhook endpoint and avoids building a chat-relay system.

## 12.3 Webhook
- Single endpoint: `POST /api/v1/telegram/webhook`, registered with Telegram on deploy.
- Validates the Telegram secret token header before processing, per Telegram's webhook security guidance.

---

# 13. Auth & Security

- **Passwords:** `bcrypt` (used directly; passlib is unmaintained), never stored/logged in plaintext.
- **Tokens:** short-lived access JWT (~15 min) + longer-lived refresh JWT (~7 days), refresh rotated on use.
- **Tenant isolation:** enforced at both application layer (service functions always scope by `store_id` from the authenticated token) and database layer (Postgres RLS, §4.2) — defense in depth, matching Rule 2 (`01_PRODUCT.md` §32).
- **Rate limiting:** basic IP-based rate limiting on `/auth/login` and public storefront endpoints (e.g., via `slowapi`) to blunt brute-force and scraping — lightweight, no separate infra required.
- **CORS:** locked to the known frontend origin(s).
- **Input validation:** all request bodies validated via Pydantic schemas; no raw SQL string interpolation (SQLAlchemy parameterized queries only).
- **Secrets:** environment variables in the Render and Vercel dashboards, never committed to the repo.

---

# 14. Post-MVP Technical Fast-Follows

Not required to launch, but designed for in the schema/architecture so they don't require rework:

- Bakong webhook-based automatic KHQR payment confirmation (§10.3)
- Stock reservation on "add to cart" (currently: stock checked at order-creation time only, per `01_PRODUCT.md` §32 Rule 3 — reservation logic is deferred until abandoned-cart overselling is shown to be a real problem)
- Background worker (Celery/RQ) if notification/tracking volume outgrows `BackgroundTasks`
- Delivery-provider API integrations (replacing free-text `assignee_note`)
- Customer accounts (replacing phone-based guest lookup)

---

# 15. Non-Functional Requirements (MVP-Appropriate)

- **Performance:** no specific SLA needed at MVP scale (single-digit sellers, low order volume). Standard indexing (§4.2) and avoiding N+1 queries is sufficient — no caching layer, no read replicas.
- **Availability:** best-effort; managed platform's default uptime is acceptable. No multi-region, no failover architecture at this stage.
- **Backups:** rely on Neon's built-in point-in-time restore — no custom backup tooling to build/maintain. The free plan keeps only a 6-hour restore window; move to a paid tier or add backups before the first real seller.
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
