# Roadmap

- [x] Thai newspaper RSS (Matichon, Prachachat) tagged by agency/family
- [ ] Direct numeric data from DDC, Land Dept, Fisheries — blocked: no reachable public API (DDC RSS is procurement only, Fisheries times out, Land Dept has no feed, data.go.th blocks server access)
- [x] "Why did this change?" button per signal: reason, source, change date, related news
- [x] Settings page: signal sensitivity (low / medium / high)
- [x] Raw daily data page (/data) with per-source status
- [x] Real connectors: Gold Traders, ThaiWater dams, TMD warnings/earthquakes, Bangchak oil fallback; hourly schedule
- [ ] OAE farm prices (CKAN): series selection pending
- [ ] Lottery (GLO 503) / Talaad Thai / DIT crawlers — sites unreachable or need page-specific parsing
- [ ] BOT FX & policy rate — blocked: needs user's BOT API key
- [ ] GISTDA flood extent — blocked: needs API key
- [ ] DDC disease numbers — blocked: site down
- [x] Gov website crawlers (DDC, DOL, Fisheries, DLT, DLD) + failures page + source/interval settings
- [ ] DDC, Fisheries, DLT, DLD crawls currently fail (site down / timeout / bad SSL / bot block) — blocked on the agencies' sites
- [x] Gov open-data catalog tracking (DLD, Marine Dept, BMA, PAO, DDC, DLT) with daily diffs, alerts, /day comparison page
- [x] Agency pages, stricter signal rules (min %, freshness, trust), fetch monitor with unseen-change badge
- [x] GLO lottery (verified), volatility-aware detection, deterministic household impact + official advice, 06:00 Daily Brief + archive
- [ ] Food prices and economic releases (CPI/GDP/unemployment) from official catalog CSVs — series selection pending
- [ ] Interest rates — blocked: needs BOT API key

- [x] Fix TMD 3h (char-ref decoding), forecast via 7-day API, dams around Bangkok (RID + ThaiWater C.13), browser-like fetch with 120s timeout
- [ ] Chao Phraya Dam release on live site depends on ThaiWater lifting its 429 block on hosting address
- [ ] Real headless browser (Playwright) collection — not possible in the hosting runtime; option: Firecrawl connector
