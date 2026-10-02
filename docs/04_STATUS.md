# Project Status

> **Last updated:** 2026-10-02 (Phase 2 built and checked locally; not pushed yet)
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

**Phase 2 — Storefront (Customer-Facing Browsing)** (built, not pushed)

All five Phase 2 tasks are built, committed on `main`, and checked locally
in headless Chromium. Not pushed or deployed yet. Definition of done still
to confirm on the live site: opening `/shop/{store-slug}` on a phone shows
real products, and a product link shows that product.

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

**Phase 2 (built 2026-10-02; committed, not pushed or deployed):**

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

---

## In Progress

- [ ] **Carried over from Phase 1 (founder, later):** Cloudflare R2 bucket +
      API token + public dev URL + CORS, then the five `R2_*` env vars in
      Render; upload a product photo on the live site. Until then photo
      upload shows "Image uploads are not set up yet" and products have no
      images.
- [ ] Confirm CI is green in the GitHub Actions tab (repo is private, so
      Claude can't see it)
- [ ] **Phase 2 on the live site (founder):** push, then open
      `/shop/{your-slug}` and a product link on a phone. No photos show
      until R2 is set up (grey placeholders instead).

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
- Hour estimates are now an upper bound; actual hours logged in `docs/TIME_LOG.md`.
- Notion kanban dropped; Phase task tables in 03 are the checklist.

Applied to 02/03 on 2026-10-02 (at the founder's request): Neon instead of
Render Postgres; domain/DNS moved from Phase 0 to Phase 9; migrations at
container start; `currency` on `store`, `store_id` on `product_variant`,
the `refresh_token` table, the `app_user` RLS role note, and bcrypt instead
of passlib.

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
- Variants removed from a product are deleted. Before Phase 3 adds
  `order_item.variant_id`, decide whether variants become soft-deleted.
- Store slugs are global; product/category slugs are unique per store.
  Names with no Latin letters (e.g. Khmer only) get a short random slug.
- Storefront pages call `useShop` themselves instead of waiting for the
  layout, so a product link costs one round trip. New public endpoints go
  under `/shop/{store_slug}` (`app/api/shop.py`) and use the `Shop` /
  `ShopDb` dependencies; the router-level rate limit covers them.
- Bundle: 131 KB gzipped, mostly React DOM, React Router and TanStack
  Query. Lazy-loading the seller dashboard was measured (saves ~8 KB for
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
| — | — | — | — |

---

## Next Up

1. Founder: push Phase 2 and check it on a phone (see In Progress).
2. Decide on the two Phase 2 proposals above (link previews, grid photos).
3. Phase 3: checkout + orders. Before `order_item.variant_id` exists,
   decide whether removed variants become soft-deleted (see Notes).
R2 setup whenever the founder is ready.
