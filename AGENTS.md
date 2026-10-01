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
- Ingest: Postgres queue `ingest_jobs` (one job/source, `claim_ingest_job()` SKIP LOCKED, 3 attempts; `queue.server.ts`), hourly cron `/api/public/ingest` (staleness-gated), daily 05:30 `?mode=daily`, `run_kind` hourly/daily/manual — isolated failures, daily official snapshot.
- Sources: connectors `{metric_id: value}` in `connectors.server.ts`; crawlers (baseline links → `gov_*` new announcements); gdcatalog CKAN daily snapshots → `gov_changes`; CheckRaka/RakaKaset aggregators (trust medium); GLO lottery confirmed by 2nd endpoint; outcomes in `source_runs` + `source_run_history` (30d).
- Every job fetch is archived as raw evidence (private `evidence` bucket, sha256 dedup, kept forever, `raw_evidence`, signed URLs); `/evidence` diffs vs previous different-hash file of same URL — every value auditable.
- News RSS is keyword-tagged to agency/family and only tagged items stored; it never creates signals.
- Brief: 06:00 cron `/api/public/brief`; items computed in `impact.ts` from real signals; AI writes only intro, rejected if it has numbers not in facts; regenerated only on signature change; frozen once published.
- Household cost = fixed `BASKET` × real price changes (`impact.ts`, `HouseholdBasket`) — code-only math.
- No accounts: all preferences (sources, sensitivity, interval, update `times`, seen state) are per-device localStorage; `ScheduledRefresh` and `BriefAlert` in __root run in the browser.
- Public reads via browser client under anon SELECT RLS; writes server-side with admin client. `is_demo`/`is_live` label real vs illustrative data.
