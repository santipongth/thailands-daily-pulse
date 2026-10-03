# Today page: one section style + remove reader-set thresholds

## 1. One look for every Today section (based on "ความเคลื่อนไหวจาก Social Media")

The pattern used by Social Media becomes the single template:
- dark top rule, red serif heading with a thin line running to the right
- one short grey note under the heading (source + "not a signal" where relevant)
- items in a two-column list, each item separated by a thin rule: small red label → main text → small grey line with time and source link
- same empty / loading / error wording style ("กำลังโหลด…", "ไม่มีข้อมูลล่าสุด", "อ่านข้อมูลไม่ได้")

Sections converted to this template:
- สถานีตรวจอากาศใกล้กรุงเทพฯ — each station becomes one item (station name label, temperature / rain as the main line, observation time + distance below)
- รถไฟฟ้า BTS/MRT — each notice is one item, full notice text kept; label shows line and whether it was counted
- ข่าวทั่วไปล่าสุด — each headline one item (source label, title, time + link)
- ผลสลากงวดล่าสุด — first prize as the main line, other prize groups as compact rows, draw date + official link below
- ความเคลื่อนไหวจากหน่วยงานราชการ already matches; switched to the shared template so it stays in sync

Page tidy-up (reading order and spacing only, no data changes):
```text
Summary + upcoming dates
สัญญาณวันนี้
Bangkok now: map  →  weather stations  →  BTS/MRT
Social Media  →  general news  →  agency news
Lottery  →  rest of page
```
- equal spacing between sections, one "see all" link per section at the bottom right of the heading, consistent date/time format (e.g. "4 ต.ค. 03:40 น.")
- the map keeps its own interactive layout but gets the same heading style

## 2. Remove reader-adjustable thresholds everywhere

Today will show every real signal that passed the official threshold — no reader filter.
Remove completely:
- "ระดับความไว" (low / medium / high) setting on the settings page and its saved per-device value
- the filter on สัญญาณวันนี้ that hides signals by that level or by reader-chosen sources; heading note reworded to "เฉพาะข้อมูลที่เปลี่ยนเกินเกณฑ์ตรวจสอบ"
- the per-item "ตั้งเกณฑ์เอง" page for cost-of-living items and every link to it ("วิเคราะห์สัญญาณ / ตั้งเกณฑ์เอง →"); links point to the item's price page instead
- any leftover saved values on the reader's device are cleared once

Kept unchanged: official thresholds, detection, late-arrival rules, refresh-interval and update-time settings, admin source on/off.

## Technical details
- New `src/components/today-section.tsx`: `TodaySection` (heading, note, actions, children) + `TodayList` / `TodayItem` (label, body, meta) extracted from `social-feed.tsx`; SocialFeed, StationMap, RailStatus, GeneralNews, LatestLottery and the agency-news block in `routes/index.tsx` use it. BkkMap's `EditorialDataSection` header swapped for `TodaySection`.
- Delete `src/hooks/use-sensitivity.ts`, `Sensitivity` / `SENS_SEVERITIES` in `lib/signals.ts`, sensitivity block in `routes/_admin/settings.tsx`, `routes/cost-signals.$item.tsx`; remove links in `cost-trend.index.tsx`, `cost-trend.$item.tsx`, `cost-signal-chart.tsx`, `cost-signal-calc.tsx`.
- `routes/index.tsx`: `moves = signals.filter(s => !s.is_demo)`; drop `useSourcePrefs().disabled` filter there (prefs still used for refresh interval).
- One-time `localStorage.removeItem("tds-sensitivity")` and `cost-threshold:*` keys in __root.
- Update `src/lib/AGENTS.md` (remove reader-threshold note) and `AGENTS.md` (preferences list no longer includes sensitivity).
- Verify with Playwright desktop + mobile screenshots of the Today page.
