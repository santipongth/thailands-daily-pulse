# Daily Brief at 06:00: what changed, how important, household impact, what to do

## Findings (checked tonight)

- **Lottery data is wrong today.** The "รางวัลที่ 1" Signal comes from sample data. The official GLO API works:
  - The endpoint linked in the catalog page (`POST https://www.glo.or.th/api/lottery/getLatestLottery`) returns the 1 Oct 2026 draw: first prize **402701**, plus all prize tiers, the official PDF and the draw video.
  - A second official endpoint (`getLotteryResult`) returns any past draw by date, for checking and backfilling.
- **Real data status for the 8 groups:**
  - Already real: weather, PM2.5, water/dams, energy (oil), exchange rates, gold.
  - Still sample data: food prices, interest rates, economic releases.

## What users will get

1. **Correct lottery results from GLO directly:** all sample lottery numbers are removed. On draw days (1st and 16th) the system pulls the official result and shows the first prize, front/back 3 digits and last 2 digits, with a link to GLO's official PDF. The number is checked against the second GLO endpoint before it is published; if the two disagree, the result is shown as "รอยืนยัน" instead.
2. **The 8 groups on real official data:**
   - **Food prices:** daily retail prices (pork, eggs, chicken, vegetables) from the Department of Internal Trade / OAE datasets in the national data catalog. The best working series is chosen at build time.
   - **Economic releases:** CPI/inflation (TPSO), unemployment (NSO) and GDP (NESDC). These are tracked through the catalog and appear only on the day a new figure is published.
   - **Interest rates:** the policy rate and deposit/lending rates need a free Bank of Thailand API key. I'll ask you for it when we get to that step. Until then this group stays labelled as sample data.
3. **Smarter "significant change" detection:** each change is compared with the previous value and with that metric's normal day-to-day swings over the last 30 days. A change counts only when it passes the fixed threshold and is unusually large (about 2× its normal swing). For example, gold moving ฿100 on a volatile day stays silent, while the same move on a calm week becomes a Signal. The "ทำไมถึงเปลี่ยน?" dialog shows the normal swing next to today's move.
4. **Daily Brief published every morning at 06:00 (Bangkok):** a fixed format that answers 4 questions for each important item:
   - **What changed:** before → after, with the date.
   - **How important:** high / medium / low, with the reason.
   - **Impact on an ordinary household:** calculated by the system from real numbers, never invented by AI. For example:
     - a sedan filling 50 L of diesel pays ฿25 more per tank
     - a 1-baht gold necklace costs ฿300 more
     - a family buying 2 kg of pork a week pays ฿10 more
     - an overseas trip budget of $1,000 costs ฿150 more
     - for PM2.5, the number of hours above the safe level
   - **What to do:** short advice taken from the official agency's guidance, for example the Pollution Control Department's advice for each PM2.5 colour level, TMD warning text, or the Royal Irrigation Department's water notices. Each piece of advice links to its source.

   The AI only writes the short opening summary from these computed facts. The brief is stored, so everyone sees the same version that day, and a "Daily Brief" page keeps the archive of past mornings.

## Technical details

- **Lottery:**
  - Add a `lottery_draws` table (draw_date PK, first, last2, front3[], back3[], pdf_url, video_url, verified bool).
  - New connector `glo.server.ts`: call getLatestLottery, then verify with getLotteryResult for the same date.
  - Store numbers as text (to keep leading zeros) and emit a `release` signal with the formatted number.
  - Delete demo `lotto` observations and signals. The lottery UI reads `lottery_draws`.
- **Food and economic releases:** add catalog-based numeric connectors that read specific CSV resources (latest row → metric value), validated during build. Set `is_live` per family only when real values arrive.
- **Volatility:**
  - Add `metrics.vol_k numeric default 2`.
  - `detect_signals` computes the standard deviation of daily changes over the previous 30 real observations (`stddev_samp`).
  - A delta signal requires `abs(change) >= vol_k * sd` when at least 10 points exist, in addition to the current rules.
  - Severity uses the larger of threshold ratio and z-score. `sd`, `z` and `normal_range` are stored in `signals.checks`.
- **Impact and advice:**
  - `src/lib/impact.ts` holds deterministic household templates per metric (litres, grams, kg, USD) that produce a text and a baht amount.
  - `src/lib/advice.ts` maps official guidance per metric and level (PCD AQI bands, TMD warnings, RID notices) with source URLs.
- **Brief:**
  - The `daily_briefs` table gains `items jsonb` (the 4 answers per signal) and `published_at`.
  - New route `/api/public/brief`: runs a forced refresh, then builds and stores the brief. It is idempotent per date.
  - A pg_cron job at 23:00 UTC (06:00 Bangkok) calls it.
  - The homepage shows the stored 06:00 brief, and the new `/brief` and `/brief/$date` pages show the archive. The AI prompt receives only the computed items and must not add numbers.
- Update `AGENTS.md` and `roadmap.md`.
