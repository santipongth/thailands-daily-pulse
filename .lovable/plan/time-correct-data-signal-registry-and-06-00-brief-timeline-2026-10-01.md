# Time-correct data, signal registry, and 06:00 Brief timeline

Goal: every value and signal can be traced to its evidence and rule, every impact number can be recalculated, missing data is never shown as "no change", and the same event is never announced twice because of a new fetch.

## Phase 1 — Source registry
New page "ทะเบียนแหล่งข้อมูล" (`/sources`, rebuilt) with one record per source: owner, channel (API/web page/open data/RSS), usage rights/licence, update cadence, unit, area covered, and "stale after" rule (for example, food daily = stale after 2 days, GDP quarterly = stale after 100 days). Detection and the Brief read the stale rule from here instead of fixed numbers.

## Phase 2 — Four times on every value + completeness check
Each stored value keeps 4 times:
- **data refers to**: the day or period the value describes
- **published by source**: when the source published it (when known)
- **received by system**: when we fetched it
- **effective from**: when it starts to apply (for example, an oil price for tomorrow)

Today's view uses only values whose "refers to" or "effective from" date is today. Yesterday's value fetched this morning shows as yesterday. Each card shows its data date ("ข้อมูลวันที่ …").
Completeness check before writing text: each source gets "ครบ", "เก่า" (stale per registry) or "ตรวจสอบไม่ได้". Stale or missing sources are listed in the Brief and never treated as "unchanged".

## Phase 3 — Event registry + replay
Signals become versioned events:
- event_id (stable for the same real-world change), version, event type, area, compared values (before/after + their dates), rules passed, source evidence (raw file links), impact formula, advice, quality status (verified / stale source / cannot verify).
- New fetch of the same unchanged value → no new event and no new alert. A changed value for the same event → new version with reason. Corrections and withdrawals are kept as versions ("แก้ไข", "ถอน") and shown on the event page; nothing is deleted.
- New event page `/events/$id` with the full version history.
- Replay: an admin-free button on `/method` that re-runs detection for a past date using only values with "received by system" before that date's 05:45, and shows the result next to what was actually published.

## Phase 4 — 06:00 Brief timeline (as in your table, Asia/Bangkok)

```text
all day      collect per source cadence, create/update events
05:30        retry late sources, check events taking effect today
05:45        freeze the data set for the main Brief ("ข้อมูลถึง 05:45")
05:45-05:55  calculate, rank, merge duplicate events, verify evidence
05:55-06:00  build edition, completeness check, publish
after 06:00  new events go to the next edition; urgent items and corrections
             publish as timestamped updates on the same day's Brief
```

- Brief always publishes even if some sources fail, with a "ตรวจสอบไม่ได้" list.
- Original edition and every correction are kept and viewable.
- Each item shows its data date and "เลือกเพราะ…" (score breakdown + rule passed + evidence link). Impact numbers show the formula and inputs so they can be recalculated.

## Go-live checks (shown on `/method`)
- Share of signals with evidence + rule: target 100%
- Impact numbers recalculated by code match the stored ones: 100%
- Missing/stale sources shown as such, never as unchanged
- Re-fetch with no change created 0 new events/alerts
No "items per day" target.

## Technical details
- Migration (additive): `source_registry` table (owner, channel, licence, cadence, unit, area, stale_after_days); `observations` gain `period_start`, `period_end`, `published_at`, `received_at` (default created_at), `effective_from`, `evidence_id`; backfill period = observed_on, effective_from = observed_on.
- `signal_events` (event_id text key from metric + period + direction, type, area) and `signal_versions` (event_id, version, status active/corrected/withdrawn, compared values, rules, evidence ids, impact formula json, advice, quality, reason, created_at). `detect_signals` writes versions only when content changes; existing `signals` kept as the current-version view for the current pages.
- Cron: replace 05:30/06:00 jobs with 05:30 retry, 05:45 freeze (stores snapshot id + cutoff), 05:55 build/publish; `daily_briefs` gets `cutoff_at`, `edition` and a corrections table.
- `BriefAlert` and signal alerts key on event_id + version to stop repeat alerts.
- Connectors set `period`/`effective_from` where the source gives it (oil effective date, CheckRaka/RakaKaset row date, GLO draw date, catalog metadata_modified as published_at).
- Delivered in 4 rounds matching the phases, each verified in the browser before the next.
