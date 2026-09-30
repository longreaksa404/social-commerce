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

**Phase 0 — Setup & Foundations** (in progress, ~50% of tasks done)

---

## Done

- [x] Repo setup: monorepo (`backend/` + `frontend/`), pushed to
      https://github.com/longreaksa404/social-commerce (branch `main`)
- [x] FastAPI skeleton: Pydantic settings, CORS locked to configured origins,
      health check at `GET /api/v1/health`, 1 passing pytest
- [x] React + Vite + TypeScript + Tailwind + TanStack Query skeleton; home
      page calls the backend health endpoint and shows "API: ok"
- [x] `.gitattributes` (`* text=auto eol=lf`) to keep LF endings
- [x] Devcontainer (`.devcontainer/devcontainer.json` + `docker-compose.yml`):
      Python 3.12, Node 22, Postgres 16 sibling container (host `db`),
      `frontend/node_modules` as a named volume. Verified working.

---

## In Progress

- [ ] **Phase 0 — remaining tasks**
  - [ ] Alembic (async) setup + first migration + DB connection test  <- NEXT
  - [ ] SQLAlchemy base models, `store_id` tenant convention (drafted in chat,
        NOT yet in the repo: `backend/app/db/base.py` and `session.py`)
  - [ ] CI: lint + basic test run on push (GitHub Actions)
  - [ ] Deploy skeletons (backend -> Render, frontend -> Vercel, pin Node 22)
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
- [x] **Local dev environment: devcontainer** (Python 3.12, Node 22,
      Postgres 16 via compose). `backend/.python-version` = 3.12.x for
      Render. The earlier Python 3.11 idea was dropped, so no doc edit to
      02_TECHNICAL.md §2 is needed.
- [x] **Tenant column naming:** every tenant table uses `store_id`
      (= tenant_id = store.id); RLS reads session setting `app.tenant_id`.

Still open:

- [ ] **Managed Postgres provider:** Render Postgres (recommended) vs Neon.
      Founder to confirm at the start of the next chat.

---

## Decisions Made This Session (not yet reflected in 01/02/03)

- Development moved from a Claude Project chat to Claude Code. Docs live in
  `docs/` in the monorepo; `CLAUDE.md` is at the repo root.
- `01_PROJECT.md` renamed to `01_PRODUCT.md` to match cross-references.
- Hour estimates are now an upper bound; actual hours logged in `docs/TIME_LOG.md`.
- Notion kanban dropped; Phase task tables in 03 are the checklist.

---

## Notes

- Backend pinned deps: `backend/requirements.lock`. Regenerate inside the
  container after changing requirements (it was created on Python 3.11 and
  should be regenerated on 3.12).
- React Router deliberately not installed yet (needed in Phase 1).

---

## Requirements Log (quick-reference)

| Date | Source | Request | Status |
|---|---|---|---|
| — | — | — | — |

---

## Next Up

Phase 0 step 3: Alembic async setup, `db/base.py` + `db/session.py`, first
migration, non-superuser app role, connection test. Then CI, deploy,
DNS, Sentry.