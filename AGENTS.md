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

- Detection is SQL `detect_signals(date)`: per-metric kind delta/level/release, thresholds, `min_pct`/`max_gap_days`/`vol_k`×30-obs stddev, `families.trust` (medium 1.5x, demo capped medium); passed rules stored in `signals.checks` — consistent and explainable.
- Ranking is SQL `rank_signals(date)`: severity × z/vol_k × trust × `reach` × evidence factor (1.0 if source raw file changed that Bangkok day, else 0.8; `family_evidence_source`); demo zeroed on real days; breakdown in `checks.score` — auditable, never news-driven.
- Ingest: Postgres queue `ingest_jobs` (one job/source, `claim_ingest_job()` SKIP LOCKED, 3 attempts; `queue.server.ts`), hourly cron `/api/public/ingest` (3-hour general freshness gate, separate hourly Longdo gate by UTC hour), daily 05:30 `?mode=daily`, gold/FX/RakaKaset only at 05:00 Bangkok daily (05:30 retries failures; `DAILY_05`), dams-only `?mode=dams` hourly :20 (10-min lease, independent of brief), `run_kind` hourly/daily/manual — isolated failures without redundant Longdo runs.
- Brief: cron 05:45 `?step=freeze` (cutoff) and 05:55 `?step=publish`; items from real signals with event_id/version, data date, score and evidence; AI writes only intro (rejected if new numbers); frozen once published, later event versions go to `brief_updates`; completeness stored per edition.
- Every observation keeps refers-to (`observed_on`/period), published, `received_at` and `effective_from`; connectors may return per-metric dates; unchanged re-fetches are not rewritten so `received_at` stays honest for replay.
- `source_registry` holds owner/channel/licence/cadence/unit/area/`stale_after_days` (default and all current rows = 1 day); `completeness.ts` marks sources ok/stale/unverifiable — never treated as no change.
- Signals are versioned by trigger `record_signal_version` into `signal_events`/`signal_versions` (event_id = metric:date; new version only on content change; delete = withdrawal); detection logic is `detect_core(date, cutoff)`, reused by `replay_signals` (data received by 05:45).
- Readers have no accounts: personal preferences (sources, sensitivity, interval, update `times`, seen state) are per-device localStorage; `ScheduledRefresh`/`BriefAlert` in __root run in the browser.
- Public reads via browser client under anon SELECT RLS; writes server-side with admin client. `is_demo`/`is_live` label real vs illustrative data.
- Household impact per signal = `impactFor` in impact.ts: `USAGE` holds per-metric usage with source/method/official flag (official = gov per-person or national figure converted per household; else labelled example); user overrides only on /impact via localStorage, briefs always use official — one formula, recomputable.
- Brief data window = 00:00 → 05:45 Bangkok on the brief day (forced `?mode=early` runs 00:10/03:00/05:00 + 05:30 daily); on freeze/publish signals whose observation `received_at` is after it are excluded (become brief_updates); window stored in `daily_briefs.data_window` (first/last received, excluded with reason) and shown on brief, /events and /impact — honest cutoff.
- The masthead ticker reads today's ranked signals directly and links each item to its family page; it never creates fallback numbers or changes detection logic .

- Source-specific fetch rules live in `src/lib/AGENTS.md`.
- Brief front page (`brief-frontpage.tsx`): numbers only from brief items/real rows; AI illustrations (`brief-images.server.ts`, private bucket `brief-images`, signed URLs via `getBriefImages`) generated after publish, no text in images, labelled AI; 402/403 pause via app_settings `brief_images_paused`.
- Public integrations are read-only: REST `/api/public/v1`, OpenAPI, and MCP share anon-RLS reads; never expose writes, admin access, queues/settings, private files, or evidence paths; UI uses shared responsive editorial primitives.

- Admin area: pathless `_admin` layout (ssr:false) gates internal pages (agencies, events, impact, calendar, data, evidence, method, sources, tracking, settings, /admin) by `has_role(admin)` from `user_roles`; site-wide writes and private-file links use `requireAdmin` middleware; public sign-up disabled, readers need no account — no settings changeable by visitors.
- Retention: `pruneOldJobs` (daily run + admin button) deletes done/failed jobs and run history older than 30 days; evidence never deleted. Public API v1 rate-limited 120/min/IP via `hit_rate_limit`; detection/rank/claim SQL functions executable by service role only.
- Brief share image = `/api/public/og/brief/$date` streaming the day's AI hero (no text); `/search` queries real signals and brief_updates only.
