import { shiftDate, type Metric, type Obs, type Signal } from "@/lib/signals";
import { WeeklyComparison, type WeekSummary } from "@/components/weekly-comparison";

/** Weekly context for daily/level metrics, not a replacement for their detection rule. */
export function MetricSignalChart({ s, metric, history }: { s: Signal; metric: Metric; history: Obs[] }) {
  const end = s.checks?.data_date ?? s.signal_date;
  const rows = history.filter((o) => o.is_demo === s.is_demo);
  const makeWeek = (label: string, from: string, to: string): WeekSummary => {
    const values = rows.filter((o) => o.observed_on >= from && o.observed_on <= to).map((o) => Number(o.value));
    return { label, value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null, coverage: `มีข้อมูล ${values.length} วันจาก 7 วัน` };
  };
  return <WeeklyComparison weeks={[
    makeWeek("7 วันก่อนหน้า", shiftDate(end, -13), shiftDate(end, -7)),
    makeWeek("7 วันล่าสุด", shiftDate(end, -6), end),
  ]} unit={metric.unit} decimals={metric.decimals} note={`ค่าเฉลี่ยจากวันที่มีข้อมูลจริงเท่านั้น${end !== s.signal_date ? ` · เทียบถึงวันที่ของข้อมูล ${end} (ได้รับ ${s.signal_date})` : ""}`} />;
}