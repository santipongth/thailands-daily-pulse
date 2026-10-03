# Dams updated all day, ThaiWater tracking, daily charts from day one

## What you will get

1. **Dam figures update all day.** Chao Phraya, Pasak and Khun Dan are collected every hour on their own, without waiting for the hourly staleness check or the 05:45 brief cut-off. New values show at once on "ข้อมูลทั้งหมด". The Daily Brief still follows its 05:45 rule. Anything later goes in the updates below the brief.
2. **A dam box with charts on "ข้อมูลทั้งหมด".** It sits at the top of the page and shows each dam's latest value, previous value and change, plus a daily line chart.
3. **A ThaiWater tracking box on "ข้อมูลทั้งหมด".** It shows the last 10 attempts, each with its time, whether it worked, which way it tried (direct or Firecrawl) and the exact reason when it failed. It also shows the latest Chao Phraya value and its date. Nothing is left blank: when there is no value, the box says why.
4. **Daily charts from the first real day.** Every row's chart covers all real data since the first value arrived, one point per day, not just the last 30 days. The bigger chart you get by clicking a row also lists each day's value in a small table.
5. **Firecrawl check on the live site.** After publishing, I run a collection on the live site and read the result:
   - If Firecrawl gets through, it becomes the first way the site tries ThaiWater.
   - If it doesn't, the direct request stays first, and the Daily Brief and the new box show the exact reason (for example "Firecrawl: 429 — ปลายทางบล็อก").
6. **Python program tomorrow.** I can only work when you message me. The site already does the program's job every day and shows today vs the day before in the brief. Message me after 06:00 tomorrow and I'll run the program and compare its results with the brief.

## Technical details

- New `?mode=dams` on `/api/public/ingest` (cron-secret). It runs only the ThaiWater and RID connectors with force, then records a `run_kind` of "dams". A new pg_cron job `ingest-dams-hourly` runs at `20 * * * *`. Observations upsert as usual and keep an honest `received_at`, so the brief cut-off logic is unchanged.
- `data-all.tsx`: the query drops the 60-day limit (all `is_demo=false` rows from the first `observed_on`). The small chart uses the full series. The big chart adds a per-day value table.
- New `DamsTrend` component (cp_dam_q, dam_pasak_pct, dam_pasak_out, dam_khundan_pct) with recharts lines, placed under the station map.
- New `ThaiWaterMonitor` component: reads `source_run_history` (where source is like 'ThaiWater%', last 10) plus `source_runs`. Its reasons come from `makeReasonOf`.
- Firecrawl verification: publish, call the live `?mode=dams`, then read `source_runs`. Set `app_settings.thaiwater_mode = 'firecrawl_first'` only if the Firecrawl attempt returns values.
- Update the ingest rule in AGENTS.md (dams job).
