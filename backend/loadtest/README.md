# Load test

How many customers the backend can serve at once before pages get slow,
and whether stock stays right when many people buy at the same moment.

- `seed.py` makes a test shop through the normal API: 30 products, every
  third with sizes, and a Facebook link.
- `locustfile.py` fills the shop with simulated customers. Each one opens
  the link, looks at 1-3 products (3-10 s per page), and 1 in 10 orders.
  The number of people grows step by step (`STEPS`, one minute each). One
  seller has the dashboard open the whole time.
- `race.py` makes a product with 5 left and sends 30 orders for it at once.
  It passes when exactly 5 go through and the other 25 are told it's sold out.

Each run ends with one line per step: a step is **ok** while 95% of answers
take under 1 s and none fail. The summary is saved in `results/`, along with
Locust's HTML report (charts) when you pass `--html`.

Setup, once (from `backend/loadtest/`):

```sh
python -m venv .venv && .venv/bin/pip install -r requirements.txt
```

## Locally, at Render's CPU

Safe and free, so you can run it as often as you like. Docker's `--cpus` gives
the API the same CPU as Render's free plan (0.1). Use `0.5` for Starter.
From the repo root:

```sh
docker compose up -d --wait
set -a && . ./.env && set +a
docker compose exec -T db psql -U "$POSTGRES_USER" -d postgres \
  -c "CREATE DATABASE social_commerce_loadtest"   # once
docker build -t oak-api backend
docker run -d --name loadtest-api --network host --cpus 0.1 --memory 512m \
  -e PORT=8001 -e RATE_LIMIT_ENABLED=false \
  -e DATABASE_URL="postgresql+asyncpg://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/social_commerce_loadtest" \
  -e JWT_SECRET=load-test-secret-at-least-32-characters-long \
  oak-api
```

Wait until `curl localhost:8001/health` answers (about 35 s at 0.1 CPU).
Then, from `backend/loadtest/`:

```sh
.venv/bin/python seed.py --host http://localhost:8001   # once per database
.venv/bin/locust -f locustfile.py --headless --only-summary --html results/report.html
.venv/bin/python race.py
docker rm -f loadtest-api                               # when done
```

## On the live site (once, before the first real seller)

This is the real thing: Render's real CPU, Neon, and the network from
Cambodia to Singapore. Do it while no real seller is using the site.
Run it from home, not the office network.

1. **How long the first customer waits after a quiet spell.** Leave the site
   alone for 20 minutes, then:
   `curl -s -o /dev/null -w "%{time_total} s\n" https://social-commerce-api.onrender.com/health`
2. **Turn rate limits off for the test.** Without this, the limit of 300
   requests a minute per IP stops the test after a few seconds. In Render,
   go to the service, then Environment, and add `RATE_LIMIT_ENABLED` =
   `false`. Saving redeploys; wait until it's live.
3. From `backend/loadtest/`:

   ```sh
   .venv/bin/python seed.py --host https://social-commerce-api.onrender.com
   .venv/bin/locust -f locustfile.py --headless --only-summary --html results/report-live.html
   .venv/bin/python race.py
   ```

   While it runs, watch the CPU and memory on Render's **Metrics** tab, and
   the compute on Neon's **Monitoring** page.
4. **Turn rate limits back on:** delete `RATE_LIMIT_ENABLED` in Render.
   Once it's live, run the rate-limit check in `docs/04_STATUS.md` Notes
   (11 wrong logins end in a 429).
5. **Hide the test shop.** The app can't delete a shop, so turn its seller
   off in Neon's SQL Editor. This makes the shop a 404 and blocks its login.
   Nothing is deleted:
   `UPDATE seller SET is_active = false WHERE email LIKE 'loadtest-%@example.com';`

Send the summary lines (and `results/report-live.html` if you like) to
Claude to compare with the local numbers.
