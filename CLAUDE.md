# Social Commerce SaaS

Multi-tenant social-commerce ordering platform for small sellers in Cambodia
who sell through Facebook/TikTok/Instagram. Solo founder, part-time (working
full-time alongside this project). Keep everything simple, low-cost, and
maintainable by one person.

## Read first, every session
- docs/04_STATUS.md: what is actually built, blockers, locked decisions
- docs/03_DEVELOPMENT.md: the plan and phase task tables
- docs/01_PRODUCT.md: scope, MVP boundaries, business rules (read when relevant)
- docs/02_TECHNICAL.md: architecture, data model, API, state machines (read when relevant)
- [docs/CODEBASE.md](docs/CODEBASE.md): how the code works today (layout, tenancy/RLS,
  models, state machines, every endpoint, frontend patterns, key files, deviations
  from 02). Also the reference for the claude.ai Project, which can't see the repo.

04_STATUS.md wins for "what exists." 03_DEVELOPMENT.md wins for "what's scoped."
Confirm what we're working on before writing code, unless I've already stated it.

## Stack (default choices; propose changes rather than silently swapping)
- Backend: FastAPI (async), Pydantic v2, SQLAlchemy 2.0 async, Alembic, PostgreSQL 16
- Frontend: React + Vite + TypeScript + Tailwind + TanStack Query + React Router
- Hosting: Render (backend), Neon (Postgres), Vercel (frontend), Cloudflare R2 (images)
- Repo: monorepo with backend/ and frontend/
- Small supporting libraries within this stack are your call. Core stack changes
  need my approval.

## Hard rules
1. Multi-tenant: shared DB, shared schema. Every tenant table has tenant_id
   (= store.id), enforced in the application layer AND Postgres RLS. Never take
   tenant_id from a request body. No per-tenant infrastructure.
2. Order, payment, and delivery are three independent state machines
   (02_TECHNICAL.md section 7). Never infer one status from another. The only
   coupling is the completion rule in section 7.4.
3. Keep infrastructure and architecture simple: no microservices, queues, or
   extra services unless there's a clear need. If you think something more
   complex or different would genuinely be better, don't just do it and don't
   stay silent. Propose it briefly: what it is, why it's better, and what it
   costs me in time, money, and maintenance. I decide.
4. If a feature isn't in the docs, don't build it silently. Tell me what you
   noticed and whether it seems worth doing (use the Decision Framework in
   01_PRODUCT.md section 44 if helpful). If I say yes, build it. If I'm unsure,
   suggest logging it in the Requirements Log (03_DEVELOPMENT.md section 6).
5. Don't treat a decision as settled unless 04_STATUS.md marks it resolved or I
   closed it in this conversation. If unsure, ask.
6. Be direct and implementable. Give options only when I ask for them.

## What you can decide on your own
Implementation details inside the plan: file and function structure, naming,
router layout, component structure, migration details, small helper libraries,
bug fixes, refactors within the scope of the current task. Don't ask permission
for these. Just explain briefly what you chose if it matters.

## Always ask before
- Adding a new paid service, account, or infrastructure component
- Changing the data model in a way that differs from 02_TECHNICAL.md section 5
- Deleting data, dropping tables, or rewriting git history
- Anything that needs a secret, API key, or account only I can create

## How to work
- Work through a whole phase (or a coherent chunk of it) in one go when I ask,
  but commit after each completed task with a clear message so I can review
  and roll back step by step.
- Stop and ask me if something is ambiguous, needs an account or secret, or
  would deviate from the docs. Don't guess and keep going.
- At the end, summarize what was done and how to run and check it.
- Don't push to the remote or deploy unless I ask.
- Backend tests: pytest for state-machine transitions and order/payment total
  calculations. Don't write exhaustive endpoint tests at MVP stage.
- Frontend: no automated tests required for MVP.
- Never put secrets in the repo. Use environment variables, and keep a
  .env.example with placeholder values.

## Security reminders
- Every seller-facing query must be scoped by the authenticated store, in the
  service layer and by RLS. Add a test when touching tenant-scoped code.
- Validate all input with Pydantic. No raw SQL string interpolation.
- Public storefront endpoints are rate-limited and never expose other tenants' data.

## Commands
First-time setup (from the repo root):
- `cp .env.example .env` (one .env for compose, backend, and Vite)
- `python -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements-dev.txt`
- `cd frontend && npm install`

Database (from the repo root):
- `docker compose up -d --wait`: start local Postgres 16 on localhost:5432
- `docker compose down`: stop it (add `-v` to also delete the data volume)

Backend (from `backend/`, with `source .venv/bin/activate`):
- `uvicorn app.main:app --reload`: API on http://localhost:8000 (docs at /docs)
- `pytest`: tests (needs Postgres running; uses its own `<db>_test` database,
  created and migrated automatically)
- `ruff check . && ruff format --check .`: lint (`ruff format .` to fix formatting)
- `alembic upgrade head`: apply migrations
- `alembic revision --autogenerate -m "message"`: create a migration
- Load test: `backend/loadtest/README.md` (own venv; a local container at
  Render's CPU, or the live API)

Frontend (from `frontend/`):
- `npm run dev`: dev server on http://localhost:5173
- `npm run lint`: oxlint
- `npm run build`: type-check and production build

CI (`.github/workflows/ci.yml`) runs the lint, migration, test, and build
commands above on every push.

## Status tracking
- After meaningful progress, update docs/04_STATUS.md (Done, In Progress,
  Blockers, Next Up) and tell me what changed.
- When I say a phase is complete, update "Done" before starting the next phase.
- If a decision changes 01, 02, or 03, say so and give me the exact section and
  text to update.
- When a change touches models, endpoints, state machines, env vars, or the key
  files list, update docs/CODEBASE.md in the same commit.