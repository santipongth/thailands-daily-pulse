// Every tracked metric's real value in this brief vs the previous day — no blank rows.
// A row is always one of: changed / unchanged / cut (arrived after cutoff) / missing (with reason).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shiftDate } from "@/lib/signals";
import { SOURCES } from "@/lib/sources";
import type { Completeness } from "@/lib/completeness";

const hm = (s: string) => new Date(s).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

type Obs = { metric_id: string; observed_on: string; value: number; received_at: string };

export function AllMetricsCompare({ date, cutoff, completeness }: { date: string; cutoff: string | null; completeness: Completeness[] | null }) {
  const prev = shiftDate(date, -1);
  const { data } = useQuery({
    queryKey: ["all-metrics", date],
    queryFn: async () => {
      const [{ data: m }, { data: o }] = await Promise.all([
        supabase.from("metrics").select("id,name_th,unit,decimals,family_id,sort").order("family_id").order("sort"),
        supabase.from("observations").select("metric_id,observed_on,value,received_at").eq("is_demo", false).gte("observed_on", shiftDate(date, -14)).lte("observed_on", date).order("observed_on", { ascending: false }).limit(5000),
      ]);
      return { metrics: m ?? [], obs: (o ?? []) as Obs[] };
    },
  });
  if (!data) return null;
  const cut = cutoff ? Date.parse(cutoff) : Infinity;
  const srcOf = (id: string) => SOURCES.find((s) => s.metrics.includes(id))?.source ?? null;
  const reasonOf = (id: string) => {
    const src = srcOf(id);
    const c = completeness?.find((x) => x.source === src);
    if (id === "quake_th") return "ไม่มีแผ่นดินไหวในไทยวันนี้ (ไม่ใช่ข้อมูลขาด)";
    if (id.startsWith("lot")) return "ไม่ใช่วันออกสลาก";
    return c ? `${src}: ${c.status === "ok" ? "ยังไม่มีค่าของวันนี้ก่อนเวลาตัด" : c.reason}` : `${src ?? "ไม่ทราบแหล่ง"}: ยังไม่มีรอบดึงที่สำเร็จก่อนเวลาตัด`;
  };
  const fmt = (v: number, d: number) => Number(v).toLocaleString("th-TH", { maximumFractionDigits: d });
  const rows = data.metrics.map((m: any) => {
    const os = data.obs.filter((o) => o.metric_id === m.id);
    const today = os.find((o) => o.observed_on === date);
    const inTime = today && Date.parse(today.received_at) <= cut;
    const before = os.find((o) => o.observed_on <= prev);
    let status: string, cls = "";
    if (!today) { status = `ไม่มีข้อมูล — ${reasonOf(m.id)}`; cls = "text-muted-foreground"; }
    else if (!inTime) { status = `ตัดออก — ได้รับ ${hm(today.received_at)} น. หลังเวลาตัด`; cls = "text-muted-foreground"; }
    else if (!before) status = "ข้อมูลใหม่ ไม่มีค่าเทียบ";
    else if (Number(before.value) === Number(today.value)) status = "ไม่เปลี่ยน";
    else { const d = Number(today.value) - Number(before.value); status = `เปลี่ยน ${d > 0 ? "+" : ""}${fmt(d, m.decimals)} ${m.unit}`; cls = "font-semibold"; }
    return { m, today, before, status, cls };
  });
  const changed = rows.filter((r) => r.status.startsWith("เปลี่ยน")).length;
  return (
    <section className="mt-10">
      <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">ข้อมูลจริงทุกตัวชี้วัด เทียบวันก่อนหน้า</h2>
      <p className="mt-1 text-sm">ข้อมูลจริงเปลี่ยน {changed} จาก {rows.length} ตัวชี้วัด · ทุกแถวบอกค่า หรือเหตุผลที่ไม่มี/ถูกตัด</p>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead><tr className="text-left"><th>ตัวชี้วัด</th><th>ก่อนหน้า</th><th>วันนี้</th><th>สถานะ</th></tr></thead>
          <tbody>
            {rows.map(({ m, today, before, status, cls }) => (
              <tr key={m.id} className="border-t border-border align-top">
                <td className="py-1 pr-2">{m.name_th}</td>
                <td className="pr-2">{before ? `${fmt(before.value, m.decimals)} ${m.unit}` : "ไม่มีค่า"}{before && before.observed_on !== prev ? <span className="text-xs text-muted-foreground"> ({before.observed_on})</span> : null}</td>
                <td className="pr-2">{today ? `${fmt(today.value, m.decimals)} ${m.unit}` : "ไม่มีค่า"}</td>
                <td className={cls}>{status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
