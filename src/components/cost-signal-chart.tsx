import { Link } from "@tanstack/react-router";
import type { Metric, Obs, Signal } from "@/lib/signals";
import { fmt } from "@/lib/signals";
import { periodStats, shiftDays } from "@/lib/cost-trend";
import { BASKET } from "@/lib/impact";
import { DIT_ITEMS } from "@/lib/dit";
import { WeeklyComparison } from "@/components/weekly-comparison";

/** Cost-of-living signal: last week vs this week (real prices only) + 14-day daily line with gaps. */
export function CostSignalChart({ s, metric, history }: { s: Signal; metric: Metric; history: Obs[] }) {
  const end: string = s.checks?.price_date ?? s.signal_date;
  const rows = history.filter((o) => o.metric_id === s.metric_id && o.is_demo === s.is_demo && o.observed_on >= shiftDays(end, -13) && o.observed_on <= end).map((o) => ({ observed_on: o.observed_on, value: Number(o.value), received_at: o.received_at, effective_from: o.effective_from ?? null }));
  const arrivals = (from: string, to: string) => rows.filter((r) => r.observed_on >= from && r.observed_on <= to).map((r) => ({ date: r.observed_on, effective: r.effective_from, received: r.received_at }));
  const cur = periodStats(rows, shiftDays(end, -6), end), prev = periodStats(rows, shiftDays(end, -13), shiftDays(end, -7));
  const line: { d: string; v: number | null }[] = [];
  for (let d = shiftDays(end, -13); d <= end; d = shiftDays(d, 1)) line.push({ d: d.slice(5), v: rows.find((r) => r.observed_on === d)?.value ?? null });
  const present = line.flatMap((r) => r.v == null ? [] : [r.v]);
  const min = Math.min(...present), span = Math.max(...present) - min || 1;
  const basketId = DIT_ITEMS.find((x) => x.metric === s.metric_id)?.basket ?? s.metric_id;
  // DIT units can differ from the basket (e.g. rice per 15 kg): only per-kg DIT prices map onto basket quantities.
  const qty = s.metric_id.startsWith("dit_") && metric.unit !== "บาท/กก." ? undefined : BASKET.find((b) => b.metric_id === basketId)?.qty;
  const impact = qty != null && cur.avg != null && prev.avg != null ? (cur.avg - prev.avg) * qty : null;
  return <WeeklyComparison weeks={[
    { label: "7 วันก่อนหน้า", value: prev.days >= 3 ? prev.avg : null, coverage: `มีราคา ${prev.days} วันจาก 7 วัน`, arrivals: arrivals(shiftDays(end, -13), shiftDays(end, -7)) },
    { label: "7 วันล่าสุด", value: cur.days >= 3 ? cur.avg : null, coverage: `มีราคา ${cur.days} วันจาก 7 วัน`, arrivals: arrivals(shiftDays(end, -6), end) },
  ]} unit={metric.unit} decimals={metric.decimals} note={`ราคาเฉลี่ยจากวันที่มีราคาจริงอย่างน้อย 3 วันต่อช่วง ไม่เติมวันที่ขาด${end !== s.signal_date ? ` · เทียบถึงวันที่ของราคา ${end} (ได้รับ ${s.signal_date})` : ""}`}>
    <div className="mt-4 border-t border-editorial-rule pt-3">
      <p className="text-xs text-muted-foreground">ราคา 14 วันล่าสุด · ช่องว่างคือวันที่ไม่มีราคา</p>
      <svg viewBox="0 0 260 76" preserveAspectRatio="none" className="mt-2 h-24 w-full border-b border-editorial-rule text-chart-1" role="img" aria-label="ราคาย้อนหลัง 14 วัน เส้นขาดเมื่อไม่มีราคา">
        {line.slice(1).map((r, i) => r.v != null && line[i]?.v != null ? <line key={i} x1={i * 20 + 1} x2={(i + 1) * 20 + 1} y1={68 - ((line[i]?.v ?? min) - min) / span * 58} y2={68 - (r.v - min) / span * 58} stroke="currentColor" strokeWidth="1.5" /> : null)}
        {line.map((r, i) => r.v == null ? null : <circle key={i} cx={i * 20 + 1} cy={68 - (r.v - min) / span * 58} r="2" fill="currentColor" />)}
      </svg>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {cur.min != null && cur.max != null && `ช่วงต่ำ–สูง ${fmt(cur.min, metric.decimals)}–${fmt(cur.max, metric.decimals)} ${metric.unit}`}
        {impact != null && ` · ผลต่อครัวเรือน ${impact > 0 ? "+" : ""}${impact.toFixed(2)} ฿/วัน`}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"><Link to="/cost-trend/$item" params={{ item: s.metric_id }} className="underline">ดูรายละเอียดสินค้า →</Link></p>
    </div>
  </WeeklyComparison>;
}
