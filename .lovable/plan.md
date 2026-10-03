# Train signals: follow when notices actually arrive, never silently drop one

## What is wrong today
- A notice is counted only if it was **posted** on today's Bangkok date. A notice posted late last night but first seen after midnight (the overnight check runs only every 3 hours) is never counted on either day.
- Notices older than 3 days at the moment of reading are thrown away before saving, with no record.
- Notices that look abnormal but don't match the signal words (e.g. station closure) are saved but nowhere shown as "not counted, because…".
- No BTS/MRT notice has been saved yet, so nothing can be checked against the page.

## Changes
1. **Count by arrival window, not only post time.** A notice counts for the brief day if it was posted in that day **or** posted in the previous gap between checks and first seen in this day (allowed lag = the real gap between checks: 1 h during service hours, 3 h overnight, worked out from actual check times). Each notice counts once, for one day only.
2. **Never drop silently.** Every abnormal notice that is read is saved, whatever its age. Each one gets a status: counted / context only (e.g. station exit change) / too old for today (posted more than the allowed lag before arrival) — with the reason stored.
3. **Show them.** On Today's train box and the train signal card: counted notices, plus a "not counted" list with the reason. On the fetch log: a train calculation box per line — check times, allowed lag, notices read, counted, not counted and why, result (1 = worth watching, 3+ = very important — unchanged).
4. **Check** with a test round and the saved data that every abnormal notice appears somewhere on the page.

## Technical details
- `social_posts`: add nullable `rail_status` (`counted|context|late`) and `rail_reason`; remove 3-day filter in `rail.server.ts` (keep dedupe by post_id).
- Counting in `refreshRail`: window = [day 00:00 − lastGap, day end] on `posted_at`, with `received_at` within the day; lastGap from `source_run_history` for the rail source.
- `rail-status.tsx`, `rail-signal-chart.tsx`, new `rail-signal-calc.tsx` on /raw-log; rule recorded in `src/lib/AGENTS.md`.
- Thresholds (bands {1,3}) unchanged.
