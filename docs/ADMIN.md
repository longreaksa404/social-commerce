# Founder's Tools

There's no admin screen in the MVP. The few things only the founder does
are commands in `backend/app/admin.py`, run by hand from `backend/` with
the virtual environment active (`source .venv/bin/activate`).

## On the live site

The commands use `DATABASE_URL`. For the live database, put Neon's
**direct** connection string (as in Render's `DATABASE_URL`) in front of
the command. It wins over the `.env` file, and only lasts for that one
command:

```bash
DATABASE_URL='postgresql://...?sslmode=require' python -m app.admin reset-password seller@example.com
```

Without it, the command changes your local database.

---

## A seller forgot their password

Sellers whose shop has Telegram connected can reset it themselves:
"Forgot password?" on the login page sends a link to that Telegram chat.
For anyone else:

```bash
python -m app.admin reset-password seller@example.com
```

It prints a new password like `k7mx-9qp4-hd2a` and logs out every phone
on that account. Send it to the seller (call or Telegram, not a public
comment) and ask them to change it in **Settings → Your account**.
