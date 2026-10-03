# More signal cards on Today, full train notices, 1-year cost chart

## 1. Fuller "สัญญาณวันนี้" (no fake signals)
Today only shows signals that pass the reader's importance setting, so minor ones (e.g. pork −6.5%) are hidden and the grid looks empty.
- **All real signals as cards:** signals below the reader's chosen importance level are shown in a second row "สัญญาณระดับเล็กน้อย", in a lighter style, instead of being hidden. The count in the heading shows "shown / total".
- **"ใกล้เกณฑ์" (near threshold) cards:** items whose real change today is at least 70% of their threshold, clearly labelled "ยังไม่ใช่สัญญาณ" with change vs threshold and a small sparkline. They fill the grid, but are never counted as signals or put in the brief.
- **Layout:** 4 columns on wide screens; important signals span 2 columns with a bigger chart.

## 2. Full train notice text on the signal card
The train signal card shows every counted notice in full (time posted, time picked up, full text, link to the original post), not just the importance level and a 120-character cut. Notices that weren't counted stay in their own list, also in full, with the reason.

## 3. Cost-of-living chart up to 1 year
- Range buttons: 7 days / 30 days / 90 days / 1 year, on the overview page and each item page.
- A dashed line for **last year's average** for the same period. Real prices only start on 1 Jul 2026, so there is no previous-year data yet. The page will say "ยังไม่มีข้อมูลปีก่อนหน้า" (no data from last year yet) and show the line automatically once a full year of data exists. Nothing is estimated or filled in.
- Until then, the 1-year view also shows a dotted line for the average over the whole stored period, labelled as that.

## Technical details
- `index.tsx`: split `allMoves` into `moves` (passes sensitivity) and `minor`; a new `nearMisses` uses existing observations + metric thresholds (|Δ| ≥ 0.7 × threshold_abs/pct, and no signal), rendered by a new `WatchCard`. Grid `lg:grid-cols-4`, with high severity `lg:col-span-2`.
- `rail-signal-chart.tsx`: list all `todays` with full `text`, `received_at`; the skipped list is in full.
- `cost-trend.index.tsx` / `cost-trend.$item.tsx`: days `7|30|90|365`, observations query widened to 730 days; `prevYearAvg` = mean of the daily totals in [start−365, end−365] only when coverage ≥ 50% of days, else null + note.
