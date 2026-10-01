# Project Status

> **Last updated:** 2026-10-01 (Phase 1 done except photo upload; Phase 2 next)
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

**Phase 2 — Storefront (Customer-Facing Browsing)** (not started)

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

---

## In Progress

- [ ] **Carried over from Phase 1 (founder, later):** Cloudflare R2 bucket +
      API token + public dev URL + CORS, then the five `R2_*` env vars in
      Render; upload a product photo on the live site. Until then photo
      upload shows "Image uploads are not set up yet" and products have no
      images.
- [ ] Confirm CI is green in the GitHub Actions tab (repo is private, so
      Claude can't see it)
- [ ] Founder to apply the proposed 02/03 doc changes (Phase 0: Neon,
      domain moved to Phase 9, migrations at container start; Phase 1:
      §5.2 additions, §13 bcrypt)

---

## Known Issues / Blockers

- Company laptop blocks Windows `.exe` launchers; all dev happens inside the
  devcontainer (or GitHub Codespaces if Docker is blocked). Personal laptop
  uses the same devcontainer.
- Postgres data lives in a per-machine Docker volume and does not sync
  between machines; schema comes from Alembic migrations, seed data from
  scripts (seed script to be added in a later phase).
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

Still open: none.

---

## Decisions Made This Session (not yet reflected in 01/02/03)

- Development moved from a Claude Project chat to Claude Code. Docs live in
  `docs/` in the monorepo; `CLAUDE.md` is at the repo root.
- `01_PROJECT.md` renamed to `01_PRODUCT.md` to match cross-references.
- Hour estimates are now an upper bound; actual hours logged in `docs/TIME_LOG.md`.
- Notion kanban dropped; Phase task tables in 03 are the checklist.
- Postgres on Neon (free), not Render; domain/DNS moved from Phase 0 to
  Phase 9. Doc changes proposed to the founder 2026-10-01.
- Phase 1 (founder-approved 2026-10-01): `refresh_token` table for real
  rotation; `store_id` on `product_variant`; per-store `currency` (USD/KHR,
  default USD); R2 built now, connected later. bcrypt used directly
  instead of passlib. Doc changes proposed 2026-10-01.

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

Phase 2: public storefront (`/shop/{slug}`, product and category pages,
mobile styling). R2 setup whenever the founder is ready.
