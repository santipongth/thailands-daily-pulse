# Daily official-data schedule, failure alerts, and auditable scoring

## Already in place
- Hourly collection job (runs at :05 every hour) and the 06:00 Daily Brief job (with a 06:20 retry).
- A red banner and a browser notification when a followed source fails, linking to the failures page.
- Household impact numbers are computed in code; AI writes only the intro.

## What changes

1. **A guaranteed daily update for government sources**
   - Add a separate daily job at 05:30 Bangkok (before the brief) that forces a full run of every government crawler and open-data catalog, even if the hourly job skipped them because data looked fresh.
   - Record each daily run (which sources were OK or failed, and why) so the failures and monitor pages show "last daily run".

2. **Clear failure alerts**
   - Failed sources the user follows show up in the banner as soon as the page opens, plus a "daily run failed" badge in the header that links straight to the failures page, with the failing sources pre-filtered.
   - The browser notification links to the same filtered page.
   - A "Retry now" button on the failures page (rate-limited) to fetch those sources again.

3. **Numbers come only from code**
   - Every number in the brief and on signal cards (change, %, household cost, rank) comes from code. A check rejects AI intro text that contains any number not found in the computed facts, and falls back to a template intro if it does.
   - Label in the UI: "ตัวเลขคำนวณโดยระบบ — AI ใช้เรียบเรียงภาษาเท่านั้น".

4. **Auditable ranking**
   - Replace the severity-only sort with a published score:
     `score = severity weight (high 3 / medium 2 / low 1) x z-score factor x source trust (high 1.0 / medium 0.7) x household reach (per family, fixed table)`
   - Store the score and each part in the signal's `checks`, show it in the "why" dialog, and use it to order the homepage, daily page, and brief.
   - Add a "Method" page that explains the detection rules (thresholds, minimum %, max data gap, normal-volatility test), the ranking formula, and the impact formulas, with the actual values per metric.

## Technical details
- New cron job `gov-daily-0530` (22:30 UTC) POSTing `/api/public/ingest?mode=daily`; the route forces crawlers + catalog, ignoring staleness, still lease-guarded.
- Migration: `signals.score numeric`, `families.reach numeric default 1`; `detect_signals` computes score and writes components into `checks`. Catalog-written agency signals compute the same score in code.
- `src/lib/impact.ts`: export `rankScore()` and a `numbersInText()` validator used by `refreshBrief`.
- `source_runs`/`source_run_history` gain `run_kind` ('hourly'|'daily'|'manual') for the "last daily run" display.
- New route `/method`; `/failures` reads a `?followed=1` filter.
- Record the scoring and AI-validation rules in AGENTS.md.
