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
- Live data refresh is on-demand: the homepage calls a server function that refreshes when live data is >3h old, guarded by a `job_locks` lease — avoids needing a cron secret.
- The AI daily brief is regenerated only when the day's signal set (signature) changes — bounds AI cost.
- Public data is read from the browser client under anon SELECT RLS; all writes happen server-side with the admin client.
- Observations carry `is_demo`; families carry `is_live` so the UI can always label real vs illustrative data.
- News comes from newspaper RSS feeds parsed server-side and keyword-tagged to an agency and signal family; only tagged items are stored — keeps news relevant to signals.
- Signal sensitivity is a per-device preference in localStorage that filters by severity on the client — there are no user accounts.
