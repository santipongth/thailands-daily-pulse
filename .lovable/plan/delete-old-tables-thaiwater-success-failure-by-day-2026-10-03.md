# Delete old tables + ThaiWater success/failure by day

## 1. Delete the 3 old open-data tables
- I can't change Lovable Cloud permissions myself. You first change the Lovable Cloud tool setting "Execute backward incompatible database migrations" to "Ask each time" (or "Always allow").
- Then I send the deletion of the 3 retired open-data catalog tables. With "Ask each time", a card appears and you approve it.
- If the setting is still blocked, I stop and tell you. Nothing else changes.
- "ข้อมูลทั้งหมด" doesn't use these tables (code search found none). After deletion I re-check the page opens normally on the preview and on the live site.

## 2. ThaiWater day-by-day log on "ข้อมูลทั้งหมด"
- In the ThaiWater box, add a table with one row per day for the last 30 days: number of tries, how many succeeded or failed, time of the last success, and the most common failure reason in plain Thai. For example "ถูกจำกัดคำขอ (429) — ปลายทางบล็อกเซิร์ฟเวอร์" or "Firecrawl ถูกบล็อกด้วย".
- Days with no tries say "ไม่มีรอบดึงวันนี้" instead of a blank.
- Each failure reason links to the full original error message.
- Keep the existing list of the 10 latest tries.

## Technical details
- Migration: `DROP TABLE public.gov_changes; DROP TABLE public.gov_snapshots; DROP TABLE public.gov_datasets;` once permission allows. Types regenerate. Remove the "DEPRECATED catalog" note from AGENTS.md if present.
- dams-monitor.tsx: query source_run_history `like ThaiWater%` for 30 days (limit 1000), group by Bangkok date, and map raw errors to Thai labels (429, 5xx, timeout, Firecrawl prefix, other → verbatim).
- Republish, then check with Playwright on the published URL.
