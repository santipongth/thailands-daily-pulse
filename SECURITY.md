# Security policy

## Reporting a vulnerability
Please **do not open a public issue**. Use GitHub's private report instead: *Security → Report a vulnerability*. You should hear back within 7 days.

## What counts
- Any way to write data, run ingestion, publish or rerun briefs, or change settings without the admin role
- Reading private storage (`evidence`, `brief-images`), queues/jobs, settings or user data through the public API, MCP or the database client
- Leaking `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_CRON_SECRET`, AI or Firecrawl keys
- Bypassing the API rate limit at scale

## Design guarantees for self-hosters
- Readers have no accounts. Keep **public sign-up disabled** in your auth settings.
- Admin = a row in `user_roles` checked by `has_role()` on the server. It is never checked in the browser.
- The service-role key is used only inside server handlers. Never give it a `VITE_` name.
- `/api/public/ingest` without the secret only performs stale-guarded refreshes. Forced, backfill and rerun modes require the cron secret.
- Rotate the cron secret with `LOVABLE_CRON_SECRET_PREVIOUS` (both accepted during the switch).
