import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shiftDays, weeklyCalc, type WeeklyMetric } from "@/lib/cost-trend";

const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const n2 = (n: number | null) => (n == null ? "—" : n.toLocaleString("th-TH", { maximumFractionDigits: 2 }));
const SEV: Record<string, string> = { high: "สำคัญมาก", medium: "น่าจับตา", low: "เล็กน้อย" };

/** Step-by-step weekly cost-of-living signal calculation (same rule as detect_core), shown in the fetch log. */
export function CostSignalCalc() {
  const d = today();
  const { data, isLoading } = useQuery({
    queryKey: ["cost-signal-calc", d],
    queryFn: async () => {
      const { data: mets } = await supabase.from("metrics").select("id,name_th,unit,threshold_pct,lag_days,expected_days,families(trust)").eq("weekly", true).order("sort");
      const ids = (mets ?? []).map((m) => m.id);
      const [{ data: obs }, { data: sig }] = await Promise.all([
        supabase.from("observations").select("metric_id,observed_on,value,received_at").in("metric_id", ids).eq("is_demo", false).gte("observed_on", shiftDays(d, -25)),
        supabase.from("signals").select("metric_id,severity,checks").in("metric_id", ids).eq("signal_date", d),
      ]);
      return { mets: mets ?? [], obs: obs ?? [], sig: sig ?? [] };
    },
  });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">กำลังคำนวณ…</p>;
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        กฎรายสัปดาห์: ใช้ราคาจริงล่าสุดที่ไม่เก่ากว่า “ช่วงส่งช้า” ของแหล่งนั้น (คำนวณทุกคืนจากเวลาที่ข้อมูลเข้ามาจริง) · เฉลี่ย 7 วันล่าสุด เทียบ 7 วันก่อน (อย่างน้อย 3 วันต่อสัปดาห์ ไม่เติมค่า) ·
        เกณฑ์จริง = เกณฑ์ × ความน่าเชื่อถือ (ปานกลาง ×1.5) × ความครบของข้อมูล √(วันที่ควรมี ÷ วันที่มีจริง)
      </p>
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
        <thead><tr className="border-b border-editorial-ink text-left text-muted-foreground">
          <th className="py-2">สินค้า</th><th>ส่งช้าได้</th><th>ราคาวันที่ / เข้ามาเมื่อ</th><th>เฉลี่ยก่อน → นี้</th><th>วัน (ก่อน/นี้)</th><th>เปลี่ยน</th><th>เกณฑ์ → เกณฑ์จริง</th><th>ผล</th><th>บันทึกวันนี้</th>
        </tr></thead>
        <tbody>{data.mets.map((m: any) => {
          const rows = data.obs.filter((o) => o.metric_id === m.id).map((o) => ({ observed_on: o.observed_on, value: Number(o.value), received_at: o.received_at }));
          const wm: WeeklyMetric = { id: m.id, threshold_pct: m.threshold_pct, lag_days: m.lag_days, expected_days: m.expected_days, trust: m.families?.trust ?? "high" };
          const c = weeklyCalc(rows, wm, d);
          const got = rows.find((r) => r.observed_on === c.priceDate)?.received_at;
          const stored = data.sig.find((s) => s.metric_id === m.id);
          return (
            <tr key={m.id} className="border-b border-editorial-rule align-top">
              <td className="py-2"><Link to="/cost-signals/$item" params={{ item: m.id }} className="underline">{m.name_th}</Link><div className="text-[11px] text-muted-foreground">{m.unit}</div></td>
              <td>{c.lagDays} วัน</td>
              <td className="tabular-nums">{c.priceDate ?? "—"}{got && <div className="text-[11px] text-muted-foreground">{new Date(got).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}</div>}</td>
              <td className="tabular-nums">{n2(c.prevAvg)} → {n2(c.curAvg)}</td>
              <td>{c.daysPrev}/{c.daysCur} <span className="text-muted-foreground">(ควรมี {m.expected_days})</span></td>
              <td className="tabular-nums">{c.pct == null ? "—" : `${c.pct > 0 ? "+" : ""}${c.pct.toFixed(1)}%`}</td>
              <td className="tabular-nums">{m.threshold_pct ?? "—"}% {c.effective != null && <>→ <b>{c.effective.toFixed(2)}%</b><div className="text-[11px] text-muted-foreground">×{c.trustMul} ×{c.coverage.toFixed(2)}</div></>}</td>
              <td>{c.severity ? <b className="text-up">{SEV[c.severity]}</b> : "ไม่ถึงเกณฑ์"}<div className="text-[11px] text-muted-foreground">{c.reason}</div></td>
              <td>{stored ? `${SEV[stored.severity] ?? stored.severity} (${(stored.checks as any)?.rule ?? "—"})` : "—"}</td>
            </tr>
          );
        })}</tbody>
      </table></div>
      <p className="mt-2 text-xs text-muted-foreground">“บันทึกวันนี้” = สัญญาณที่ระบบบันทึกไว้จริงตอนตรวจรอบล่าสุด (อาจต่างจากการคำนวณสดถ้ามีราคาใหม่เข้ามาหลังรอบนั้น)</p>
    </div>
  );
}
