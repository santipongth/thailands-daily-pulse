# Make the Bangkok map show real data, fix the 00:00 weather time, and finish the map

## What I found (checked in the database and in a browser)
- **The map does load**: the street map of Bangkok shows, and so does the list beside it. But only 2 pins are on it (the BTS and MRT markers). That is why clicking seemed to do nothing.
- **Why there are no pins**: the stations' locations only started being saved after the last update. ThaiWater and Air4Thai haven't been fetched since then (the last fetches were 21:09 and 21:10). Right now 0 of 75 PM2.5 stations and 0 of 17 water stations have a location. The list items are greyed out for the same reason.
- **Road flooding (กทม.)**: the agency's table has no locations, so 99 points can't be placed.
- **Weather is switched off by default**, so its 5 stations don't show either.
- **"00:00" weather time**: the weather department sends the time as "10/03/2026 19:00:00". The page takes the last 5 characters, which are the seconds ("00:00"), not the hour. The real reading time is 19:00. Data is being fetched correctly every 3 hours; only the time shown is wrong.

## 1. Fix the data so every layer shows on the map
- **Station location list**: save each station's location once and keep it, so pins appear even when a fetch fails or a source sends no location.
- **Fill it right away**: fetch Air4Thai and ThaiWater once now, and add any locations already on file to the readings shown.
- **กทม. road sensors**:
  - First check whether the กทม. flood page's own map provides locations.
  - If it doesn't, look each road and station name up on OpenStreetMap once, and mark those pins "ตำแหน่งโดยประมาณ" (approximate).
  - Points that can't be found stay in the list only. Their count is shown, so nothing is hidden or guessed.
- **Weather layer**: switched on by default.

## 2. Fix the weather time
- Read the hour correctly ("19:00"), in both the weather table and the map.
- Show "รายงานรอบ 19:00 น." and when it was received, so it's clear the source reports every 3 hours.

## 3. A map that's useful for people in Bangkok
- **"ตอนนี้ในกรุงเทพฯ" bar above the map**: average and worst PM2.5 (by district), how many roads are flooded, how many canals are over the bank, and BTS/MRT status. Tap an item to jump to it on the map.
- **Numbers on the pins**: the PM2.5 value, water %, or temperature is shown inside each pin, so you can read it without tapping.
- **Tap anywhere on the map**: shows the nearest PM2.5 reading, water station, flooded road and weather station to that spot, with distances. Useful for checking your home or office.
- **What to do**: each card gives the Pollution Control Department's advice for that PM2.5 level (for example, "ลดกิจกรรมกลางแจ้ง / สวมหน้ากาก"), "หลีกเลี่ยงเส้นทาง" for flooded roads, and "เฝ้าระวัง" for canals near or over the bank.
- **Search**: type a district, road or station name to filter the list and jump to it.
- **"ใกล้ฉัน"** stays, now with the nearest reading for each layer.
- **Share link**: the address remembers the layers you chose and the selected station, so a link opens the same view.
- **Full-screen button** and a clear "อัปเดตล่าสุด" time. Data refreshes every 10 minutes.
- **On phones**: a taller map. Tapping a pin opens a card at the bottom of the screen, and the list sits below the map.
- **Clear empty states**: when a layer has no readings yet, it says why. For example, "สถานีนี้ยังไม่ส่งค่าวันนี้" (this station hasn't reported today).

## 4. Testing before I report back
In a browser, at desktop and phone size, check:
- each layer shows pins
- tapping a pin opens its card
- tapping a list item flies to the pin
- tapping an empty spot shows the nearest readings
- search, the share link and full screen work
- the weather time shows 19:00 (not 00:00)

Then report the actual pin counts per layer.

## Technical details
- New public-read table `station_locations` (source, station_id, name, lat, lng, method `source|geocoded`, updated_at; anon SELECT, service-role write). Connectors upsert it whenever a row has coordinates. `bkk-map-data.ts` joins on (source, station_id) when a snapshot has no lat/lng. Backfill it from existing snapshots.
- BMA geocoding: a one-off admin server function using Nominatim (1 request/second, Bangkok viewbox), storing results with method `geocoded`; new sensors get geocoded during later rounds, at most 20 per run. First check whether the BMA flood page exposes coordinates.
- TMD time: a shared `tmdTime()` helper parses "MM/DD/YYYY HH:MM:SS" and is used by station-map and bkk-map-data. Add a unit test.
- Map UI: Leaflet `divIcon` pins with value text and theme-token colours; map click runs a nearest-per-layer lookup with `distKm`; URL search params hold layers/selected station; the Fullscreen API; a sheet card on mobile.
- Run Air4Thai + ThaiWater once now through the existing run-now path, so locations fill without waiting for the next round.
- Update the map rule in AGENTS.md (coordinates come from `station_locations`; geocoded pins are labelled approximate).
