# Real usage numbers, clear cutoff window, and impact-formula tracker page

## 1. Usage numbers from official sources
Replace the amounts I picked myself (3 L/day fuel, 1 baht-weight of gold, 1,000 USD, food basket) with figures from official publications:
- **Fuel**: Energy Policy and Planning Office (สนพ.) national daily use per fuel type (diesel, gasohol 95, E20) divided by registered vehicles/households (กรมการขนส่ง registration stats via open data) → litres per household per day.
- **Food**: National Statistical Office household socio-economic survey (สำนักงานสถิติแห่งชาติ, SES) average monthly household food spend per category, converted to kg/day using today's prices; Office of Agricultural Economics per-person consumption (rice, pork, chicken, eggs) where published.
- **Gold**: no official per-household use exists. Keep it a "per purchase" example (1 baht-weight) and label it clearly as an example, not national use.
- **Currency**: same — example amount per trip, labelled as an example.

Each number is saved with: value, source agency, publication name, year, link, and how it was converted. If a source can't be fetched or found, the item keeps its current number and is marked "ตัวเลขสมมติ — ยังไม่มีแหล่งรัฐ".

## 2. Clear data window for the 06:00 brief
Show and enforce one rule:

```text
previous 05:45  ->  today 05:45   = counted in today's brief (real data)
after 05:45                       = cut off -> goes to "updates after brief" list
demo data / failed sources        = never counted, marked "ตรวจไม่ได้"
```
- Brief freeze uses the exact 05:45 Bangkok time (not "whenever the job ran"), and only values received inside the window count.
- Brief page and Method page show the window, how many values were inside it, and which ones were cut and why.
- Then run the 05:45 freeze + 05:55 publish for today as a real test and report the result.

## 3. New page: ติดตามสูตรผลกระทบ (/impact)
- Table per item: usage amount + its source, yesterday price, today price, change, baht/day, baht/month (or per purchase), with the step-by-step working.
- "แก้ตัวเลขการใช้ของฉัน" — edit any amount; results recalculate instantly. Saved on this device only (no accounts), with "คืนค่าทางการ" reset button. Official briefs always use the official numbers.
- Link from the top menu and the brief's cost card; added to the sitemap with its own title/description.

## Technical details
- New `usage_assumptions` table (metric_id, qty, unit, period, source_agency, source_title, source_year, source_url, method_note, is_official), public read RLS + grants; seeded in a migration. `impactFor` reads these instead of the hard-coded `USAGE`; stored `impact.calc` includes the source so it stays recomputable.
- `refreshBrief` freeze: cutoff = `date 05:45 Asia/Bangkok`; items filtered by `observations.received_at <= cutoff` (same rule as `replay_signals`); store `completeness.window {from, to, included, excluded[]}`.
- `/impact` route reads `usage_assumptions` + latest observations; overrides in localStorage (`tds-usage-overrides`), shared calc function with impact.ts.
- Update AGENTS.md impact + brief-window rules.
