---
name: finish-task
description: Wrap up a finished task in this repo the founder's way, then commit it. Runs the right checks (ruff, pytest, oxlint, build) for what changed, adds the tests and doc updates the project rules require (04_STATUS.md, CODEBASE.md, .env.example, Khmer texts), commits only the task's files with a message in the repo's style, and reports how to check it. Use this whenever a task, fix or phase step is done and about to be committed, or when the founder says "commit", "wrap up", "finish", "done", "/finish-task", or asks to update the status. Use it before every commit in this repo, even small ones.
---

# Finish a task

The founder works on this part-time and reviews commits one by one to roll back
step by step. A commit that skips a check, misses a doc, or sweeps in unrelated
files costs them an evening. This skill makes every commit clean and
reviewable.

Work through the steps in order. If a step doesn't apply, skip it without
comment, but mention in the report anything you couldn't run.

## 1. See what changed

```bash
git status --short
git diff --stat
git diff --cached --stat
```

Decide which files belong to **this task**. Leave everything else alone. For
example, loose files at the repo root (logo PNGs, previews) that the founder
put there are not part of a code task. If the changes cover two separate tasks,
make two commits.

## 2. Run the checks for the side that changed

Only run the side that changed. That matches CI (`.github/workflows/ci.yml`),
so a pass here means a pass there.

**Backend** (anything under `backend/`), from `backend/` with `.venv`:

```bash
ruff check . && ruff format --check .
pytest
```

- pytest needs Postgres. If it can't connect, run `docker compose up -d --wait`
  from the repo root and try again.
- If a migration was added, also run `alembic upgrade head` against the dev DB.
  Make sure it's the only head (`alembic heads`).
- If `ruff format --check` fails, run `ruff format .`. It is safe to do.

**Frontend** (anything under `frontend/`), from `frontend/`:

```bash
npm run lint
npm run build
```

`build` type-checks too. It also catches a text missing its `km` or `en` half,
because the message files use `satisfies Tree`.

If a check fails because of this task, fix it and run it again. If it fails
for something the task didn't touch, don't fix it quietly. Report it.

## 3. Tests the project rules require

Add a test (if the task didn't already) when the change touches:

- **Tenant-scoped code** (a seller query, a service, a new model with
  `tenant_id`): add a test proving one store can't see or change another
  store's data. The project's patterns are in `docs/CODEBASE.md` §10 "Test
  patterns".
- **Order, payment or delivery transitions, or the completion rule:** add the
  allowed and refused transitions.
- **Order or payment totals** (`services/pricing.py`, or `lib/pricing.ts` on
  the frontend): add the amounts in integer cents. The two must still agree.

Don't write broad endpoint tests. That's against the MVP rule. Frontend changes
need no automated tests.

## 4. Docs, in the same commit

Check each item against the diff:

| If the change touches... | Update |
|---|---|
| models, endpoints, state machines, env vars, key files, frontend patterns | `docs/CODEBASE.md` (the matching section) |
| a new env var | `.env.example` with a placeholder value, never a real one |
| a new backend error message | its Khmer entry in `frontend/src/i18n/messages/apiErrors.ts` |
| any text a seller or customer sees | both `en` and `km` in `messages/<area>.ts` |
| meaningful progress | `docs/04_STATUS.md` (see below) |

**04_STATUS.md:**

- Add to the front of the "Last updated" line: `YYYY-MM-DD (what changed in
  plain words, not pushed: ...)`. If the line already has today's date, put the
  new entry first inside that day's parentheses and move the older ones to
  "before that the same day". Use the real date (`date +%F`).
- Then update Done / In Progress / Blockers / Next Up as they apply.
- Write it the way the existing entries read: what a seller or customer now
  sees, not class names.

**01 / 02 / 03:** if the work changed a decision in those docs, don't edit them
on your own. Tell the founder the exact section and the text to change. Edit
them only if the founder already agreed in this conversation.

## 5. Commit

Stage the task's files by name. Don't use `git add -A` or `git add .`: they
would sweep in the founder's loose files.

Message style (see `git log -10` for real examples):

```
<Area or kind>: <what changed, in plain words>

What a seller or customer now sees or can do, and why: whose decision and
when ("founder, 2026-10-16"), what was broken and how it was checked.
Migration ids if any. Wrap at about 72 columns.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

- The prefix is the feature or the kind of change, for example `App:`, `Fix:`,
  `Docs:`, `Plan:`, `Shop colour:`, `Logo:`.
- The title is a sentence a non-programmer can read: "Fix: shop pages 500 on
  Vercel (middleware imported linkPreview.ts)".
- Use the attribution line from the current system reminder if it differs from
  the one above.

Don't push and don't deploy. Those wait until the founder asks.

## 6. Report back

Keep it short, in this order:

1. **Done:** one or two lines on what the commit does (with its short hash).
2. **Checked:** which checks ran and passed. Name anything you couldn't run
   and why.
3. **How to try it:** the exact steps in the app (which page, what to tap, what
   they should see). Include commands only if something new is needed (a
   migration, a new env var).
4. **Status / docs:** which docs changed. If 01/02/03 need an edit, give the
   section and the text.
5. **Not pushed.**
