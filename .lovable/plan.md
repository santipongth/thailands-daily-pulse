# CheckRaka food prices + user-chosen update time

## 1. Food prices from CheckRaka (replacing กรมการค้าภายใน)
- The "ของกิน/ค่าครองชีพ" group switches its source to CheckRaka (checkraka.app/price). CheckRaka's pages list today's prices per item, collected from 9 sources and updated every day at 05:00.
- New daily crawler reads the item pages (pork, egg, chicken, vegetables, rice, etc.). For each item it saves the typical price (median across CheckRaka's sources) plus the lowest and highest price.
- Runs once a day in the 05:30 government run, after CheckRaka updates at 05:00. Hourly runs skip it because the prices change only once a day. It is polite to the site: one visit per page per day, with a short pause between pages.
- The food group is marked as real data. Its trust level is set to "medium" because CheckRaka collects prices from other sites rather than being an official agency, so changes have to be bigger before they become a signal. The page always shows "ที่มา: CheckRaka".
- Success or failure for CheckRaka shows on the data, monitor, and failures pages like the other sources.
- Pork and egg household impact (2 kg of pork a week, 30 eggs a month) now uses these real prices.

## 2. Settings: choose your own update time
- Settings gets a "เวลาอัปเดตข้อมูลรัฐ" picker. It replaces the current "every N hours" option. Pick one or more times of day (Bangkok time), e.g. 07:00 and 18:00. Saved on this device.
- When a chosen time passes and the site is open (or the next time you open it), the site starts an update of the sources you follow. If one ran within the last 30 minutes, it uses that result instead.
- Afterwards it shows a message and a browser notification, e.g. "อัปเดตรอบ 07:00 เสร็จแล้ว — เปลี่ยน 3 รายการ, ล้มเหลว 1 แหล่ง". Tapping it opens the monitor page, or the failures page if something failed.
- Settings shows "รอบถัดไป" (next update) and "อัปเดตล่าสุด" (last update).
- Limit: there are no accounts, so your chosen time only works while the site is open on this device, or on the next visit. The system still collects everything for everyone at 05:30 every day, plus a light check every hour.

## Technical details
- `src/lib/checkraka.server.ts`: fetch `/price/<slug>-today/`, parse item rows (name, price, unit, source count), map to metrics (`pork`, `egg`, `chicken`, `rice`, `veg_*`); median per item; returns `{values, runs}` with kind "crawler".
- Called from `refreshIfStale` only when `runKind` is `daily`/`manual`, or when today's food observations are missing.
- Data update (via data tool): `families.food` → `source_name='CheckRaka'`, `source_url='https://checkraka.app/price/'`, `is_live=true`, `trust='medium'`; add missing metrics with delta thresholds; remove demo food observations so real history starts clean.
- `use-source-prefs`: replace `intervalHours` with `times: string[]` (keep reading the old value as a fallback); new `useScheduledRefresh` hook in `__root` checks every minute, calls `refreshData` with force and a 30-min freshness window, then diffs `source_runs`/`signals` before vs after for the notification.
- `refreshData` server function accepts `{ force: boolean }`, still lease-guarded and rate-limited (once per 10 min overall).
- Update AGENTS.md: food prices come from CheckRaka (aggregator, medium trust); per-device update times run in the browser.
