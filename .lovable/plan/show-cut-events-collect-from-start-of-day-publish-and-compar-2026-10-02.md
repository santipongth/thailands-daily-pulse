# Show cut events, collect from start of day, publish and compare tomorrow

## 1. Collect real data from the start of the day
- New counting window for each brief: **00:00 → 05:45 Bangkok** on the brief day (instead of 05:45 yesterday → 05:45 today).
- Add early forced collection runs at **00:10, 03:00 and 05:00** (plus the existing 05:30), so fuel, gold and currency prices that change overnight arrive before the 05:45 cutoff rather than at 09:05.
- Anything received after 05:45 is still cut and moves to "updates after the brief".

```text
00:00 ---- 00:10 / 03:00 / 05:00 / 05:30 runs ---- 05:45 cutoff | after = cut -> updates
           counted in the 06:00 brief                           | not in the brief
```

## 2. Show cut events and the real collection times everywhere
For each brief, show: the counting window, the time of the first and last value actually received, what was included, and what was cut with its reason (e.g. "ได้รับ 09:05 หลังเวลาตัด 05:45").
- **Daily Brief page**: existing window box gains "first/last value received" times.
- **Events page (เหตุการณ์ที่ผ่านมา)**: new section "ตัดออกจาก Daily Brief" listing every cut event by date, with reason and received time, linking to the event.
- **Impact page (สูตรผลกระทบ)**: items whose latest change was cut show a note "ไม่อยู่ใน Brief วันที่ ... — เหตุผล ...".

## 3. Built-in day-to-day comparison
On each brief page add "เทียบกับฉบับก่อนหน้า": values received, changes included, changes cut, sources not checkable, and household cost per day — today vs the previous brief, with "ข้อมูลจริงเปลี่ยน / ไม่เปลี่ยน" per item. This makes tomorrow's comparison visible without manual work.

## 4. Publish and tomorrow's run
- Publish the site after the changes.
- Tomorrow (3 Oct) the 05:45 freeze and 05:55 publish run on schedule. In your next message after 06:00 I will check the run and report the 3 Oct vs 2 Oct comparison (I cannot wait until tomorrow within this turn).

## Technical details
- `refreshBrief`: `windowFrom = ${date}T00:00:00+07:00`; `data_window` adds `first_received`, `last_received`, and per-excluded `received_at` (already stored).
- New pg_cron jobs calling `/api/public/ingest?mode=early` (force refresh, `run_kind` "daily", lease-guarded, no once-per-day lock) at 17:10, 20:00, 22:00 UTC.
- Events index and /impact read `daily_briefs.data_window` (public read) for the last 30 days.
- Comparison component on `brief.$date.tsx` fetches the previous `daily_briefs` row.
- Update AGENTS.md brief-window rule.
