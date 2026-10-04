#!/usr/bin/env bash
# One-command Docker install for Thailand Daily Signals.
#   ./install.sh                 # interactive
#   SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... ./install.sh -y
# Steps: check Docker → write .env (random scheduler secret) → install tables → build + start app and
# scheduler → wait for health → run the first data fetch → print next steps.
set -euo pipefail
cd "$(dirname "$0")"
YES=0; [[ "${1:-}" == "-y" ]] && YES=1

say() { printf '\033[1m→ %s\033[0m\n' "$*"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
ask() { # ask VAR "question" default
  local v="${!1:-}"; if [[ -z "$v" && $YES -eq 0 ]]; then read -r -p "$2${3:+ [$3]}: " v; fi
  printf -v "$1" '%s' "${v:-${3:-}}"; }

command -v docker >/dev/null || die "Docker not found. Install: https://docs.docker.com/get-docker/"
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 not found (docker compose)."

if [[ -f .env ]] && grep -q '^SUPABASE_SERVICE_ROLE_KEY=.\+' .env && ! grep -q 'sb_secret_xxx' .env; then
  say "Using existing .env"
else
  say "Configure (values from your Supabase project → Project Settings → API / Database)"
  ask SUPABASE_URL "Supabase URL (https://xxxx.supabase.co)"
  ask SUPABASE_PUBLISHABLE_KEY "Publishable / anon key"
  ask SUPABASE_SERVICE_ROLE_KEY "Service role / secret key"
  ask DATABASE_URL "Postgres connection string (session mode)"
  ask SITE_URL "Public site URL" "http://localhost:8787"
  ask ADMIN_EMAIL "Admin email" "admin@example.org"
  ask FIRECRAWL_API_KEY "Firecrawl key (optional, Enter to skip)" ""
  ask AI_API_KEY "AI API key, OpenAI-compatible (optional)" ""
  [[ -n "$SUPABASE_URL" && -n "$SUPABASE_PUBLISHABLE_KEY" && -n "$SUPABASE_SERVICE_ROLE_KEY" ]] || die "URL and both keys are required."
  REF=$(sed -E 's#https://([a-z0-9]+)\.supabase\.co.*#\1#' <<<"$SUPABASE_URL")
  SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
  umask 077
  cat > .env <<EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID=$REF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL=$DATABASE_URL
LOVABLE_CRON_SECRET=$SECRET
VITE_SITE_URL=$SITE_URL
VITE_ADMIN_EMAIL=$ADMIN_EMAIL
AI_BASE_URL=
AI_API_KEY=$AI_API_KEY
FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY
EOF
  say ".env written (scheduler secret generated)"
fi
set -a; . ./.env; set +a
PORT="${APP_PORT:-8787}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  say "Installing tables + setup data"; docker compose --profile init run --rm db-init
else
  echo "• DATABASE_URL empty — skipping table install (run database/*.sql yourself)"
fi

say "Building and starting app + scheduler (first build takes a few minutes)"
docker compose up -d --build app scheduler

say "Waiting for the app"
for i in $(seq 1 60); do curl -fs -o /dev/null "http://localhost:$PORT/" && break; sleep 3; [[ $i -eq 60 ]] && die "App did not start — docker compose logs app"; done

say "First data fetch (can take 1–3 minutes)"
curl -s -m 290 -X POST -H "Authorization: Bearer $LOVABLE_CRON_SECRET" "http://localhost:$PORT/api/public/ingest?mode=daily" | head -c 400; echo
curl -s "http://localhost:$PORT/api/public/health" | head -c 400; echo

cat <<EOF

✓ Running at http://localhost:$PORT   (scheduler is fetching on the built-in timetable)
Next:
  1. Supabase → Authentication → Add user ($ADMIN_EMAIL, strong password), then:
       docker compose run --rm --entrypoint psql scheduler "\$DATABASE_URL" -c \\
         "insert into public.user_roles(user_id,role) select id,'admin' from auth.users where email='$ADMIN_EMAIL' on conflict do nothing"
  2. Sign in at http://localhost:$PORT/admin/login  (username: admin)
  3. Logs: docker compose logs -f app scheduler    Stop: docker compose down
EOF
