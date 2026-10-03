# Deployment

You need two things: **a database** (Supabase) and **somewhere to run the app** (Cloudflare Workers, Docker, or any server). Do them in this order.

## 1. Database

### Option A — Supabase Cloud (easiest, free tier works)
1. Create a project at https://supabase.com and pick the Singapore region (closest to Thailand).
2. Database → Extensions: enable **pg_cron** and **pg_net**.
3. Authentication → Providers → Email: turn **off** "Allow new users to sign up".
4. Project Settings → API: copy the URL, the publishable (anon) key and the secret (service_role) key.
5. Project Settings → Database: copy the **session-mode** connection string.
6. Run `./scripts/setup-db.sh --no-cron` (see `database/README.md`).

### Option B — Self-hosted Supabase (your own server, fully free)
1. Follow https://supabase.com/docs/guides/self-hosting/docker. `pg_cron` and `pg_net` are included.
2. In its `.env` set `DISABLE_SIGNUP=true`.
3. Use its `API_EXTERNAL_URL`, `ANON_KEY` and `SERVICE_ROLE_KEY` as the Supabase values in this project's `.env`.
4. Run `./scripts/setup-db.sh --no-cron` with `DATABASE_URL=postgresql://postgres:POSTGRES_PASSWORD@your-host:5432/postgres`.

## 2. App

### Option A — Cloudflare Workers (recommended, free tier works)
```sh
bun install
cp .env.example .env            # fill in the VITE_* values; they are baked in at build time
bun run build
npx wrangler@4 login
for s in SUPABASE_URL SUPABASE_PUBLISHABLE_KEY SUPABASE_SERVICE_ROLE_KEY LOVABLE_CRON_SECRET; do npx wrangler@4 secret put $s; done
# optional: AI_BASE_URL AI_API_KEY LOVABLE_API_KEY FIRECRAWL_API_KEY
npx wrangler@4 deploy
```
To use your own domain: Workers → your worker → Settings → Domains & Routes.

### Option B — Docker (any VPS or home server)
```sh
cp .env.example .env    # fill in every value
docker compose up -d --build
# → http://your-server:8787   (put Caddy or Nginx in front for HTTPS)
```
The container runs the same Workers runtime (workerd) locally, so no Cloudflare account is needed.

### Option C — Without Docker
```sh
bun install && bun run build
cp .env .dev.vars       # server secrets for the local runtime
bun run start           # wrangler dev on 0.0.0.0:8787; keep it running with systemd or pm2
```

## 3. Scheduler
Once the app has a public HTTPS URL:
```sh
DATABASE_URL=... SITE_URL=https://your-site CRON_SECRET=<LOVABLE_CRON_SECRET> ./scripts/setup-db.sh
```
This re-runs schema and seed safely and installs the 11 jobs. No pg_cron? Use any external scheduler instead (see `docs/operations.md`).

## 4. First run
1. Create the admin user in Supabase Auth (Add user, with a strong password), then run `database/create-admin.sql` with that email.
2. Open `/admin/login`, sign in, and press "ดึงตอนนี้" (fetch now) on a few sources, or call `curl -X POST -H "Authorization: Bearer $CRON_SECRET" "$SITE_URL/api/public/ingest?mode=daily"`.
3. Check `/api/public/health` and `/tracking`.
4. The first daily brief is published at the next 05:55 Bangkok time. Weekly comparisons need about 2 weeks of collected data.

## Updating
Pull the new code, apply any new files from `drizzle/migrations/` in order with `psql -f`, then rebuild and deploy.
