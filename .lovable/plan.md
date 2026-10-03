# Cooking gas price from the EPPO page (AI-read) + "missing for days" alert in admin

## What I found on the page you gave
- The page loads its numbers after it opens. The plain page text only shows "ราคาขายปลีก LPG ณ วันที่ 4 ตุลาคม 2026 Loading.....", and that date is just today's date.
- The page gets its numbers from the same EPPO feed we already use, and that feed still says 2023. So the page has to be opened fully, like in a browser, before AI can read it.

## 1. Cooking gas (15 kg tank) read by AI
- Each daily run opens the EPPO page fully through Firecrawl (about 1 credit), then AI reads the cooking gas 15 kg tank price and the date the page says the price applies from.
- AI must quote the exact text it read for the price and the date. If that text is not really on the page, or the price is outside 300–700 ฿, the run fails and nothing is saved.
- Dates are kept honestly:
  - If the page gives a real effective date (for example "มีผลตั้งแต่"), that date is used.
  - If it only shows "ณ วันที่ today", the price is saved as checked today. Its effective date is the first day we saw this price, labelled "ยืนยันจากหน้า สนพ. วันที่ …".
- Admin data page: the LPG chart shows each price with its effective date and the day we received it. A note shows "สนพ. อัปเดตราคาล่าสุดวันที่ …".
- A change in price creates a signal using the existing 45-day late-arrival window and the current threshold (1 ฿). Old 2023 values are never used.
- Right after building, I run it once and tell you the real price and the date EPPO updated it.
- LPG stays out of the household cost total, as you asked before.

## 2. Admin alert: source missing data for several days
- New box at the top of /admin: "แหล่งข้อมูลขาดข้อมูลหลายวัน".
- It lists every source whose newest real data is older than its allowed age (wage and LPG get longer allowances). Each row shows the source, the last date with data, how many days are missing, and the latest reason.
- Each row links to that source's settings and /tracking. If nothing is missing, the box shows "ครบทุกแหล่ง".
- It appears on the admin pages only, not in the site header (keeps your earlier rule).

## Technical details
- `src/lib/lpg-ai.server.ts`: `firecrawlMarkdown(EPPO_LPG_PAGE, {waitFor})` → AI Gateway Responses `openai/gpt-6-astra`, streamed, strict JSON `{price_15kg, effective_date|null, as_of_date, price_quote, date_quote}`. Validate that the quotes are substrings of the markdown and the price is in range. 402/403 pauses via app_settings like FM91.
- LPG connector in `connectors.server.ts` switches to this reader. `dates.lpg` = effective_date ?? first observed_on of the same price; `sample` names the EPPO update date. The raw page is archived as evidence.
- Pure `parseLpgAiResult` plus vitest fixtures (valid, quote not found, out of range, only "ณ วันที่").
- `src/components/stale-sources-alert.tsx` on /admin: uses `registryQuery`/`computeCompleteness` (status stale/unverifiable, `data_date`, `reason`), threshold = `stale_after_days` from `source_registry`, longer for lpg/wage. Adjust those registry rows through a data update.
- Update `src/lib/AGENTS.md` (LPG = AI-read EPPO page with quote verification).
