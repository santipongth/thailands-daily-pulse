# Fix the 3 failing weather/water sources so real data reaches the Daily Brief

## What the checks found (today, 14:20–14:35 Bangkok)

**1. กรมอุตุฯ ตรวจอากาศ 3 ชม. — "ไม่พบสถานี BANGKOK METROPOLIS"**

- The station is in the file. In the 13:00 report BANGKOK METROPOLIS (station 48455) reads 32.1°C, humidity 72%, rain over 24 hours 4.1 mm.
- **Cause:** the file writes the province name in coded characters (`&#xE01;...`), not plain Thai. Our check compares it with "กรุงเทพมหานคร" without decoding it first, so it never matches.
- **Second cause:** the file is large (about 120 KB) and slow. The 13:05 run gave up after 12 seconds ("timeout").
- **Third issue:** the file has no "highest temperature of the day" field, only the reading at that moment. That is why the temperature figure was unreliable.

**2. กรมอุตุฯ พยากรณ์ กทม.และปริมณฑล — always "526"**

- **Cause:** tmd.go.th sends an incomplete security certificate (checked: "unable to verify the first certificate"). The hosting servers refuse such sites and return error 526. We can't switch this check off, and the plain-http address just redirects back to https.
- **Working replacement from the same department:** data.tmd.go.th "WeatherForecast7Days". Its certificate is valid, and it has province rows for กรุงเทพมหานคร and the nearby provinces, each with daily high/low temperature, % rain cover and a Thai description. Example for Bangkok: 34/26°C, 30–40% rain, "ฝนฟ้าคะนอง".

**3. ThaiWater (สสน.) — always "429 Too Many Requests"**

- The same address works from here (status 200, with our site's request header too). The block applies only to the hosting servers' shared outgoing address, so changing our code can't lift it.
- **Working official backup:** the Royal Irrigation Department's own dam API (app.rid.go.th/reservoir/api/dam/public). It has the same dam figures, sent by the department that owns them.
- The dams you asked for:


| Dam                  | Where it is in the data                                                                                                      | Today                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| ป่าสักชลสิทธิ์       | ThaiWater dam list + RID API                                                                                                 | 110.58% full, inflow 36.75 / outflow 34.61 million m³/day |
| ขุนด่านปราการชล      | ThaiWater dam list + RID API                                                                                                 | 95.15% full, inflow 3.92 / outflow 6.13 million m³/day    |
| เจ้าพระยา (Chai Nat) | Not a reservoir, so it's not in either dam list. It is in ThaiWater's water-level list as station C.13 "ท้ายเขื่อนเจ้าพระยา" | water released 2,500 m³/s, level 15.93 m                  |


## What will change

1. **3-hour weather (Bangkok):**
  - Fix the province decoding and wait up to 30 seconds for the file.
  - **Rain:** 24-hour rainfall from the latest report. The 04:00 report arrives before the 05:45 cutoff, so every brief gets that morning's figure.
  - **Temperature:** "อุณหภูมิสูงสุดเมื่อวาน กทม.". The site keeps the highest 3-hourly reading of each day. The morning brief shows yesterday's full-day high and compares it with the day before. A brief made before dawn can't know today's high yet.
2. **Bangkok forecast:**
  - Switch the forecast figures to WeatherForecast7Days, using today's row for Bangkok.
  - The homepage forecast box also shows Nonthaburi, Pathum Thani, Samut Prakan, Nakhon Pathom and Samut Sakhon.
  - The old tmd.go.th text is still tried. If it can't be fetched, the box shows only the 7-day figures.
3. **Dams around Bangkok:**
  - Replace "total storage of all dams" and "Bhumibol" with 4 figures:
    - ป่าสักชลสิทธิ์ % full
    - ป่าสักชลสิทธิ์ outflow
    - ขุนด่านปราการชล % full
    - water released at เขื่อนเจ้าพระยา (m³/s)
  - Dam figures come from ThaiWater first and from the RID API when ThaiWater answers 429.
  - The Chao Phraya release figure only exists in ThaiWater. While ThaiWater is blocked, that row shows the real reason ("ThaiWater ถูกจำกัดคำขอ (429)"), never "no change".
  - Alert rules:
    - Chao Phraya release: bands at 1,500 / 2,000 / 2,500 / 3,000 m³/s, the levels RID uses in its riverside warnings.
    - Dam % full: bands at 80 / 100%.
  - Old values, signals and events for the removed dam figures are deleted, the same way earlier removals were done.
4. **Verify:**
  - Run each fixed source once from the app.
  - Confirm real values are stored with their raw files.
  - Confirm the Daily Brief table "ข้อมูลจริงทุกตัวชี้วัด" shows rain, yesterday's high, the forecast and the 4 dam rows with values.
  - Confirm the tracking page shows the 3 sources as working.

## Limits

- ThaiWater's block on the hosting address can't be removed from our side. The Chao Phraya release figure therefore depends on ThaiWater answering at least once before 05:45. The other three dam figures always have the RID backup.
- I can only test the RID API and WeatherForecast7Days from here. They are expected to work from the hosting servers because neither has the certificate problem or the 429 block, but I'll only know for sure after the next live run.

## Technical details

- `src/lib/tmd3h.ts`:
  - Decode numeric XML entities (`&#x..;`/`&#..;`) before matching.
  - Match on WmoStationNumber 48455 or StationNameEnglish, and drop the Province requirement as the main key.
  - Return the reading DateTime (MM/DD/YYYY HH:mm).
- `connectors.server.ts`:
  - `get(url, ms)` is called with 30000 for TMD files.
  - The tmd3h connector returns `rain_bkk` for the reading date.
  - It also upserts a hidden running max `tmax3h_bkk_day` for the reading date (greatest of stored and new value).
  - It returns `tmax_bkk` for date D = the running max of D−1, using the existing per-metric date support.
- New pure parser `src/lib/tmd7d.ts` for WeatherForecast7Days (decoded province name → today's MaximumTemperature, MinimumTemperature, PercentRainCover, DescriptionThai). It feeds `fc_tmax_bkk`/`fc_tmin_bkk`, and `getBkkForecast` falls back to it.
- Water connector:
  - ThaiWater `thailand_main` gives `dam.data.data` (by `dam_name.th`) and `waterlevel.data.data` (station `tele_station_oldcode` = "C.13", `discharge`).
  - On failure it falls back to RID `reservoir/api/dam/public` (`data[].dam[]` by name) for the dam metrics.
  - Source `RID อ่างเก็บน้ำ (กรมชลประทาน)` is added to `sources.ts` and `source_registry`.
  - Evidence is archived for both.
- Migration:
  - New metrics `dam_pasak_pct`, `dam_pasak_out`, `dam_khundan_pct` (level, bands {80,100} for %), `cp_dam_q` (level, bands {1500,2000,2500,3000}), plus hidden `tmax3h_bkk_day`.
  - Rename `tmax_bkk` to "อุณหภูมิสูงสุดเมื่อวาน กทม.".
  - Delete `dam_total`/`dam_bhumibol` and their dependent rows (trigger disabled during the delete, as before).
  - Update `family_evidence_source` for water to cover both ThaiWater and RID.
- Update `impact.ts`/advice wording for the new dam metrics, `AGENTS.md` (air/weather and water rules), and `roadmap.md`.  
  
เพิ่มเติมเกี่ยวกับ Crawler หรือ การใช้ API ให้เปลี่ยนมาใช้เทคนิค ใช้เครื่องมือที่ควบคุม Browser จริงๆ คือใช้ Playwright และปลั๊กอินประเภท Stealth เพื่อหลีกเลี่ยงกสนโดน block และอาจเซต retry ไว้เพื่องจากไฟล์ json ใหญ่ หรือ server ตอบสนองช้า ควรเพิ่มเวลา timeout เป็น 2 นาที ให้ทำการเปลี่ยนการเข้าถึง API และเว็บไซต์ เป็นเทคนิคนี้ให้หมด ทุกตัว Crawler และ API