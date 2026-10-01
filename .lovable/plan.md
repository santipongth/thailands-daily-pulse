# Connect real government data sources

## Survey results (tested today, 1 Oct 2026)

| Group | Source | Status | Method |
|---|---|---|---|
| Gold | Gold Traders Association (goldtraders.or.th) | Works: official bar/ornament buy/sell prices with timestamp | JSON API |
| Weather warnings | TMD (data.tmd.go.th) WeatherWarningNews | Works | XML API (public key) |
| Weather 7-day forecast | TMD WeatherForecast7Days | Works: replaces the current open-meteo forecast | XML API |
| Earthquakes | TMD DailySeismicEvent | Works: new "earthquake" signal | XML API |
| Water / dams | ThaiWater / HII (api-v3.thaiwater.net) | Works: water levels and dam storage (% of capacity) | JSON API |
| Oil | Bangchak oil price API | Works: second official retail price alongside PTT | JSON API |
| Farm prices | OAE catalog (catalog.oae.go.th, CKAN) | Works: dataset list. Pick pork, egg, rice and palm series | CKAN API |
| PM2.5 | Air4Thai (PCD) | Times out from our servers. Keep open-meteo and retry Air4Thai first | JSON API (fallback) |
| Lottery | GLO | Returns 503. Crawl the results page on draw days (1st, 16th) | Scheduled crawler |
| Food retail prices | DIT pricelist / MOC data API | Unreachable or redirects. Planned as a crawler, needs a later check | Crawler |
| Talaad Thai | talaadthai.com | Page loads. Crawl the daily market price page | Crawler |
| FX, interest rates | BOT API Gateway | Needs a free BOT API key from you | API key |
| Disease | DDC (DDS / dashboards) | Down (521, timeout). Stays news-based | Not available |
| Bond yields | ThaiBMA | Page loads, but there's no open API. Deferred | Deferred |
| Traffic (BKK) | BMA open data | Unreachable. Deferred | Deferred |
| Satellite floods | GISTDA API | Needs an API key | API key |

## What will change for users

- Gold, water/dams, weather warnings, earthquakes and Bangchak oil show as "real data", with the source shown on every card.
- New metrics: dam storage %, main river levels, gold bar/ornament official prices, and a TMD warning count. Earthquakes count only when they are in or near Thailand and magnitude 4 or higher.
- Farm prices (pork, eggs, rice, palm) switch to real data where OAE publishes daily or weekly series.
- The raw data page shows each source's last fetch time and status (OK / failed / blocked), so failures are visible.
- An hourly scheduled job collects data even when nobody opens the site.

## Asking you later

- A BOT API key (free from the BOT developer portal) for official FX and policy rates.
- Optionally, a GISTDA key for satellite flood areas.

## Technical details

- Split `ingest.server.ts` into per-source connectors (`src/lib/connectors/*.server.ts`). Each connector returns `{metric_id: value}` and is isolated with `Promise.allSettled` and a timeout.
- New table `source_runs` (source, ran_at, ok, error, rows) with public read. Writes only from the server. Shown on `/data` and `/sources`.
- Migration: new metrics and families (water levels, dams, quake, gold official), and set `is_live` on newly real families. Real values overwrite demo values for the same day.
- Crawlers (GLO, Talaad Thai) parse HTML with plain regex/fetch, so they run on the server without native packages.
- Scheduling: a public route `/api/public/ingest` checks `LOVABLE_CRON_SECRET` (already configured). It is called hourly by `pg_cron` and keeps the existing job lock. On-demand refresh stays as a backup.
- Every source is tested again from the live server after deployment, because the server network can differ from the test environment.
- Update `AGENTS.md` (connector layout, cron) and `roadmap.md`.
