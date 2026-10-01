# Agency data pages, stricter Signal rules, and a fetch-monitoring page

## What users will get

1. **"หน่วยงาน" page:** one card per government agency (TMD, ThaiWater/RID, Gold Traders, กรมปศุสัตว์, กรมเจ้าท่า, BMA, อบจ., DDC, DLT, Land Dept and more). Each card shows:
   - its connected sources
   - the latest real values
   - how many datasets are tracked
   - the number of changes today
2. **Agency detail page:** for one agency:
   - a day-by-day timeline (last 14 days) of what actually changed: values before → after, datasets updated, new announcements
   - every dataset tracked, with its latest snapshot and a link to the original
3. **Stricter Signals:** a change becomes a Signal only when all of these are true:
   - **Size:** the change passes the metric's absolute or percentage threshold. A new minimum percentage stops tiny moves on large numbers from counting.
   - **Freshness:** the new value was fetched today, and the previous value is recent (within 7 days for daily data). Old or stale data never counts as a change today.
   - **Source trust:** each source gets a trust level (official agency API = high, aggregator or estimate = medium, sample data = low).
     - Medium trust needs a bigger change.
     - Sample data never becomes a "high" Signal and is always labelled.
   - **Official datasets:** a file that was only re-uploaded, with no change in rows or totals, no longer becomes a Signal. It only shows in the agency timeline. Row or total changes must exceed 1%, or be a brand-new dataset.
   - "ทำไมถึงเปลี่ยน?" lists each check the Signal passed: size, percentage, date compared and source trust.
4. **"ติดตามการดึงข้อมูล" page:**
   - a history of every fetch attempt for every source over 14 days (succeeded or failed, items found, time)
   - a daily feed of all changes across agencies
   - a "ใหม่" badge on changes you haven't seen yet on this device. The top menu shows a count of unseen changes, and a browser notification fires when new ones appear, if notifications are on.

## Technical details

- **Migration:**
  - `source_run_history` (source, ran_at, ok, rows, error), with public read and server-only writes, pruned to 30 days.
  - `metrics.min_pct numeric`, `metrics.max_gap_days int default 7`.
  - `families.trust text default 'high'` (high / medium / low), set to medium for exchange rates (aggregator), Open-Meteo, and PTT via the third-party API; low for any demo family.
  - `signals.checks jsonb` to store which rules passed.
- **`detect_signals`:** rewrite to skip when the previous observation is older than `max_gap_days`. It also requires `min_pct` when set, scales the threshold ratio by trust (medium ×1.5), caps demo data at medium severity, and writes `checks`.
- **Catalog:** `catalog.server.ts` writes `gov_changes` for all diffs, but writes the agency Signal only from changes of kind `new`, `rows` or `value` that are 1% or more. It records `pct` in `gov_changes` (new column).
- **Ingest:** also inserts each run into `source_run_history`.
- **Agency registry:** `src/lib/sources.ts` gains an agency grouping (agency key, label, sources, metrics, catalog agency name), used by the new pages and settings.
- **New routes:**
  - `/agencies`
  - `/agencies/$agency`
  - `/monitor`
  These are added to the top menu, and the "ดึงไม่ได้" link moves inside the monitor page as a tab or section.
- **Unseen changes:** the last-seen `gov_changes.id` / signal `created_at` is stored in localStorage. A small hook provides the unseen count for the menu badge and triggers notifications, reusing the existing notification permission.
- `signal-explain.tsx` renders `checks`.
- Update `AGENTS.md` and `roadmap.md`.
