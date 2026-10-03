# Interactive Bangkok map, plus fixes for PM2.5, flood and rail sources

## Where things stand (last 3 days of fetch history)
- Air4Thai PM2.5: 1/1 fetches worked. GISTDA PM2.5: 12/12. Both are already on the admin settings page. They have only run a few times, so they need tuning, not installing.
- BTS/MRT (X): 1/1 worked. It is already on the settings page.
- ThaiWater (สสน., the dam/main water feed): **18/60 worked.** Almost every failure is a "too many requests" block (429), both direct and through Firecrawl. This is the main fetch problem.
- ThaiWater stations in Bangkok and nearby: 2/2. ปภ. alerts: 2/2.
- กทม. road flooding: 3/4. One failure: "table not found", because the page loads its table late.

## 1. PM2.5 sources (Air4Thai + GISTDA)
- Air4Thai publishes new readings every hour, a few minutes after the hour. Set it to fetch hourly at :15, direct first, falling back to the alternate site and then Firecrawl. Allow 3 tries, 10 minutes apart.
- GISTDA updates hourly. Keep it hourly with 3 tries.
- On the settings page, label both sources clearly under "มลภาวะ PM2.5".

## 2. Flood/local water: fetch successfully every time
- ThaiWater main feed: change from every hour to every 3 hours, spread to :35 so it doesn't hit at the same time as the ThaiWater Bangkok station feed. Retry delay goes up to 30 minutes, the first retry goes through Firecrawl, and every 429 failure is re-queued (existing rule).
- ThaiWater Bangkok stations: hourly at :10, direct, 3 tries.
- กทม. road flooding: keep the 16:00 to 08:00 hourly window. Treat "table not found" as a temporary failure, so the next try uses the longer wait, instead of counting it as "the page changed".
- ปภ.: keep 05:00 + 17:00.
- On the fetch-log page, the analysis gets a "Flood/local water" summary card: success rate per source, main failure causes, and the suggested settings. Settings are still applied only when you press "ใช้ค่านี้".

## 3. Rail on "ข้อมูลทั้งหมด"
- New "รถไฟฟ้า BTS/MRT" block: which accounts were checked, when each was last checked, how many posts were read and kept, and the latest notice if there is one. "No disruption reported" counts as a valid result.

## 4. Interactive Bangkok map (replaces "แผนที่สถานีอากาศใกล้กรุงเทพฯ")
A real street map of Bangkok and nearby provinces, with these features:
- **Layer switches** (chips at the top): Weather (TMD), PM2.5 (Air4Thai), Water level (ThaiWater), Road flooding (กทม.), Rail notices.
- **Colour-coded pins**:
  - PM2.5 uses the official Thai AQI colours.
  - Water level is colour-graded by % of bank height; red means over the bank.
  - Flooded roads show as red pins; normal roads are hidden unless you turn on "show all".
- **Click a pin** to open a card with the station name, value, unit, status, update time, agency, and a link to the agency's own website.
- **"Near me" button**: uses the device's location, if allowed, to centre the map and list the 5 nearest stations with their values. Nothing is stored.
- **Side list in sync with the map**: shows the worst items first (highest PM2.5, highest water %, flooded roads). Clicking a list item flies the map to that pin.
- **Freshness**: each layer shows "อัปเดต hh:mm". Readings older than 6 hours appear faded.
- **Legend + data source line** under the map.
- **On phones**: the map sits on top and the list scrolls below it. Tapping a pin opens a bottom card.
- The current table below the map stays, so the data can still be read without the map.

Possible later additions, not part of this plan: a time slider to replay the last 24 hours, and district outlines.

## Technical details
- Map library: Leaflet with OpenStreetMap tiles (free, no key). It loads in the browser only, lazily and behind a client-only gate, so server rendering stays safe. Clicking a pin opens a popup; the colours come from theme variables.
- Coordinates: add nullable `lat`/`lng` columns to `station_snapshots` (anon SELECT unchanged).
  - ThaiWater and Air4Thai include coordinates in their data, so the connectors will store them.
  - TMD stations use the existing fixed coordinates.
  - The กทม. flood table has no coordinates. Add a small fixed table that maps sensor codes to road coordinates, built once by geocoding road names. Sensors without coordinates appear in the list only.
- New component `bkk-map.tsx` (lazy) + `bkk-map-data.ts` (queries, colour bands, freshness). It replaces `station-map.tsx` on /data-all.
- Settings are changed through a migration that updates `source_config` rows. Flood "table not found" becomes a retryable cause in the BMA connector and in `perf.ts` `causeOf`.
- AGENTS.md gets one rule about the map data and coordinates.
- Verify with tests (parsers keep lat/lng), then a Playwright check of /data-all (layers, popup, list fly-to, mobile size) and the fetch-log card.
