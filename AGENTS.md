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
- Official open data is tracked via the gdcatalog.go.th CKAN API (`src/lib/catalog.server.ts`): one snapshot per dataset per Bangkok day, diffs vs the previous snapshot go to `gov_changes`, and catalog code writes one signal per agency/day directly (detect_signals skips metrics without observations).
- Signal strictness lives in SQL: `metrics.min_pct`/`max_gap_days`, `families.trust` (medium needs 1.5x threshold, demo capped at medium) and each signal stores the passed rules in `signals.checks` for the explain dialog.
- Every fetch attempt is appended to `source_run_history` (30-day retention) for the /monitor page; unseen-change tracking is per-device in localStorage.
- Daily Brief is published at 06:00 Bangkok by pg_cron POSTing `/api/public/brief` (forced refresh + publish); items (what/importance/impact/advice) are computed deterministically in `src/lib/impact.ts` from real signals only, AI writes just the intro, and the published edition is frozen for the day.
- Lottery results come only from the official GLO API (`src/lib/glo.server.ts`), stored as text in `lottery_draws` and signalled only when a second GLO endpoint confirms the first prize.
- Detection also requires changes to exceed `metrics.vol_k` × the 30-observation stddev of daily changes when ≥10 points exist.
- Signals are ranked by SQL `public.rank_signals(date)` (severity weight × z/vol_k factor × source trust × `families.reach`), components stored in `signals.checks.score` — ranking is formula-based and auditable on /method.
- AI brief text is rejected if it contains any number not present in the code-computed facts (`numbersInText` in `src/lib/impact.ts`) — the LLM only phrases.
- A daily 05:30 Bangkok pg_cron POSTs `/api/public/ingest?mode=daily` to force all government sources once per day; runs are tagged `run_kind` (hourly/daily/manual) — guarantees a daily official-data snapshot.
- Food prices come from CheckRaka (`src/lib/checkraka.server.ts`, schema.org ItemList JSON-LD), an aggregator — family trust is medium; fetched on daily/manual runs or when today's prices are missing.
- User-chosen update times are per-device (localStorage `times`) and run in the browser via `ScheduledRefresh` in __root (calls the rate-limited `retrySources`); no accounts, so no per-user server schedules.
- Household daily cost uses a fixed reference basket (`BASKET` in `src/lib/impact.ts`) × latest vs previous real observations, shown by `HouseholdBasket` on home/day/brief — cost math is code-only and reusable.
- Farm prices come from RakaKaset (`src/lib/rakakaset.server.ts`, HTML table parse; future-dated rows skipped), fetched with CheckRaka on daily/manual runs; Bangkok traffic is the Longdo index (level bands) in `connectors.server.ts`.
- Ingest runs through a Postgres worker queue (`ingest_jobs`, one job per source, claimed by `claim_ingest_job()` with SKIP LOCKED, up to 3 attempts with backoff; `src/lib/queue.server.ts`) — one failing source never blocks others and retries are picked up by the next scheduled run.
- Every outbound fetch inside a job is archived as raw evidence (`src/lib/evidence.server.ts`): original bytes in the private `evidence` bucket (dedup by sha256, kept forever), indexed in `raw_evidence`, opened via short-lived signed URLs — makes every value auditable.
