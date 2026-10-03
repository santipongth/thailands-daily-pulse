import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Metric, Signal } from "@/lib/signals";
import { fmt } from "@/lib/signals";
import { periodStats, shiftDays } from "@/lib/cost-trend";
import { BASKET } from "@/lib/impact";
import { DIT_ITEMS } from "@/lib/dit";

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
  const bars = [{ k: "สัปดาห์ก่อน", avg: prev.avg }, { k: "สัปดาห์นี้", avg: cur.avg }];
  const line: { d: string; v: number | null }[] = [];
  for (let d = shiftDays(end, -13); d <= end; d = shiftDays(d, 1)) line.push({ d: d.slice(5), v: rows.find((r) => r.observed_on === d)?.value ?? null });
  const basketId = DIT_ITEMS.find((x) => x.metric === s.metric_id)?.basket ?? s.metric_id;
  // DIT units can differ from the basket (e.g. rice per 15 kg): only per-kg DIT prices map onto basket quantities.
  const qty = s.metric_id.startsWith("dit_") && metric.unit !== "บาท/กก." ? undefined : BASKET.find((b) => b.metric_id === basketId)?.qty;
  const impact = qty != null && cur.avg != null && prev.avg != null ? (cur.avg - prev.avg) * qty : null;
  return (
    <div className="mt-3 border-t border-editorial-rule pt-2 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div className="h-24"><ResponsiveContainer><BarChart data={bars}><XAxis dataKey="k" fontSize={10} /><YAxis hide domain={[0, "auto"]} /><Tooltip formatter={(v: number) => fmt(v, metric.decimals)} /><Bar dataKey="avg" name="เฉลี่ย" fill="var(--map-2)" /></BarChart></ResponsiveContainer></div>
        <div className="h-24"><ResponsiveContainer><LineChart data={line}><XAxis dataKey="d" fontSize={9} interval={3} /><YAxis hide domain={["auto", "auto"]} /><Tooltip /><Line dataKey="v" name="ราคา" stroke="var(--map-4)" dot={{ r: 1.5 }} connectNulls={false} /></LineChart></ResponsiveContainer></div>
      </div>
      <p className="mt-1 text-muted-foreground">
        เฉลี่ย {fmt(prev.avg ?? 0, metric.decimals)} → {fmt(cur.avg ?? 0, metric.decimals)} {metric.unit} (ต่ำ–สูง {fmt(cur.min ?? 0, metric.decimals)}–{fmt(cur.max ?? 0, metric.decimals)}; มีราคา {prev.days}/{cur.days} วัน)
        {impact != null && ` · ผลต่อครัวเรือน ${impact > 0 ? "+" : ""}${impact.toFixed(2)} ฿/วัน`}
        {" · "}<Link to="/cost-trend/$item" params={{ item: s.metric_id }} className="underline">ดูรายละเอียดสินค้า →</Link>
        {" · "}<Link to="/cost-signals/$item" params={{ item: s.metric_id }} className="underline">วิเคราะห์สัญญาณ / ตั้งเกณฑ์เอง →</Link>
      </p>
    </div>
  );
}
