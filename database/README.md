# Database

| File | What it is |
|---|---|
| `schema.sql` | Full current structure of the `public` schema: 31 tables, row-level security policies, grants, SQL functions (detection, ranking, versioning, retention), the trigger, and two private storage buckets |
| `seed.sql` | Setup data: 13 categories, 56 metrics with official thresholds, 29 sources, source settings, holidays, tax deadlines, release calendar |
| `cron.sql` | The 11 scheduled jobs (pg_cron + pg_net) |
| `create-admin.sql` | Gives one account the admin role |
| `../drizzle/migrations/` | Full migration history (for existing installs and auditing) |

Nothing personal is included: no users, roles, collected readings, raw evidence, jobs or logs. A new install starts empty and fills up from the first ingest run.

## Install (Supabase cloud or self-hosted)
```sh
DATABASE_URL='postgresql://postgres:PASSWORD@HOST:5432/postgres' \
SITE_URL='https://signals.example.org' CRON_SECRET='same-as-LOVABLE_CRON_SECRET' \
./scripts/setup-db.sh
```
Supabase cloud: use the **session-mode** connection string (Project Settings → Database). Enable the `pg_cron` and `pg_net` extensions first (Database → Extensions). Deploy the app before running cron, so the jobs have a URL to call. You can also run `./scripts/setup-db.sh --no-cron` now and the cron part later.

## Plain Postgres (without Supabase)
The app uses the Supabase Data API (PostgREST) and Auth, so Supabase is strongly recommended. Self-hosted Supabase on Docker is free. If you really want bare Postgres, create these first: roles `anon`, `authenticated`, `service_role`; the `auth` schema with `auth.users` and `auth.uid()`; and `storage.buckets`. You will also need PostgREST and GoTrue in front of it.

## Verified
`schema.sql` + `seed.sql` were applied to a blank Postgres 17 with Supabase role stubs. The result was 31 tables, 29 policies, 56 metrics, 29 sources and 13 categories, and the detection function runs.

## After changing the schema (maintainers)
Add a migration, apply it, then run `DATABASE_URL=... ./scripts/export-db.sh` to regenerate `schema.sql` and `seed.sql`.
