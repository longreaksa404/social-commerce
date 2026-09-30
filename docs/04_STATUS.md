# Project Status

> **Last updated:** 2026-09-30
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

**Phase 0 — Setup & Foundations** (in progress: local work done, deploy/DNS/Sentry remaining)

---

## Done

> Corrected 2026-09-30: an earlier version of this list described work that
> was not actually in the repo. Everything below is committed on `main`
> and pushed to `origin/main` up to `d5d716c`; `731f696` (VS Code debug
> configs) is local only.

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
      result on GitHub has not been checked yet.
- [x] 3 passing pytest tests (health, tenant mixin, `set_tenant` scoping)

---

## In Progress

- [ ] **Phase 0 — remaining tasks** (all need accounts or secrets)
  - [ ] Confirm CI passes on GitHub (Actions tab), push the remaining local commit  <- NEXT
  - [ ] Deploy skeletons (backend -> Render, frontend -> Vercel)
  - [ ] Managed Postgres provisioning
  - [ ] Domain + Cloudflare DNS setup
  - [ ] Error tracking (Sentry) wired in

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

Still open:

- [ ] **Managed Postgres provider:** Render Postgres (recommended) vs Neon.
      Founder to confirm at the start of the next chat.
- [ ] **Health endpoint path:** built as `GET /health` (unversioned, as
      requested for Phase 0). 02_TECHNICAL.md §6.1 puts the API under
      `/api/v1/`; confirm whether health stays outside the versioned prefix.
- [ ] **Node version:** the devcontainer's "lts" currently resolves to
      Node 24, and CI uses 24 to match. An earlier note said to pin Node 22;
      confirm which to pin before the Vercel deploy.

---

## Decisions Made This Session (not yet reflected in 01/02/03)

- Development moved from a Claude Project chat to Claude Code. Docs live in
  `docs/` in the monorepo; `CLAUDE.md` is at the repo root.
- `01_PROJECT.md` renamed to `01_PRODUCT.md` to match cross-references.
- Hour estimates are now an upper bound; actual hours logged in `docs/TIME_LOG.md`.
- Notion kanban dropped; Phase task tables in 03 are the checklist.

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

---

## Requirements Log (quick-reference)

| Date | Source | Request | Status |
|---|---|---|---|
| — | — | — | — |

---

## Next Up

Check the CI result on GitHub and push the remaining local commit. Then the account-dependent Phase 0 tasks:
Render + Vercel deploy skeletons, managed Postgres, Cloudflare DNS, Sentry.
