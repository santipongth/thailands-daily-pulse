# Replace Open-Meteo with TMD weather + GISTDA PM2.5 (Bangkok only)

## What changes for you
- "Open-Meteo (อากาศ/PM2.5)" is removed from the site.
- Two new sources replace it:
  - **กรมอุตุฯ ตรวจอากาศ 3 ชม. (กรุงเทพฯ)**: only the station BANGKOK METROPOLIS in กรุงเทพมหานคร.
  - **GISTDA PM2.5 (กรุงเทพฯ)**: only the กรุงเทพมหานคร row.
- Chiang Mai PM2.5 goes away, because you asked for Bangkok only.
- Past Open-Meteo values, signals and events are deleted, the same way the four agency websites were removed earlier. The raw files stay in storage but nothing links to them.
- PM2.5 and weather each get their own row on the sources page, the tracking page and the failures page.

## What was checked today
- **GISTDA:** works right now. Bangkok shows PM2.5 31.7 µg/m³ (24-hour average 34.2) for 3 Oct.
- **TMD 3-hour weather:** the link answers, but its station list is empty at 01:04. TMD only publishes at 01:00, 04:00, 07:00 and so on, so the list may still be filling. I'll re-check the real BANGKOK METROPOLIS fields when building. If they stay empty, the source shows "ตรวจสอบไม่ได้" (can't be checked), never "no change".

## Figures and alert rules
- **PM2.5 Bangkok:** the 24-hour average, with the same thresholds as before (Thai standard 37.5).
- **Temperature Bangkok:** the highest temperature seen at BANGKOK METROPOLIS today (from the 3-hourly reports). Alert if it changes 2°C or more.
- **Rain Bangkok:** total rain over 24 hours at the station, using the same rain bands as before. Note that this is rain that has already fallen. Open-Meteo gave tomorrow's forecast, which TMD's 3-hour data doesn't have. The Bangkok forecast box still covers the outlook.

## Technical details
- `connectors.server.ts`: remove the Open-Meteo connector. Add `tmd3h` (parse XML, match on `StationNameEnglish` = BANGKOK METROPOLIS and `Province` = กรุงเทพมหานคร, keep the running max temperature for the day, rain from the 24-hour field) and `gistda` (`data[]` where `pv_tn` = กรุงเทพมหานคร → `pm25Avg24hr`; date from `dt`). Both use the existing 429 retry and raw-evidence archiving.
- Pure parser `src/lib/tmd3h.ts`, tested against a real file captured after 04:00.
- `sources.ts`, `source_registry` (rename/insert two rows, stale 1 day), `family_evidence_source`: weather → `กรมอุตุฯ%` (already), air → `GISTDA%`.
- Migration: delete the `pm25_cnx` metric and the dependent rows for the Open-Meteo-era `pm25_bkk`/`rain_bkk`/`tmax_bkk` (observations, signals, events, versions, source runs). Keep the metric definitions for the three Bangkok figures.
- `backfill.server.ts`: remove Open-Meteo, leaving `BACKFILL_SOURCES` empty, because neither new source publishes history. `impact.ts`: drop the `pm25_cnx` text and change the rain wording to "ฝนสะสม 24 ชม.".
- Update the Ingest/Sources rules in AGENTS.md.
