# Signal alerts, raw-file archive, real-change ranking, daily data check

## 1. Alert when today's signals really change + open Daily Brief at 06:00
- New `BriefAlert` in the root layout: after 06:00 Bangkok, if today's brief is published and not yet seen on this device, show a banner "Daily Brief วันนี้พร้อมแล้ว — N สัญญาณเปลี่ยนจริง" + browser notification; clicking opens `/brief/<today>` directly. If the page is open at 06:00, it navigates/notifies at that moment.
- During the day: compare today's real (non-demo) signal set with the last set seen on this device; when it changes, toast + notification "มีสัญญาณใหม่ X รายการ" linking to `/day/<today>`. Days with no real change stay silent.
- Seen state stored per device (no accounts).

## 2. New page "ไฟล์ดิบ" (`/evidence`)
- Grouped by agency/source; each row: fetch date/time, URL, size, SHA-256, open-file button.
- Compare with previous file of the same URL: "เหมือนเดิม" when hash equal; otherwise "เปลี่ยน" with size difference and, for text files (HTML/JSON/CSV/XML), a line-by-line diff (added/removed, first ~200 lines) loaded on demand server-side.
- Filter by source and date; link from `/data`, `/monitor`, masthead.

## 3. Rank signals by real government-data change, not newspapers
- Ranking only counts signals backed by measured observations / official datasets (`is_demo=false`). News never creates or boosts a signal; demo signals are shown below real ones with score 0 on days where real data exists.
- Add an "evidence factor" to the score: 1.0 when the signal's source has a raw file fetched that day whose hash changed vs previous, 0.8 when unchanged/no file. Shown in the score breakdown and on `/method`.

## 4. Scheduled times run on time + daily verification
- Tighten `ScheduledRefresh`: check every 15 s and fire within the chosen minute; also catch up on next visit. Show "ครั้งถัดไป" countdown in Settings.
- `/data`: new "ข้อมูลรายวัน" panel showing, for CheckRaka, RakaKaset and Longdo, a 7-day grid (got data / missing) per Bangkok day, so daily arrival is visible.
- Make CheckRaka/RakaKaset run on the hourly cron too when today's values are missing (already partly), and Longdo every hour.

## 5. Test a self-set time end-to-end
- After building: set a time 1–2 minutes ahead in Settings (browser test), wait, then confirm the job queue on `/data` shows queued -> running -> done with attempts/values, and that the raw-file links open. Report results.

## Technical details
- New server fn `listEvidence` / `evidenceDiff(id)` in `src/lib/signals.functions.ts` (admin download of both files, simple LCS line diff, text only, capped 500 KB).
- `rank_signals` migration: add `ef` evidence factor via join raw_evidence on source + date; real-first ordering; record in `checks.score.evidence_factor`. Update `/method` and `impact.ts` constants.
- Components: `src/components/brief-alert.tsx`, `src/routes/evidence.tsx`, daily-arrival panel in `data.tsx`.
- Update AGENTS.md with evidence-factor and brief-alert rules.
