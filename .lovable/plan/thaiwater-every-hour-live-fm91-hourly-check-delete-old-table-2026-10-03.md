# ThaiWater every hour, live FM91 hourly check, delete old tables

## 1. Dams every hour, compared with older values (ข้อมูลทั้งหมด)
- Check the live hourly dam run (:20) is really firing: read recent run history for ThaiWater and RID on the live site.
- Chao Phraya comes only from ThaiWater, which still refuses the hosting servers (429). Pasak comes from the Royal Irrigation Department and works. If ThaiWater keeps refusing, the box keeps showing the exact reason per hour instead of a blank.
- On "ข้อมูลทั้งหมด" dam box, add a comparison table per dam: this hour vs previous hour, vs same hour yesterday, and vs the previous day's value, from the hourly readings.
- Publish, then confirm on the live site that hourly points appear after the next :20 run.

## 2. FM91 hourly chart on the live site
- Publish the current version (hourly chart is not live yet).
- Open https://thailands-daily-pulse.lovable.app/data-all in a test browser, screenshot the FM91 hourly chart, and report exactly what shows: today's bars, whether a "yesterday" line exists (first real comparison possible only from 4 Oct since posts started 3 Oct).
- If the X page returned no posts on live runs, report that with the stored reason.

## 3. Delete the old unused tables
- Delete the 3 retired open-data catalog tables completely (catalog changes, snapshots, datasets).
- This needs your permission: Lovable Cloud tool setting "Execute backward incompatible database migrations" must be changed to "Ask each time" first; then you confirm the delete card.
- Before deleting, re-check nothing on the site still reads them, and scan for any other unused tables (e.g. tables with no code using them) and list them for you rather than deleting silently.
- Update "ข้อมูลทั้งหมด" so its counts and sections match what is left (no references to removed tables).

## Technical details
- dam_readings already stores each :20 run; add HourCompare in dams-monitor.tsx (latest read vs previous read, vs read nearest to now-24h, vs previous observed_on).
- Migration: `DROP TABLE public.gov_changes, public.gov_snapshots, public.gov_datasets;` (order respects FKs), then types regenerate.
- Playwright verification against the published URL only; no claims beyond what screenshots show.
