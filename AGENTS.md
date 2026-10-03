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
- Ingest: Postgres queue `ingest_jobs` (one job/source, `claim_ingest_job()` SKIP LOCKED, 3 attempts; `queue.server.ts`), hourly cron `/api/public/ingest` (staleness-gated), daily 05:30 `?mode=daily`, gold/FX/RakaKaset only at 05:00 Bangkok daily (05:30 retries failures; `DAILY_05`), dams-only `?mode=dams` hourly :20 (10-min lease, independent of brief), `run_kind` hourly/daily/manual — isolated failures, daily official snapshot.
- Sources: connectors `{metric_id: value}` in `connectors.server.ts`; CheckRaka/RakaKaset aggregators (trust medium); GLO lottery confirmed by 2nd endpoint; outcomes in `source_runs` + `source_run_history` (30d).
- Every job fetch is archived as raw evidence (private `evidence` bucket, sha256 dedup, kept forever, `raw_evidence`, signed URLs); `/evidence` diffs vs previous file.
- News RSS: keyword-tagged, tagged items only; never creates signals.
- Brief: cron 05:45 `?step=freeze` (cutoff) and 05:55 `?step=publish`; items from real signals with event_id/version, data date, score and evidence; AI writes only intro (rejected if new numbers); frozen once published, later event versions go to `brief_updates`; completeness stored per edition.
- Every observation keeps refers-to (`observed_on`/period), published, `received_at` and `effective_from`; connectors may return per-metric dates; unchanged re-fetches are not rewritten so `received_at` stays honest for replay.
- `source_registry` holds owner/channel/licence/cadence/unit/area/`stale_after_days`; `completeness.ts` marks sources ok/stale/unverifiable — never treated as no change.
- Signals are versioned by trigger `record_signal_version` into `signal_events`/`signal_versions` (event_id = metric:date; new version only on content change; delete = withdrawal); detection logic is `detect_core(date, cutoff)`, reused by `replay_signals` (data received by 05:45).
- No accounts: all preferences (sources, sensitivity, interval, update `times`, seen state) are per-device localStorage; `ScheduledRefresh` and `BriefAlert` in __root run in the browser.
- Public reads via browser client under anon SELECT RLS; writes server-side with admin client. `is_demo`/`is_live` label real vs illustrative data.
- Backfill (`backfill.server.ts`, `/api/public/ingest?mode=backfill`, cron-secret) only for sources that publish history (none now); real rows replace demo rows, never real ones; then detect/rank/brief replayed oldest→newest, briefs left unpublished (archive editions).
- Household impact per signal = `impactFor` in impact.ts: `USAGE` holds per-metric usage with source/method/official flag (official = gov per-person or national figure converted per household; else labelled example); user overrides only on /impact via localStorage, briefs always use official — one formula, recomputable.
- Brief data window = 00:00 → 05:45 Bangkok on the brief day (forced `?mode=early` runs 00:10/03:00/05:00 + 05:30 daily); on freeze/publish signals whose observation `received_at` is after it are excluded (become brief_updates); window stored in `daily_briefs.data_window` (first/last received, excluded with reason) and shown on brief, /events and /impact — honest cutoff.
- The masthead ticker reads today's ranked signals directly and links each item to its family page; it never creates fallback numbers or changes detection logic .

- Source-specific fetch rules live in `src/lib/AGENTS.md`.
- Social: FM91 Trafficpro from X via Firecrawl (Facebook refused by Firecrawl), `fm91.server.ts`, cron every 30 min `?mode=social`, AI (Responses, streamed) tags is_bkk/area/summary in `social_posts`; summaries with new numbers dropped; 402/403 pauses via app_settings `social_ai_paused`; never creates signals; shown on home, brief (data window) and ticker as labelled FM91 items.
- `dam_readings`: each dams run snapshots today's dam values (even if unchanged) for the 48h hourly chart on /data-all; observations stay one row/day.
- Brief front page (`brief-frontpage.tsx`): numbers only from brief items/real rows; AI illustrations (`brief-images.server.ts`, private bucket `brief-images`, signed URLs via `getBriefImages`) generated after publish, no text in images, labelled AI; 402/403 pause via app_settings `brief_images_paused`.
- Public integrations are read-only: REST `/api/public/v1`, OpenAPI, and MCP share anon-RLS reads; never expose writes, admin access, queues/settings, private files, or evidence storage paths.

