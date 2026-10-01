<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md

- Signals are detected in SQL by `public.detect_signals(date)` using per-metric rules (`kind` delta/level/release + thresholds) — keeps detection consistent for seeded and live data.
- Live data refresh runs hourly via pg_cron POSTing `/api/public/ingest` (no secret: refresh is idempotent, staleness-gated >3h and lease-guarded) plus on-demand from the homepage — data stays fresh without visitors.
- Each real source is a connector in `src/lib/connectors.server.ts` returning `{metric_id: value}`; per-source outcomes go to `source_runs` — failures are isolated and visible on /data.
- The AI daily brief is regenerated only when the day's signal set (signature) changes — bounds AI cost.
- Public data is read from the browser client under anon SELECT RLS; all writes happen server-side with the admin client.
- Observations carry `is_demo`; families carry `is_live` so the UI can always label real vs illustrative data.
- News comes from newspaper RSS feeds parsed server-side and keyword-tagged to an agency and signal family; only tagged items are stored — keeps news relevant to signals.
- Signal sensitivity is a per-device preference in localStorage that filters by severity on the client — there are no user accounts.
- Agency websites without APIs are crawled by `src/lib/crawlers.server.ts`: first-seen links are stored as a baseline, later new links become `gov_*` observations (new announcements today) so detection uses official sources, not newspapers.
- Source selection and refresh interval are per-device localStorage preferences (no accounts); the interval is passed to the refresh server function, clamped 1–24h.
