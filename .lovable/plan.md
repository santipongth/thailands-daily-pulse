# Signals follow real arrival time, and every source can be managed

## 1. Signals for every category follow when data actually arrives

Goal: a real above-threshold change is never silently dropped because it arrived late, and every card shows the date the change takes effect.

- Go through every category (water, weather, air, rail, fuel, gas, wage, electricity, food prices, gold, exchange rate, traffic, disasters, earthquakes) and give each one a late-arrival window based on how that source really publishes (from its observed arrival delay; long windows for slow official notices such as wage).
- A late above-threshold reading creates a signal on the day it arrives. The signal keeps its original data date, effective date and received time. Signal thresholds stay as they are.
- Every signal card on Today, in the brief and on admin pages shows three dates: data date, **effective date**, and received date/time. When the source gives no effective date, the card says so instead of guessing.
- New admin box, "สัญญาณที่มาช้า": lists late signals with all three dates, the reason, and a link to the evidence. Nothing is hidden.
- Fix the open issues from last time: no duplicate late signals, and a late signal is never deleted by the normal daily recheck.
- Test with real stored history: replay recent days and confirm that late readings show up, with no duplicates.

## 2. The source manager lists every source

Checked: all 28 sources that recorded a fetch are already in "จัดการแหล่งข้อมูล (ผู้ดูแล)". Gaps found:

- **Dams timer** (hourly at :20, ThaiWater and RID dams) runs on its own timer, so turning those sources off or changing their schedule does not stop it. It will follow the manager settings.
- **Forced rounds** (05:30 daily and the 00:10/03:00/05:00 early rounds): check whether they still fetch sources that are turned off. A source that is turned off stays off. The only exception is the "ดึงตอนนี้" button.
- **"ข่าว RSS"** is in the list but has never run. Either fix it or remove it from the list, depending on what the check shows.
- Each row will show: what the source covers, its link, its last successful fetch, its latest data date and its current schedule. Rows will be grouped by category (weather/water, air, traffic/rail, prices, calendar/news) so they're easier to find.

## Technical details

- Migration: add `metrics.late_window_days`, filled from `lag_days`/`expected_days` per family (keep the 730d labour, 45d LPG and 7d oil windows). `detect_received_signals` uses this window and `ON CONFLICT (metric_id, signal_date)` with an arrival-rule guard. The `detect_signals` delete branch keeps rows where `arrival_rule='late_above_threshold'`.
- Cards read `observations.effective_from` for the signal's observation. These go through the shared card or `WeeklyComparison` header.
- `ingest.ts` modes dams/daily/early: run `applySourceConfig` filtering. `refreshDams` checks enabled for "ThaiWater (สสน.)" and "RID อ่างเก็บน้ำ".
- `allSources()` gains `group` metadata. The source-control list adds latest observation date and last ok time from `source_runs`.
- Update the AGENTS.md rules for the late window and the source manager scope.
