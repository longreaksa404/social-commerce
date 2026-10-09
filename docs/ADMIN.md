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

## A seller wants their shop closed, reopened or erased

Sellers close their own shop in **Settings → Close shop** (with their
password): the shop link and their logins (and their staff's) stop at
once, and nothing is erased. The commands take the owner's email; they
close, reopen and erase the staff's logins with the shop. To do it for them:

```bash
python -m app.admin close-shop seller@example.com
```

To open a closed shop again (the seller can log in, the link works):

```bash
python -m app.admin reopen-shop seller@example.com
```

To erase a closed shop for good (only after the seller asks, in writing):

```bash
python -m app.admin erase-shop seller@example.com
```

It shows the shop's name and how many products, orders and customers it
has, then asks you to type the shop's link name (the part after
`/shop/`). It deletes the account, the shop and everything in it
(products, orders, customers, links, alerts) and its photos and logo in
R2. It refuses a shop that's still open. This can't be undone, except
that the nightly backups (docs/BACKUPS.md) still hold the shop for up
to 30 days.

---

## Photos moved to a new address

When the R2 bucket gets a new public address (its `r2.dev` address →
`images.oaksolve.com`, at the switch-over to oaksolve.com), the photos
and logos already saved still point at the old one, and saving such a
product is refused as "Invalid product image". Right after changing
`R2_PUBLIC_URL` in Render:

```bash
python -m app.admin move-photos https://pub-xxxx.r2.dev https://images.oaksolve.com
```

The old address first, then the new one (both `https://`). The files
don't move; only the saved addresses change. It says how many products
and logos it changed. Running it again changes nothing; swapping the two
addresses undoes it.
