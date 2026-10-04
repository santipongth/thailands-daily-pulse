# Self-host with Docker (one command)

## TL;DR

```sh
git clone https://github.com/<owner>/thailand-daily-signals.git
cd thailand-daily-signals
./install.sh
```

The script asks for 4 values, then does everything else on its own:

1. Checks Docker + Compose v2.
2. Writes `.env` and generates a random scheduler secret.
3. Installs the tables and setup data (13 categories, 56 metrics with thresholds, 29 sources).
4. Builds and starts the **app** and the **scheduler**.
5. Waits until the site answers, runs the first data fetch and prints the health check.

Non-interactive (CI / servers):

```sh
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
DATABASE_URL='postgresql://postgres.xxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres' \
SITE_URL=https://signals.example.org ./install.sh -y
```

## Before you start (5 minutes)

| You need | Where |
|---|---|
| Docker 24+ with Compose v2 | https://docs.docker.com/get-docker/ |
| A Supabase project (free) | supabase.com → New project (Singapore region), or [self-hosted Supabase](https://supabase.com/docs/guides/self-hosting/docker) |
| URL + publishable key + secret key | Project Settings → API |
| Connection string (**session mode**) | Project Settings → Database → Connect |
| Supabase settings | Authentication → Email → turn **off** "Allow new users to sign up" |

You can also fill these in with the in-app form at `/setup` and download the `.env` it generates. Put the file next to `install.sh`, add `DATABASE_URL=...`, and the script uses it as-is.

## What runs

| Service | Image | Job |
|---|---|---|
| `app` | built from `Dockerfile` (workerd runtime, port 8787) | website, API, MCP, fetch rounds |
| `scheduler` | `postgres:16-alpine` + busybox cron | calls the app on the official timetable (UTC). Fetches run hourly (:05), dams hourly (:20), social/custom every 30 minutes, early rounds 00:10/03:00/05:00, the full run 05:30, freeze 05:45 and publish 05:55 Bangkok time. Retention cleanup runs at 03:30. |
| `db-init` | `postgres:16-alpine` (profile `init`, one-off) | runs `scripts/setup-db.sh --no-cron`; safe to re-run |

The scheduler replaces Supabase pg_cron, so it works even if the server isn't reachable from the internet. **Don't also install `database/cron.sql`**, or every job runs twice.

Per-source schedules set in admin → source manager (on/off, hourly, custom times such as 05:20) apply automatically. The 30-minute round picks them up.

## Daily commands

```sh
docker compose ps                         # status (app shows "healthy")
docker compose logs -f app scheduler      # live logs; scheduler prints each call
docker compose restart app                # after editing .env server secrets
docker compose up -d --build              # after git pull or changing VITE_* values
docker compose --profile init run --rm db-init   # re-apply schema/seed after an update
docker compose down                       # stop
curl -X POST -H "Authorization: Bearer $LOVABLE_CRON_SECRET" "http://localhost:8787/api/public/ingest?mode=daily"   # fetch now
```

## Verify it really updates

1. `curl localhost:8787/api/public/health`: each source shows `fresh` once fetched.
2. Open `/`: the "สัญญาณวันนี้" header and the section times show today's data. Signals appear only when values cross official thresholds, so a new install may show few cards at first. Weekly comparisons need about 14 days.
3. Admin → จัดการแหล่งข้อมูล: "สำเร็จล่าสุด" (last success) and "รอบถัดไป" (next run) update after each scheduler call.

## Admin account

```sh
# 1. Supabase → Authentication → Add user (your admin email, strong password)
# 2. give it the admin role:
docker compose run --rm --entrypoint psql scheduler "$DATABASE_URL" -c \
  "insert into public.user_roles(user_id,role) select id,'admin' from auth.users where email='you@example.org' on conflict do nothing"
```

Then sign in at `/admin/login` with the username `admin` (maps to `VITE_ADMIN_EMAIL`) or the full email.

## HTTPS and domain

Put Caddy in front: `signals.example.org { reverse_proxy localhost:8787 }`. Set `SITE_URL`/`VITE_SITE_URL` to the https address and run `docker compose up -d --build`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Site shows no data | `docker compose logs scheduler`. The `401` means `LOVABLE_CRON_SECRET` changed: restart both services. |
| `db-init` fails "permission denied" | use the **session mode** connection string, user `postgres` |
| Sources "blocked" (X, BMA flood, EPPO) | add `FIRECRAWL_API_KEY`; others still run |
| AI intro missing | add `AI_API_KEY` (+ `AI_BASE_URL` if not OpenAI) — optional |
| Changed `VITE_*` but no effect | they are baked at build: `docker compose up -d --build` |
| Port in use | `APP_PORT=8080 docker compose up -d` |
