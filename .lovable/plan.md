# Custom sources, custom signals, schedule check, and GitHub release

## What needs you (I can't do these myself)
- **Publish to GitHub:** click **+** in the chat box → **GitHub** → **Connect project**. This copies the whole project, including every admin page (source manager, evidence, settings, tracking and so on), because they are all part of the same code.
- **Make it public:** on GitHub, open Settings → Change visibility → Public.
- I can't publish to or check GitHub from here. Once you've connected it, I'll check the repository contains all the files.

## 1. Add your own data source (admin page "แหล่งข้อมูลของฉัน")
A new page in the admin area of every install, including self-hosted copies. A form asks for:
- Name, owning agency, link, licence or terms
- **Format:** JSON API (pick the value with a path like `data.price`), CSV (column + row match), or web page / text (a pattern that finds the number)
- Optional field for the source's own effective date (same three formats)
- A **"ทดลองดึง"** (test fetch) button that shows the value and date it found, plus the raw snippet, before saving. Nothing is stored until the test succeeds.
- Saved sources join the existing source manager automatically: on/off, schedule (hourly / every 3 h / daily at a set hour / custom times / manual), retries and request mode. They follow the same rules as built-in sources: raw-file evidence, honest dates, and failures shown openly.

## 2. Add your own signal (admin page "สัญญาณของฉัน")
Pick a source (built-in or your own), then set:
- Thai name, unit, decimals, category
- **Rule type:** price/value change (fixed amount and/or %), crossing levels (e.g. PM2.5 bands), or new announcement
- **Threshold** and **effective-from date.** The rule only applies to data from that date onward; earlier data is never re-scored, and frozen briefs never change.
- Max gap days and late-arrival window (defaults filled in)
- A **preview** that runs the rule over the stored readings and shows which past days would have triggered.

Only the admin can create or change these signals; visitors still can't set thresholds. Every threshold edit is kept with its effective date, so it's clear which rule applied on which day.

## 3. Test it myself
1. Open /setup and run the database check with this project's own database as the stand-in (a copy you install yourself works the same way). Screenshot the passing result and the generated settings.
2. Sign in as admin and add one real public source (the gold price JSON or an official CSV) with custom times. Check that the "รอบถัดไป" (next round) time shows correctly.
3. Wait for a real scheduled round, then confirm it fetched: "สำเร็จล่าสุด" (last success) updates, a reading appears on /data-all, and evidence is stored.
4. Add a signal on that source with a threshold and effective date, run the preview, and check the Today page shows it only if the threshold is crossed.
5. Remove the test source and signal afterwards, or keep them only if you want.

## Technical details
- New table `custom_sources` (key, name, owner, url, licence, format `json|csv|text`, value_path, date_path, row_match, active, created_at). Admins can read it; only the service role writes it, via `requireAdmin` server functions. It also gets a `source_registry` row and a default `source_config` row.
- A generic connector in `connectors.server.ts` loads active custom sources and fetches with `politeFetch`. Raw files are archived like other sources. Parsers are pure functions in `src/lib/custom-source.ts` with fixture tests. JSON uses dotted paths, CSV uses a column plus a row filter, and text uses a regex with one numeric group. Values are checked as finite numbers.
- `allSources()` / `customDueSpecs` include custom sources, so the existing schedule UI (`source-control.tsx`) and the queue work unchanged.
- Custom signals insert `metrics` rows (id prefix `c_`) using the existing kinds: `delta`, `level` and `release`. Detection stays SQL `detect_core`.
- New `metric_rule_versions` table (metric_id, effective_from, thresholds/bands, created_at). `detect_core` reads the rule in effect for the observation date and falls back to `metrics` when no versions exist, so built-in behaviour doesn't change.
- New admin routes `_admin/custom-sources.tsx` and `_admin/custom-signals.tsx`, linked from /admin.
- Migrations are additive only, and `database/schema.sql` is re-exported via `scripts/export-db.sh`.
- AGENTS.md gets one rule for custom sources and signals: admin-defined, official-style thresholds with effective dates, never reader-set.
