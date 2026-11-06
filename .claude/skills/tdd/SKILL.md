---
name: tdd
description: Use when changing backend order, payment or delivery state transitions, or totals in services/pricing.py, before writing the code. Not for frontend, config or docs.
model: sonnet
---

# Test first, for the code the rules require tests for

Scope (AGENTS.md): pytest tests only for
- order, payment and delivery transitions: allowed and refused ones
- totals in `services/pricing.py` (integer cents, must agree with `lib/pricing.ts`)
- tenant-scoped code: one store can't see or change another's data (CODEBASE.md §10)

Everything else: no new tests, just run the existing checks.

## Steps
1. Write the smallest test that shows the new behaviour.
2. Run only that test (`pytest path::name`). It must fail for the expected
   reason. If it passes, the test is wrong or the behaviour already exists.
3. Write the least code that makes it pass. Run that test again.
4. Tidy up if needed, then run the full `pytest` once.

Keep tests short. No broad endpoint tests. Never run two pytest runs at once.
