# Project Status

> **Last updated:** 2026-10-01
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

**Phase 0 — Setup & Foundations** (in progress: all code done; account setup
and first deploy remaining)

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
      `Base`, `UUIDPrimaryKeyMixin`, `TenantMixin` (`store_id`), and
      `set_tenant()` which sets `app.tenant_id` per transaction for RLS
- [x] Alembic (async) setup reading `DATABASE_URL` from settings; no tables
      or migrations yet
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
- [x] 5 passing pytest tests (health, tenant mixin, `set_tenant` scoping,
      database URL conversion)

---

## In Progress

- [ ] **Phase 0 — remaining tasks** (founder: accounts and dashboard steps)
  - [ ] Push `main`, confirm CI is green in the Actions tab  <- NEXT
  - [ ] Neon: create project (Singapore), copy the direct connection string
  - [ ] Sentry: create a FastAPI project and a React project, copy both DSNs
  - [ ] Render: New > Blueprint from the repo, enter the env vars
  - [ ] Vercel: import repo, root directory `frontend`, set env vars
  - [ ] Set Render `CORS_ORIGINS` to the Vercel URL; open the Vercel URL and
        see "API: ok" (Phase 0 definition of done)
  - Domain + Cloudflare DNS: deferred to Phase 9 (decided 2026-10-01)

---

## Known Issues / Blockers

- Company laptop blocks Windows `.exe` launchers; all dev happens inside the
  devcontainer (or GitHub Codespaces if Docker is blocked). Personal laptop
  uses the same devcontainer.
- Postgres data lives in a per-machine Docker volume and does not sync
  between machines; schema comes from Alembic migrations, seed data from
  scripts (seed script to be added in a later phase).

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

---

## Notes

- Backend deps are pinned to exact versions in `backend/requirements.txt`
  and `requirements-dev.txt` (no separate lock file).
- The backend test client dependency is `httpx2` (Starlette deprecated
  plain `httpx` for its TestClient).
- The Vite template now ships oxlint instead of ESLint; kept as is.
- React Router deliberately not installed yet (needed in Phase 1).
- The local DB user from docker-compose is a superuser, which bypasses RLS.
  A non-superuser app role is needed when RLS policies land in Phase 1.
  The same applies on Neon: its default owner role is not a superuser but
  owns the tables, so RLS needs `FORCE ROW LEVEL SECURITY` or a separate
  app role.
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

Founder account setup (see In Progress), then confirm the deployed frontend
shows "API: ok". Then Phase 1, starting with the `seller` and `store` tables.
