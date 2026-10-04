# Database Backups

Every night at 02:00 (Phnom Penh) GitHub Actions copies the production
database (Neon) into a private Cloudflare R2 bucket
(`.github/workflows/backup.yml`). The last 30 nights are kept. Neon free
can only undo the last 6 hours on its own.

Cost: $0 (GitHub Actions free minutes, R2 free storage; each copy is a
few MB).

---

## One-time setup (founder)

1. **Private bucket.** Cloudflare dashboard → R2 → Create bucket, name
   `social-commerce-backups`. Leave **Public access off** (no r2.dev URL,
   no custom domain): the copies hold customers' names, phones and
   addresses. Do not use the photo bucket, which is public.
2. **Keep 30 nights.** In the new bucket: Settings → Object lifecycle
   rules → Add rule: prefix `nightly/`, delete objects 30 days after
   upload.
3. **Token for this bucket only.** R2 → Manage API tokens → Create
   Account API token: permission **Object Read & Write**, applied to
   **`social-commerce-backups` only**. Copy the Access Key ID and Secret
   Access Key (shown once).
4. **GitHub secrets.** Repo → Settings → Secrets and variables → Actions
   → New repository secret, five times:

   | Name | Value |
   |---|---|
   | `BACKUP_DATABASE_URL` | Neon's **direct** connection string (as in Render's `DATABASE_URL`, `postgresql://...?sslmode=require`) |
   | `BACKUP_R2_ACCOUNT_ID` | the same account ID as Render's `R2_ACCOUNT_ID` |
   | `BACKUP_R2_BUCKET` | `social-commerce-backups` |
   | `BACKUP_R2_ACCESS_KEY_ID` | from step 3 |
   | `BACKUP_R2_SECRET_ACCESS_KEY` | from step 3 |

5. **Test it.** Repo → Actions → Nightly database backup → Run workflow.
   It takes about a minute; the run's summary says
   `Saved nightly/social-commerce-<date>.dump (…)`, and the file shows in
   the bucket.

If a night fails, GitHub emails you. A missed night doesn't break the
next one.

---

## Restoring

Restore into a **new** database first, check it, then decide. Never
restore over production straight away.

1. Download the night you want from the bucket (Cloudflare dashboard →
   R2 → `social-commerce-backups` → `nightly/` → the file → Download).
2. In Neon, create a new branch (or database) to restore into, and copy
   its direct connection string as `$TARGET`.
3. The row-level security role, which a dump doesn't carry:

   ```sh
   psql "$TARGET" -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN CREATE ROLE app_user NOLOGIN; END IF; END \$\$;" -c "GRANT app_user TO CURRENT_USER;"
   ```

4. Restore (pg_restore 17, or the version of the server):

   ```sh
   pg_restore --no-owner --dbname="$TARGET" social-commerce-<date>.dump
   ```

5. Check it (`psql "$TARGET" -c 'select count(*) from "order"'`), then
   either point Render's `DATABASE_URL` at it, or copy back only what
   was lost.

A restore of the local dev database was tested this way on 2026-10-04
(same row counts, row-level security in place).
