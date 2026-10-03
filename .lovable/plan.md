# Plan: Longdo/ThaiWater request modes, data map page, Today cleanup

## Current state (checked)
- Longdo Traffic Index: latest runs succeed (index 4.7 received today 12:12 UTC), but there are gaps between runs (e.g. 09:03 → 12:12). It uses a plain request with no retry and no alternative route.
- ThaiWater: every run fails with 429 on both the direct request and Firecrawl. Pasak and Khun Dan already come from RID and work; only the Chao Phraya dam (station C.13) depends on ThaiWater.
- Today "กำลังจะมา": shows two separately sorted lists (release calendar, then holidays/tax), so dates go back in time between the two lists.
- Today has a "เทียบสัญญาณกับวันก่อน →" link under the date bar.

## 1. Longdo — request modes + settings option
- Add request modes: `direct` (browser-like request through the shared polite fetcher with retry/backoff), `firecrawl`, and `auto` (direct then Firecrawl). Default `auto`.
- Store the choice in a site setting; record the real error text per attempt in the source status.
- Settings page: new "วิธีดึงข้อมูล" card with a selector for Longdo, last run time and status.

## 2. ThaiWater 429 — request modes + settings option
- Replace the single heavy `thailand_main` call with a lighter, targeted request for station C.13 water level (smaller payload, less likely rate-limited), keeping `thailand_main` as a fallback.
- Respect `Retry-After`, spread retries with delay, and avoid calling more than once per hour (dams cron already hourly).
- Modes: `direct`, `firecrawl`, `auto` (light endpoint → full endpoint → Firecrawl). Keeps existing `thaiwater_mode` setting, extended with the new values.
- Pasak keeps coming from RID (already working); if ThaiWater still returns a Pasak value it is used only as a cross-check, not overriding RID.
- Settings page: selector for ThaiWater in the same card, with last success/failure and reason.
- Honest result: if ThaiWater still blocks us after the change, the reason is shown as today — no fake values.

## 3. New page "แผนผังข้อมูล" (/data-map)
- Lists every active source grouped by agency (government / other), each with: what it feeds (data groups), update cycle, last update time, last success time, status (ครบ / เก่า / ตรวจสอบไม่ได้) and reason.
- Simple flow diagram on top: แหล่งข้อมูล → ข้อมูลที่เก็บ → สัญญาณ / Daily Brief.
- Same editorial theme, responsive, own title/description; added to the menu, footer and sitemap.

## 4. Today page fixes
- "กำลังจะมา": merge release calendar, holidays and tax deadlines into one list sorted by date ascending (earliest first), limit to the next items.
- Remove the "เทียบสัญญาณกับวันก่อน →" link and its wrapper.

## Out of scope
No changes to signal detection, ranking, brief cutoff, impact formula or cron times. No publish.

## Technical details
- `connectors.server.ts`: Longdo and ThaiWater read mode from `app_settings` (`longdo_mode`, `thaiwater_mode`); requests via `politeFetch`; Firecrawl via existing `firecrawlJson`. Errors concatenated per attempt into `source_runs.error`.
- New server fn `setFetchMode` in `src/lib/settings.functions.ts` (zod enum validated, only these two keys writable) following the existing `setHolidayUrl` pattern; settings card reads `app_settings` via anon client.
- New route `src/routes/data-map.tsx` using `registryQuery` + `computeCompleteness` + `SOURCES`/`AGENCIES`.
- `index.tsx`: combine `data.calendar` with `upcomingQuery` rows, sort by date, remove line 90 link.
- Update `src/lib/AGENTS.md` (fetch modes) and roadmap; verify with tsgo, a live connector run for both sources, Playwright 390/1280.
