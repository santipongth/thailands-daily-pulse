import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Metric, Signal } from "@/lib/signals";
import { fmt } from "@/lib/signals";
import { periodStats, shiftDays } from "@/lib/cost-trend";
import { BASKET } from "@/lib/impact";
import { DIT_ITEMS } from "@/lib/dit";
import { WeeklyComparison } from "@/components/weekly-comparison";

/** Cost-of-living signal: last week vs this week (real prices only) + 14-day daily line with gaps. */
export function CostSignalChart({ s, metric }: { s: Signal; metric: Metric }) {
  const end: string = s.checks?.price_date ?? s.signal_date;
  const { data } = useQuery({
    queryKey: ["cost-signal", s.metric_id, end],
    queryFn: async () => (await supabase.from("observations").select("observed_on,value").eq("metric_id", s.metric_id).eq("is_demo", false)
      .gte("observed_on", shiftDays(end, -13)).lte("observed_on", end).order("observed_on")).data ?? [],
  });
  if (!data?.length) return null;
  const rows = data.map((o) => ({ observed_on: o.observed_on, value: Number(o.value) }));
  const cur = periodStats(rows, shiftDays(end, -6), end), prev = periodStats(rows, shiftDays(end, -13), shiftDays(end, -7));
  const line: { d: string; v: number | null }[] = [];
  for (let d = shiftDays(end, -13); d <= end; d = shiftDays(d, 1)) line.push({ d: d.slice(5), v: rows.find((r) => r.observed_on === d)?.value ?? null });
  const basketId = DIT_ITEMS.find((x) => x.metric === s.metric_id)?.basket ?? s.metric_id;
  // DIT units can differ from the basket (e.g. rice per 15 kg): only per-kg DIT prices map onto basket quantities.
  const qty = s.metric_id.startsWith("dit_") && metric.unit !== "บาท/กก." ? undefined : BASKET.find((b) => b.metric_id === basketId)?.qty;
  const impact = qty != null && cur.avg != null && prev.avg != null ? (cur.avg - prev.avg) * qty : null;
  return <WeeklyComparison weeks={[
    { label: "7 วันก่อนหน้า", value: prev.days >= 3 ? prev.avg : null, coverage: `มีราคา ${prev.days} วันจาก 7 วัน` },
    { label: "7 วันล่าสุด", value: cur.days >= 3 ? cur.avg : null, coverage: `มีราคา ${cur.days} วันจาก 7 วัน` },
  ]} unit={metric.unit} decimals={metric.decimals} note="ราคาเฉลี่ยจากวันที่มีราคาจริงอย่างน้อย 3 วันต่อช่วง ไม่เติมวันที่ขาด">
    <div className="mt-4 border-t border-editorial-rule pt-3">
      <p className="text-xs text-muted-foreground">ราคา 14 วันล่าสุด · ช่องว่างคือวันที่ไม่มีราคา</p>
      <div className="mt-2 h-24"><ResponsiveContainer><LineChart data={line}><XAxis dataKey="d" fontSize={10} interval={3} /><YAxis hide domain={["auto", "auto"]} /><Tooltip /><Line dataKey="v" name="ราคา" stroke="var(--chart-1)" dot={{ r: 1.5 }} connectNulls={false} /></LineChart></ResponsiveContainer></div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {cur.min != null && cur.max != null && `ช่วงต่ำ–สูง ${fmt(cur.min, metric.decimals)}–${fmt(cur.max, metric.decimals)} ${metric.unit}`}
        {impact != null && ` · ผลต่อครัวเรือน ${impact > 0 ? "+" : ""}${impact.toFixed(2)} ฿/วัน`}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"><Link to="/cost-trend/$item" params={{ item: s.metric_id }} className="underline">ดูรายละเอียดสินค้า →</Link><Link to="/cost-signals/$item" params={{ item: s.metric_id }} className="underline">วิเคราะห์สัญญาณ / ตั้งเกณฑ์เอง →</Link></p>
    </div>
  </WeeklyComparison>;
}
