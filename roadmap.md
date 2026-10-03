# Roadmap

- [x] Thai newspaper RSS (Matichon, Prachachat) tagged by agency/family
- [x] "Why did this change?" button per signal: reason, source, change date, related news
- [x] Settings page: signal sensitivity (low / medium / high)
- [x] Raw daily data page (/data) with per-source status
- [x] Real connectors: Gold Traders, ThaiWater dams, TMD warnings/earthquakes, Bangchak oil fallback; hourly schedule
- [ ] OAE farm prices (CKAN): series selection pending
- [ ] Lottery (GLO 503) / Talaad Thai / DIT crawlers — sites unreachable or need page-specific parsing
- [x] Agency pages, stricter signal rules (min %, freshness, trust), fetch monitor with unseen-change badge
- [x] GLO lottery (verified), volatility-aware detection, deterministic household impact + official advice, 06:00 Daily Brief + archive

- [x] Fix TMD 3h (char-ref decoding), forecast via 7-day API, dams around Bangkok (RID + ThaiWater C.13), browser-like fetch with 120s timeout
- [ ] Chao Phraya Dam release on live site depends on ThaiWater lifting its 429 block on hosting address
- [ ] Real headless browser (Playwright) collection — not possible in the hosting runtime; option: Firecrawl connector

- [x] Brief archive pagination, Daily Brief reading order, active agency coverage, and Today section reorder
- [x] Responsive site shell, mobile navigation, shared footer, and human sitemap
- [x] Public read-only API v1, OpenAPI 3.1, 17-tool MCP server, llms.txt, and developer documents

## Unified tactile editorial redesign
- [x] Unify household cost and latest lottery sections on Today
- [x] Remove the requested household calculation phrase
- [x] Apply the Today editorial shell, typography, sections, tables, and states across content pages
- [x] Verify PostgreSQL metadata/private-file storage boundaries and public API/MCP exposure
- [ ] Validate metadata, MCP read-only tools, security, type safety, and responsive layouts at 320/390/768/1280
