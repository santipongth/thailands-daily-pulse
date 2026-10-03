# Live data page, daily dams, weather comparison and a real ThaiWater/Firecrawl test

## 1. New page "ข้อมูลทั้งหมด" (all collected data)
- New page in the top menu. It lists every figure the site has actually collected (real data only, no samples), grouped by topic.
- Each row shows the latest value and its date, the previous value and its date, the change (amount and %), and which source it came from.
- Each row has a small daily line chart (last 30 days). Clicking a row opens a bigger daily chart.
- A figure with no value says why (source blocked, not collected yet, not a release day), using the same reasons the Daily Brief already shows.

## 2. Chao Phraya and Pasak dams in every Daily Brief
- The Daily Brief gets a fixed "เขื่อนรอบกรุงเทพ" box: Chao Phraya release, Pasak % full and release, and Khun Dan % full. It always shows today's value against yesterday's, even when the change is too small to become a signal.
- A missing value shows the real reason, never a blank.
- The early-morning runs (00:10, 03:00, 05:00, 05:30) keep collecting both dams, so the values land before the 05:45 cutoff.
- The monthly chart on "ข้อมูลสำคัญ" already reads these figures. It will show whether the real data changes once more days arrive. Month-to-month bars start in November.

## 3. Weather stations near Bangkok, compared with the day before, in the Daily Brief
- The Python script only runs on my machine, so the website will do the same job by itself every day.
- On each 3-hour weather run the site stores the readings of the 5 stations nearest Bangkok: Bangkok Metropolis, Khlong Toei port, Bang Na, Don Mueang and Suvarnabhumi. It also stores the 7-day forecast row for Bangkok and the 5 nearby provinces.
- The Daily Brief gets a "สถานีอากาศใกล้กรุงเทพ" table: rain over 24 hours and temperature per station, today vs yesterday, plus the forecast today vs yesterday.
- Today's readings are stored now, so tomorrow's brief (4 Oct) is the first with a real comparison. After 06:00 tomorrow I'll also re-run the Python script and check it gives the same numbers as the brief.

## 4. ThaiWater via Firecrawl on the live site
- After publishing I'll trigger one collection on the live site and read the result.
- **If Firecrawl gets through:** Firecrawl becomes the first way the site fetches ThaiWater, and the direct request becomes the backup.
- **If it doesn't:** the brief's dam box and its table show the exact reason, for example "ThaiWater บล็อกทั้งเซิร์ฟเวอร์เว็บและ Firecrawl (429) — เวลา HH:MM". The Chao Phraya row stays empty with that reason. Pasak and Khun Dan still come from the Royal Irrigation Department.
- From here Firecrawl was already blocked 3 times out of 3, so a block on the live site is likely.

## Limits
- I can't run things at 06:00 tomorrow myself. Message me after 06:00 and I'll check the brief and the script.
- Each Firecrawl attempt uses Firecrawl credits. It is only tried when the direct request fails.

## Technical details
- New route `src/routes/data-all.tsx` (sitemap true, own head): metrics + families + observations (is_demo=false, 60 days) through the browser client; recharts LineChart per metric; reasons reuse `reasonOf` from `all-metrics-compare.tsx` (moved to a shared helper).
- New component `DamsBox` in `brief.$date.tsx`: metrics cp_dam_q, dam_pasak_pct, dam_pasak_out, dam_khundan_pct; picks values at or before the brief cutoff and the previous day's values.
- Weather stations: migration adds table `weather_station_obs` (station_id, name, obs_date, obs_time, temp, rain24, kind '3h'|'7d', source_url, received_at, UNIQUE(station_id, obs_date, kind)), GRANT SELECT to anon/authenticated, RLS public read. `tmd3h.ts` gains a parser for the nearest stations (WMO 48455, 48454, 48453, 48456, 48429), `tmd7d.ts` rows are stored too; writes happen in the existing connectors with the admin client. New component `StationCompare` in the brief.
- Firecrawl: env flag `app_settings.thaiwater_mode` ('firecrawl_first' | 'direct_first') read by the ThaiWater connector. Last Firecrawl outcome is recorded in `source_runs.error` with a `Firecrawl` prefix so the brief reason can quote it. The test on the live site goes through `/api/public/ingest?mode=early`.
- Update AGENTS.md (station table rule, ThaiWater order) and roadmap.md.
