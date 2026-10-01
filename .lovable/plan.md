# Farm prices from RakaKaset, real Bangkok traffic index, remove 4 groups

## 1. Farm prices: switch to RakaKaset
- "ราคาเกษตร" source changes from the Office of Agricultural Economics to RakaKaset (rakakaset.com/prices).
- New daily collector reads the price table (product, price, unit, date) and saves real prices for: palm oil fruit, rubber sheet (grade 3), fresh latex, rice paddy, live hog, plus cassava / corn / sugarcane if listed. Exact items confirmed against the live page while building.
- Runs in the 05:30 daily run, on the "retry now" button, and at your own times set in Settings (same as CheckRaka). One polite request per day.
- Old sample farm data is removed; changes appear from the second day of real prices.
- RakaKaset collects from other sources, so trust is set to medium (a bigger move is needed to become a signal), same as CheckRaka.
- Note: the page currently shows some dates later than today (e.g. 18 Oct 2569); rows dated in the future are ignored.

## 2. Traffic: Longdo Traffic Index
- Bangkok traffic index comes from Longdo's index feed (currently 2.9 on a 0–10 scale), fetched every hourly run.
- Signal when the index crosses congestion levels (e.g. 4 = heavy, 6 = very heavy, 8 = gridlock) — thresholds shown on the method page.
- Sample traffic data removed; traffic marked as live data.

## 3. Remove completely: rates/bond, stock market, electricity, satellite flood
- Delete these groups with all their indicators, values, signals, release dates and news links.
- Remove every mention in pages: homepage cards, settings source list, sources page, agencies, method page, daily/brief impact text, household advice, "coming up" list, and household reach weights.
- Brief and ranking stop referring to them.

## Technical details
- `src/lib/rakakaset.server.ts`: `runRakaKaset()` parses table rows (regex on product name + price + date), maps to metric ids, returns `{values, run}`; called in `refreshIfStale` under the same condition as CheckRaka.
- Longdo connector in `connectors.server.ts`: GET `https://traffic.longdo.com/api/json/traffic/index` -> `traffic_idx`; metric kind `level`, bands {4,6,8}.
- Migration-free data changes via insert/delete queries: update `families` farm (source_name/url, is_live, trust medium) and traffic (is_live); add farm metrics; delete demo observations for farm/traffic; delete observations, signals, release_calendar, news_items, metrics and families for `rates`, `stock`, `power`, `flood_sat`.
- Code cleanup: `rg` for `rates|stock|power|flood_sat|policy_rate|bond10y|set\b|ft|flood_area` across `src/` (sources.ts, impact.ts PER/advice, index upcoming, method, settings, news keyword tags) and remove.
- `sources.ts`: add RakaKaset + Longdo entries so they appear in Settings selection and failure alerts.
- Update AGENTS.md (food rule extended to farm prices) and verify on /data in a browser.
