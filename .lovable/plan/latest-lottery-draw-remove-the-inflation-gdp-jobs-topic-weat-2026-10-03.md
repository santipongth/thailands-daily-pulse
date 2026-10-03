# Latest lottery draw, remove the inflation/GDP/jobs topic, weather comparison

## What you will get

1. **The lottery always shows the latest draw.** Results come out on the 1st and 16th, so on other days there is no new data. Instead of a blank, both pages show the most recent draw (currently 1 Oct 2569):
   - "วันนี้" (home page): a box "ผลสลากงวดล่าสุด" with the draw date, 1st prize, front-3, back-3 and last-2 numbers, a "verified by 2 sources" mark, and the next draw date.
   - "ข้อมูลทั้งหมด": the lottery row shows the same latest draw and its date, instead of "ไม่มีค่า". The reason "ไม่ใช่วันออกสลาก" is replaced by "งวดล่าสุด 1 ต.ค. — งวดถัดไป 16 ต.ค.".
   - The Daily Brief comparison table uses the same wording.
2. **"🇹🇭 เงินเฟ้อ / GDP / งาน" is removed completely:**
   - Deleted: the inflation, GDP and unemployment figures, their 4 stored values, 2 signals and their events and brief updates, the 3 release-calendar dates, and 1 tagged news headline.
   - Gone from the code: the news keyword rule, the "announced on schedule" reason, and the settings-page sentence mentioning inflation/GDP.
   - Pages built from the topic list (home, signals, sources, key data, all data, settings, tracking) drop it automatically. I will search for leftover links afterwards so none point to a removed page.
3. **Weather comparison and the Python program.** The brief already compares today with the day before and has daily charts, for both the forecast and the stations near Bangkok. I can't run anything tomorrow on my own. Message me after 06:00 and I'll run the Python program and check its results against the brief and the charts.

## Technical details

- New `LatestLottery` component that reads `lottery_draws` ordered by `draw_date desc limit 1`. It goes on `src/routes/index.tsx` and at the top of the lottery family section in `data-all.tsx` (the `lotto` metric has no observations, so the row uses the draw instead).
- `missing-reason.ts`: lotto reason = latest draw date + next 1st/16th; remove `REL_KW`.
- Data deletion (data tool, signals trigger disabled during the delete): signal_versions/signal_events/brief_updates for event_ids `cpi:%|gdp:%|unemp:%`, signals, observations, release_calendar (family macro), news_items (family macro), metrics cpi/gdp/unemp, family macro.
- Remove the `macro` mapping in `news.server.ts`, and `macro`/cpi entries from `sources.ts`/`impact.ts` if present. Update the settings text. Then use rg to check for `macro|cpi|gdp|unemp|เงินเฟ้อ`.
