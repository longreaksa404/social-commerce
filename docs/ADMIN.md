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
DATABASE_URL='postgresql://...?sslmode=require' python -m app.admin reset-password 012345678
```

Without it, the command changes your local database.

The commands name a seller by their login: the phone number they log in
with, written any way (`012 345 678`, `+855 12 345 678`), or, for
accounts made before 2026-10-09 (your test shops and their staff), their
email.

---

## A seller forgot their password

Sellers whose shop has Telegram connected can reset it themselves:
"Forgot password?" on the login page sends a link to that Telegram chat
(every shop starts with it: signing up connects the chat the phone number
was shared in). For anyone else:

```bash
python -m app.admin reset-password 012345678
```

It prints a new password like `k7mx-9qp4-hd2a` and logs out every phone
on that account. Send it to the seller (call or Telegram, not a public
comment) and ask them to change it in **Settings → Your account**.

## A seller wants their shop closed, reopened or erased

Sellers close their own shop in **Settings → Close shop** (with their
password): the shop link and their logins (and their staff's) stop at
once, and nothing is erased. The commands take the owner's login; they
close, reopen and erase the staff's logins with the shop. To do it for them:

```bash
python -m app.admin close-shop 012345678
```

To open a closed shop again (the seller can log in, the link works):

```bash
python -m app.admin reopen-shop 012345678
```

To erase a closed shop for good (only after the seller asks, in writing):

```bash
python -m app.admin erase-shop 012345678
```

It shows the shop's name and how many products, orders and customers it
has, then asks you to type the shop's link name (the part after
`/shop/`). It deletes the account, the shop and everything in it
(products, orders, customers, links, alerts) and its photos and logo in
R2. It refuses a shop that's still open. This can't be undone, except
that the nightly backups (docs/BACKUPS.md) still hold the shop for up
to 30 days.

---

## A customer wants their details removed

The Data deletion page (order.oaksolve.com/data-deletion) tells
customers to ask the shop or Oak Order, and promises it within 30 days.
With the shop's link name (after `/shop/`) and the phone number they
ordered with:

```bash
python -m app.admin forget-customer sokha-fashion 012345678
```

Their name becomes "(removed)", and their phone number, addresses, map
pins and notes go from that shop's customer list, orders and alerts. The
orders stay, with their items and money, for the seller's records. Tell
the customer when it's done. A whole shop and its account are erased
with `erase-shop` (above).

---

## A shop to try things on

Signing up in the app needs a phone number checked in Telegram, and each
number gets one shop. For a shop to test with (the load test,
`backend/loadtest/README.md`):

```bash
python -m app.admin test-shop                      # or --name "Something"
```

It prints the shop's link name and an email and password to log in with
("Log in with email instead" on the login page). Close it when you're
done: `python -m app.admin close-shop test-xxxx@example.com`.

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
