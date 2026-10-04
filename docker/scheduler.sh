#!/bin/sh
# Scheduler container: runs the app's timed jobs with busybox crond (UTC).
set -eu
cat > /post.sh <<EOF
#!/bin/sh
echo "\$(date -u +%FT%TZ) POST \$1"
wget -q -O - -T 290 --header="Authorization: Bearer ${LOVABLE_CRON_SECRET}" --post-data='{}' "http://app:8787\$1" | head -c 300; echo
EOF
cat > /sql.sh <<EOF
#!/bin/sh
[ -n "${DATABASE_URL:-}" ] || { echo "skip (no DATABASE_URL): \$1"; exit 0; }
psql "${DATABASE_URL:-}" -qAtc "\$1"
EOF
chmod +x /post.sh /sql.sh
cp /crontab /etc/crontabs/root
echo "scheduler started (UTC $(date -u +%H:%M))"
exec crond -f -l 6
