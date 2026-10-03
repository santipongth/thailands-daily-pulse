import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shiftDate, type Metric, type Signal } from "@/lib/signals";
import { WeeklyComparison, type WeekSummary } from "@/components/weekly-comparison";

/** Weekly context for daily/level metrics, not a replacement for their detection rule. */
export function MetricSignalChart({ s, metric }: { s: Signal; metric: Metric }) {
  const end = s.signal_date;
  const { data, isPending } = useQuery({
    queryKey: ["metric-signal-weekly", s.metric_id, end, s.is_demo],
    queryFn: async () => {
      const { data, error } = await supabase.from("observations").select("observed_on,value")
        .eq("metric_id", s.metric_id).eq("is_demo", s.is_demo)
        .gte("observed_on", shiftDate(end, -13)).lte("observed_on", end).order("observed_on");
      if (error) throw error;
      return data ?? [];
    },
  });
  if (isPending) return <div className="mt-5 border-t border-editorial-rule pt-4 text-xs text-muted-foreground">กำลังโหลดข้อมูลเปรียบเทียบรายสัปดาห์…</div>;
  const rows = data ?? [];
  const makeWeek = (label: string, from: string, to: string): WeekSummary => {
    const values = rows.filter((o) => o.observed_on >= from && o.observed_on <= to).map((o) => Number(o.value));
    return { label, value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null, coverage: `มีข้อมูล ${values.length} วันจาก 7 วัน` };
  };
  return <WeeklyComparison weeks={[
    makeWeek("7 วันก่อนหน้า", shiftDate(end, -13), shiftDate(end, -7)),
    makeWeek("7 วันล่าสุด", shiftDate(end, -6), end),
  ]} unit={metric.unit} decimals={metric.decimals} note="ค่าเฉลี่ยจากวันที่มีข้อมูลจริงเท่านั้น" />;
}