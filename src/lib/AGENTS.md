# AGENTS.md (src/lib — data sources)

- All crawler/API fetches go through `politeFetch` (`http.server.ts`): browser header profile, 120s timeout, retry 429/5xx/timeout max 3 — headless browsers can't run in the Worker runtime; 429-failed jobs re-queue after 15 min.
- Bangkok forecast figures come from data.tmd.go.th WeatherForecast7Days (`tmd7d.ts`, today's row) because www.tmd.go.th has a broken cert chain (526); `getBkkForecast` tries region RSS → 7-day → archived RSS.
- Calendar: `holidays` + `tax_deadlines` (rdtax) on /calendar + homepage aside; dates, never signals. Earthquake signal = `quake_th` from TMD RSS (`quake.ts`), Thai-province epicentres only, level bands {4,5}.
- Holidays: Kapook yearly page (`kapook.ts`, job `holidays`); URL in `app_settings.holiday_url`, set on /calendar via `setHolidayUrl` — new year = new link.
- Air/weather: GISTDA pm25_bkk; TMD Weather3Hours station 48455 (`tmd3h.ts`, decode XML char refs) → rain_bkk (24h, report date) and tmax_bkk = yesterday's max of 3-hourly readings (running max in app_settings `tmax3h:date`). Water: RID reservoir API → Pasak/Khun Dan; ThaiWater C.13 → cp_dam_q.
- `weather_station_obs` (5 nearest 3h stations + 7d vicinity rows, by TMD connectors) feeds brief `StationCompare`; fixed `DamsBox` — compare regardless of thresholds.
- ThaiWater order = `app_settings.thaiwater_mode` (default direct, then Firecrawl); errors verbatim in `source_runs.error`, shown via shared `missing-reason.ts`.
