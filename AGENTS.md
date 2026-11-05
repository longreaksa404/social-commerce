# Social Commerce SaaS (Oak Order)

Multi-tenant social-commerce ordering platform for small sellers in Cambodia
who sell through Facebook/TikTok/Instagram. Solo founder, part-time (working
full-time alongside this project). Keep everything simple, low-cost, and
maintainable by one person.

This file is the single source of instructions for coding agents (Codex reads
it directly; `CLAUDE.md` imports it for Claude Code).

## Read first, every session
- docs/04_STATUS.md: what is actually built, blockers, locked decisions
- docs/03_DEVELOPMENT.md: the plan and phase task tables
- docs/01_PRODUCT.md: scope, MVP boundaries, business rules (read when relevant)
- docs/02_TECHNICAL.md: architecture, data model, API, state machines (read when relevant)
- docs/CODEBASE.md: how the code works today (layout, tenancy/RLS, models,
  state machines, every endpoint, frontend patterns, key files, deviations
  from 02). Also the reference for the claude.ai Project, which can't see the repo.

These are long (04_STATUS.md is ~4,000 lines): read the top of 04 (Last
updated, In Progress, Blockers, Next Up) and search the rest for the area you
are touching instead of reading everything.

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
   coupling is the completion rule in section 7.4, which also completes a
   delivered, paid order by itself (2026-10-24).
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
  and roll back step by step. Follow "When a task is done" below for every commit.
- Stop and ask me if something is ambiguous, needs an account or secret, or
  would deviate from the docs. Don't guess and keep going.
- At the end, summarize what was done and how to run and check it.
- Don't push to the remote or deploy unless I ask.
- Backend tests: pytest for state-machine transitions and order/payment total
  calculations. Don't write exhaustive endpoint tests at MVP stage.
- Frontend: no automated tests required for MVP.
- Never put secrets in the repo. Use environment variables, and keep a
  .env.example with placeholder values. Never print values from `.env`.

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
  created and migrated automatically). Never run two pytest runs at once: they
  share the `_test` DB and fail at random.
- `ruff check . && ruff format --check .`: lint (`ruff format .` to fix formatting)
- `alembic upgrade head`: apply migrations
- `alembic revision --autogenerate -m "message"`: create a migration
- Load test: `backend/loadtest/README.md` (own venv; a local container at
  Render's CPU, or the live API)

Frontend (from `frontend/`):
- `npm run dev`: dev server on http://localhost:5173
- `npm run lint`: oxlint
- `npm run build`: type-check and production build

Running the app locally for me: start servers detached so they survive your
session, e.g. `setsid nohup uvicorn app.main:app --reload > /tmp/api.log 2>&1 < /dev/null &`
(same for `npm run dev`). Stop them with `pkill -f "uvicorn app.main"` /
`pkill -f vite`, in a separate command from the start. Screenshots: the dev
container has Chromium cached at
`~/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`; pip-install
`playwright` into a throwaway venv and launch with `executable_path` set to it.
Phone viewport 390×844; check layouts at 360 and 414 px wide.

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

## When a task is done (before every commit)
I review commits one by one to roll back step by step. Do these in order:

1. **See what changed** (`git status --short`, `git diff --stat`). Decide which
   files belong to this task. Leave loose files I put in the repo (PNGs,
   previews) alone. Two separate tasks = two commits.
2. **Run the checks for the side that changed** (matches CI):
   - Backend: `ruff check . && ruff format --check .` and `pytest` (start
     Postgres with `docker compose up -d --wait` if it can't connect). New
     migration: `alembic upgrade head` and make sure `alembic heads` shows one head.
   - Frontend: `npm run lint` and `npm run build` (build also catches a text
     missing its `km` or `en` half).
   - If a check fails because of this task, fix it. If it fails for something
     the task didn't touch, report it; don't fix it quietly.
3. **Tests the rules require:** tenant-scoped code → a test that one store
   can't see or change another's data (patterns in CODEBASE.md §10); order,
   payment or delivery transitions → allowed and refused transitions; totals
   (`services/pricing.py` / `lib/pricing.ts`) → amounts in integer cents, the
   two must agree. No broad endpoint tests.
4. **Docs in the same commit:**
   - models, endpoints, state machines, env vars, key files, frontend patterns → `docs/CODEBASE.md`
   - new env var → `.env.example` with a placeholder
   - new backend error message → its Khmer entry in `frontend/src/i18n/messages/apiErrors.ts`
   - any text a seller or customer sees → both `en` and `km` in `messages/<area>.ts`
   - meaningful progress → `docs/04_STATUS.md`: add to the front of the "Last
     updated" line `YYYY-MM-DD (what changed in plain words, not pushed: ...)`
     (real date from `date +%F`; if today already has an entry, put the new one
     first inside that day's parentheses). Write what a seller or customer now
     sees, not class names.
   - 01/02/03: don't edit unless I agreed in this conversation; give me the
     section and text instead.
5. **Commit** with files staged by name (never `git add -A` / `git add .`).
   Style (see `git log -10`):
   ```
   <Area or kind>: <what changed, in plain words>

   What a seller or customer now sees or can do, and why: whose decision and
   when ("founder, 2026-10-16"), what was broken and how it was checked.
   Migration ids if any. Wrap at about 72 columns.
   ```
   No AI co-author or "Generated with" lines in commits or PRs.
   Don't push or deploy.
6. **Report back**, short: Done (with short hash) / Checked (and what couldn't
   run) / How to try it in the app (page, tap, what they see) / Docs changed /
   Not pushed.

## How I like to work with you
- **Explain choices with examples.** I decide from concrete scenarios: say
  who sees it (seller in the dashboard or customer in the shop) and what it
  looks like before/after. Keep jargon out of option labels, recommendation
  first. If I say "suggest me", pick one, say why, and proceed.
- **Design decisions = options page.** Before building a new screen design,
  make a mockup page split into numbered sections, each with 2–3 options
  A/B/C side by side, one marked Recommended with a one-line why. I reply like
  "1A 2B 3A". Then build one commit per pick. For motion, start each demo in a
  state where the difference is visible, play options together slowed, with a
  "Watch:" line. Put such pages outside the repo (e.g. /tmp) unless I say so.
- **Redesign includes UX.** "Redesign" means fewer taps, clearer flows, less
  confusion, not only colours and fonts.
- **Naming:** offer standalone English names as well as Khmer ones; trust my
  spelling of romanized Khmer.
- Don't re-propose things already decided; check 04_STATUS.md first.

## UI rules
- **Calm UI, one brand colour: Navy.** Light: primary #1f3350, soft #e3e8ef,
  page #f6f7f9, line #e0e4ea, ink #161c26, muted #5b6370. Dark: primary
  #9fb7d9, on-primary #0f1a2b, soft #1c2636, page #10141a, surface #181d25,
  line #283040, ink #e9edf3, muted #9da5b2. No decorative accent colours;
  product photos carry the colour. Status colours stay semantic.
- **Red and amber only as text colour.** No red/amber backgrounds, tinted
  pills, coloured borders or tinted icon circles. Danger buttons: red text,
  neutral border.
- **Save before change.** Seller edits apply only after pressing Save, never on
  tap/pick (uploads may go to storage on pick, the shop keeps the old value
  until Save).
- **Little explaining text.** Hints only for a format ("At least 8
  characters"), a rule ("Leave empty for free delivery") or a warning ("Can't
  be undone."). One short sentence (~60 chars), plain words, "E.g." not "For
  example". No intro paragraph under page titles, no "Optional." (red * marks
  required). Every text needs English and Khmer; I check the Khmer.
- **Fonts:** Noto Sans Khmer + Inter. The "Oak Order" wordmark stays
  Kantumruy Pro (subset `font-wordmark`).
- **Logos:** Oak Order = the name with the acorn cap on the O
  (`OakOrderName` in `frontend/src/components/OakMark.tsx`); the tilted acorn
  alone (`OakMark`) only where the name doesn't fit. Never the old leaf/hexagon.
- Admin area (/admin) is English only and laptop-first; seller and customer
  screens are phone-first.

## Live data caution
The live demo shop "Oak Fashion" (/shop/zdpb5d) is open and real orders reach
me. Any script writing to the live site must first check it is logged into
that shop. Its login is in `.env` (DEMO_SELLER_*); never print it.

## Marketing videos
When I ask for a video, script, voice-over or render, follow
`.claude/skills/oak-video-edit/SKILL.md` (Windows laptop only, not the dev
container).
