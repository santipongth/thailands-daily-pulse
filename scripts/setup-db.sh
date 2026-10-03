#!/usr/bin/env bash
# Install the Thailand Daily Signals database into a fresh Supabase (cloud or self-hosted) Postgres.
# Usage:
#   DATABASE_URL=postgresql://postgres:PASS@HOST:5432/postgres \
#   SITE_URL=https://signals.example.org CRON_SECRET=long-random-string \
#   ./scripts/setup-db.sh            # add --no-cron to skip scheduled jobs
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DATABASE_URL:?Set DATABASE_URL (Supabase: Project Settings → Database → Connection string, session mode)}"
NO_CRON=0; [[ "${1:-}" == "--no-cron" ]] && NO_CRON=1

run() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$1"; }

echo "→ schema"; run database/schema.sql
echo "→ seed";   run database/seed.sql
if [[ $NO_CRON -eq 0 ]]; then
  : "${SITE_URL:?Set SITE_URL (public URL of your deployed app) or pass --no-cron}"
  : "${CRON_SECRET:?Set CRON_SECRET (same as LOVABLE_CRON_SECRET in the app) or pass --no-cron}"
  echo "→ cron"
  tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
  sed -e "s#YOUR_SITE_URL#${SITE_URL%/}#g" -e "s#YOUR_CRON_SECRET#${CRON_SECRET}#g" database/cron.sql > "$tmp"
  run "$tmp"
fi
echo "✓ Database ready. Next: create your admin user, then run database/create-admin.sql (edit the email)."
