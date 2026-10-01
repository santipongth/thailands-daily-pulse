# Household impact formula, live 05:45 run, event history page, backfill

## 1. Household impact formula (stored, recomputable)
- One formula per basket item: `(new price − previous price) × daily quantity` = extra baht/day; × 30 = per month. Uses only real observations (is_demo = false) with both dates shown.
- Saved into each signal version (`impact`: inputs, quantities, dates, result) so every number can be recalculated later.
- Daily Brief gets a "ค่าใช้จ่ายรายวันตัวอย่าง" card: a table per item (เมื่อวาน → วันนี้, ปริมาณ/วัน, +/- บาท/วัน), a total per day and per month, the formula written out, and a link to the raw file for each price.
- Items without a real previous price are shown as "ยังไม่มีข้อมูลเทียบ" — never as 0.

## 2. Publish and run 05:45 for real
- Publish the site so the scheduled 05:30 / 05:45 / 05:55 runs reach it.
- After 05:45 and 05:55 Bangkok, check the frozen data, the published Brief, each event page: raw file links, rule, score, and impact formula present. Report what showed and anything missing.

## 3. Event history page (/events)
- List of all past events, newest first, filters: ทั้งหมด / ใช้งาน / แก้ไขแล้ว / ถอนแล้ว, and by group.
- Each row: title, data date (วันที่ข้อมูลเปลี่ยนจริง), first seen time, current version, status badge, quality (verified / ตรวจสอบไม่ได้ / demo); opens the existing event detail page with version history.
- Add "เหตุการณ์" to the top menu.

## 4. Backfill past data
- Only sources that publish history can be backfilled honestly:
  - Open-Meteo air/weather archive, ExchangeRate history, Longdo traffic (if history available), RakaKaset table dates, CheckRaka price history (where the page exposes it), lottery past draws (GLO), gdcatalog snapshots (metadata dates only).
  - Oil, gold, water level and agency websites: no history offered -> marked "ไม่มีข้อมูลย้อนหลัง" on the sources page, not invented.
- Backfilled rows keep their real data date, `received_at` = backfill time, and are tagged run kind `backfill`; raw files archived as evidence.
- Then run detection day by day for the backfilled range (last 30 days) so events appear in the register, and build archive Briefs for those days marked "ฉบับย้อนหลัง" (not claimed as published at 06:00 then).

## Technical details
- `impact.ts`: `impactFor(signal, prevObs, newObs)` returns `{formula, inputs, perDay, perMonth}`; written into `signal_versions.impact` by refreshBrief and backfill.
- New `src/lib/backfill.server.ts` + job type `backfill` in queue; endpoint `/api/public/ingest?mode=backfill&days=30` guarded by cron secret; one-time trigger.
- Detection replay uses existing `detect_signals(date)` looping oldest to newest; versioning trigger unchanged.
- New route `src/routes/events.index.tsx` (public reads via browser client).
- Brief builder accepts `edition_kind: backfill`; stored in `daily_briefs.completeness`.
- Update AGENTS.md for backfill and impact storage rules.
