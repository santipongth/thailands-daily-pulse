# Add FM91 Trafficpro (X) to source management

## Why it is missing
FM91 runs on its own 30-minute timer, separate from the list of sources the manager reads. That is why it has no row and cannot be switched on or off.

## What changes
- FM91 Trafficpro (X) shows up in "จัดการแหล่งข้อมูล (ผู้ดูแล)" like the other sources: an on/off button, schedule choices (default 30 min, hourly, every 3 hours, daily at an hour, hourly in a time range, manual only), extra rounds, retry count, and the "ดึงตอนนี้" button.
- Turning it off stops every automatic FM91 fetch. No Firecrawl credits are used (about 30 per fetch) until you turn it back on. "ดึงตอนนี้" still works when it is off.
- A schedule you pick replaces the 30-minute default. The existing credit warning stays.
- The on/off button works for every source in the list (this already works; FM91 is added to it).

## Technical details
- `source-config.server.ts` EXTRA: add `{ job_type: "social", source: <FM91 run name from fm91.server.ts> }`.
- `ingest.ts` mode=social: load `source_config` for FM91 first. If it is disabled, return skipped. If it has a non-default schedule, run only when `applySourceConfig` says it is due (same rules as other sources, including the breaker).
- Manual run: the "ดึงตอนนี้" path calls `refreshSocial()` for the `social` job type (add to the drain/manual dispatch in queue.server.ts if it is missing).
- Check in the browser: the FM91 row appears, can be switched off and on, and the saved setting is used on the next run.
