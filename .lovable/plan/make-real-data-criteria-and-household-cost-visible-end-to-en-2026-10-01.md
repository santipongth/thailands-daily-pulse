# Make real data, criteria and household cost visible end-to-end

Much of this already exists (update times in Settings, /method, /day/$date, 06:00 brief). This plan verifies it with real data and fills the gaps.

## 1. Verify real updates (Settings -> data page)
- Set an update time in Settings a minute ahead in a test browser, wait for it to fire, confirm the toast appears.
- Confirm on the data page that CheckRaka (8 food prices) and the other sources show today's fetch time, row counts and values. Latest run: CheckRaka, PTT, Bangchak, gold, ThaiWater, weather, GLO and 6 open-data catalogs succeeded; the 5 agency websites (DDC, DOL, Fisheries, DLT, DLD) failed.
- Data page: add a "last updated / run type (hourly, daily, manual, your schedule)" column per source and a "today vs previous value" column for each metric, so you can see the update really arrived.

## 2. Method page: all criteria + worked examples
- Table of every metric: rule type, absolute/% threshold, minimum %, max gap days, volatility k, source trust.
- Step-by-step worked example built from a real recent signal (or real observations if none): previous value -> today -> change -> % -> compare to threshold -> trust multiplier -> volatility check (z vs k) -> severity -> score = severity x z-factor x trust x reach.
- A "did not become a signal" example showing which check failed.

## 3. Daily signals page with previous-day comparison and ranking
- Upgrade /day/$date: ranked list ordered by score, rank number, score bar, and the 4 score parts visible on each row.
- Side-by-side "yesterday vs today": new signals, gone signals, rank moved up/down, value before/after.
- Previous/next day navigation and a link from the homepage.

## 4. Household cost from real changes
- Extend impact calculation with a fixed "typical household daily basket" (e.g. 2 eggs, 0.2 kg pork, 0.2 kg rice, 1 L fuel, etc. — quantities are my assumptions, please confirm).
- For each real change: per-unit change x daily quantity = baht per day, x30 = per month (e.g. "pork +25 ฿/kg -> +5 ฿/day, +150 ฿/month").
- Show a daily cost example card on the day page, homepage and brief: basket yesterday vs today, total difference.

## 5. Daily Brief at 06:00
- Keep the 06:00 schedule; brief sections: today's ranked signals, household cost card (from section 4), official advice per signal with agency name and link.
- AI still only writes the intro; any number not computed by code is rejected.

## Technical details
- No new tables; uses observations, metrics, signals.checks, source_runs.
- `src/lib/impact.ts`: add `BASKET` constants + `basketDelta(observations)`; reuse in day page, brief items, homepage.
- `/data`: join latest two observations per metric; show `source_runs.run_kind`.
- `/method`: load metrics + families + one sample signal; render computation from `signals.checks` fields.
- `/day/$date`: fetch signals for date and date-1, diff by metric_id, sort by score.
- Browser test with Playwright for the scheduled time and data page.
- Note: scheduled times run only while the site is open on that device (no accounts); 05:30/06:00 server runs apply after publishing.
