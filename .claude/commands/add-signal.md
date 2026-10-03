---
description: Add or change a signal rule
---
# Add or change a signal rule

- Non-developers: admin → "สัญญาณของฉัน" creates a `metric_rule_versions` row (kind delta|level|release, thresholds, `effective_from` ≥ today).
- In code: add a `metric_rule_versions` row in a migration rather than editing `metrics` thresholds, so past days are never re-scored and published briefs never change.
- Thresholds must come from an official or published standard; cite it in `note`.
- Logic lives in SQL `detect_core(date, cutoff)`; mirror helpers in TypeScript only for display (e.g. `weeklyCalc`).
- Verify with `select * from detect_core(current_date, now())` on a test database, then `bun run db:export`.
