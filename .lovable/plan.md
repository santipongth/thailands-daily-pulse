# Flood data display, update timing, Air4Thai PM2.5 and rail disruption notices

## 1. Update timing for flood and local-water sources (admin)
- Measure how often each source really publishes new data. Check this against the times in the files already fetched, not against how often we fetch:
  - ThaiWater stations: each station reports every 10–15 minutes. Keep hourly fetching, plus extra early-morning runs (00:10, 03:00, 05:00, 05:30) so the brief window is covered.
  - กทม. flooded roads: changes when it rains. Fetch every hour from 16:00 to 08:00 and every 3 hours otherwise. This needs a new schedule type, "hourly in a time range".
  - ปภ. alerts: issued about twice a day. Fetch daily at 05:00, with a second round at 17:00.
- Set the request method to match what actually works: ThaiWater = auto (direct first, then Firecrawl); กทม./ปภ. = Firecrawl.
- Save these as the starting settings. The admin can still change them on the settings page.

## 2. Ongoing performance analysis (fetch log page)
- Add a daily history of the performance numbers for each source (success rate, failure causes, how often files change). The fetch log page then shows a trend over 7 and 30 days, not just a single snapshot.
- Show "data age when fetched": how old the source's own data timestamp is at fetch time. This tells us whether the schedule matches when the data actually appears.
- Recommendations still apply only when you press "ใช้ค่านี้".

## 3. Showing the data in the existing menus (no new menu)
- **ข้อมูลสำคัญ (key data):** add a "น้ำท่วม กทม." box with:
  - the number of flooded roads
  - the highest water level as a % of bank height, with the station name
  - the number of stations above their banks
  - ปภ. warnings
  
  Each figure shows the time the source reported it, the station or source used, and a link to the raw file.
- **ข้อมูลทั้งหมด (all data):** add a full table section listing the flooded roads (name and time), all 16 ThaiWater stations in Bangkok and nearby provinces (station, province, level, % of bank, time) and the latest ปภ. notices.
- Data comes from a new public, read-only record of station and road detail, kept per fetch round.

## 4. Air4Thai PM2.5 (กรมควบคุมมลพิษ)
- New source: Air4Thai stations in Bangkok, updated hourly.
- It records the Bangkok average and the highest station (with its name), so it can be compared with GISTDA.
- It appears in admin source control, the fetch log, the sources page and the key-data PM2.5 box ("GISTDA vs Air4Thai").
- It goes into the existing air family. Detection rules stay as they are; GISTDA remains the main figure for signals.

## 5. BTS/MRT disruption notices
- New source: service notices from BTS and MRT, read via Firecrawl or official X accounts, whichever actually works. This will be tested first.
- Like the FM91 posts, these are labelled news items only. They never create signals or numbers.
- Shown on the homepage ticker and in a "รถไฟฟ้า" box under key data.
- Appears in admin source control and the fetch log with its own category.
- If neither BTS nor MRT can be read reliably, I will tell you and leave it disabled rather than show guesses.

## Technical details
- Migration:
  - `station_snapshots` (source, station_id, name, area, value, pct, status, observed_at, evidence_id, received_at), with anon SELECT and service-role writes
  - `source_perf_daily` (source, day, runs, ok, causes jsonb, files_changed, median_data_age_min), admin read only
  - a new `source_config.schedule` value `hourly_range` with `range_start` and `range_end` columns
  - metrics `pm25_bkk_a4t` and `pm25_bkk_a4t_max`, plus source_registry rows for Air4Thai and BTS/MRT
- Parsers in `flood.ts` also return station and road rows. `air4thai.ts` (API `air4thai.pcd.go.th/services/getNewAQI_JSON.php`, area filter กรุงเทพ) and `rail.ts`, each with fixture tests.
- The daily prune job writes `source_perf_daily`, and `perf.ts` reads trends from it.
- Raw-log categories: Air4Thai goes under air; new "รถไฟฟ้า" category.
- Update AGENTS.md files for the new sources and the schedule type.
