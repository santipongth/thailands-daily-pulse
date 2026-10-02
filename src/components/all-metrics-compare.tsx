// Every tracked metric's real value in this brief vs the previous day — no blank rows.
// A row is always one of: changed / unchanged / cut (arrived after cutoff) / missing (with a concrete reason
// taken from the source's latest fetch run, the release calendar, or the completeness list).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shiftDate, thaiDate } from "@/lib/signals";
import { SOURCES } from "@/lib/sources";
import type { Completeness } from "@/lib/completeness";

const hm = (s: string) => new Date(s).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

type Obs = { metric_id: string; observed_on: string; value: number; received_at: string };
type Run = { source: string; ran_at: string; ok: boolean; error: string | null };
type Release = { family_id: string; title: string; release_date: string };

export function AllMetricsCompare({ date, cutoff, completeness }: { date: string; cutoff: string | null; completeness: Completeness[] | null }) {
  const prev = shiftDate(date, -1);
  const { data } = useQuery({
    queryKey: ["all-metrics", date],
    queryFn: async () => {
      const [{ data: m }, { data: o }, { data: r }, { data: rc }] = await Promise.all([
        supabase.from("metrics").select("id,name_th,unit,decimals,family_id,sort").order("family_id").order("sort"),
        supabase.from("observations").select("metric_id,observed_on,value,received_at").eq("is_demo", false).gte("observed_on", shiftDate(date, -14)).lte("observed_on", date).order("observed_on", { ascending: false }).limit(5000),
        supabase.from("source_runs").select("source,ran_at,ok,error"),
        supabase.from("release_calendar").select("family_id,title,release_date").gte("release_date", date).order("release_date"),
      ]);
      return { metrics: m ?? [], obs: (o ?? []) as Obs[], runs: (r ?? []) as Run[], releases: (rc ?? []) as Release[] };
    },
  });
  if (!data) return null;
  const cut = cutoff ? Date.parse(cutoff) : Infinity;
  const srcOf = (id: string) => SOURCES.find((s) => s.metrics.includes(id))?.source ?? null;
  const reasonOf = (m: any): string => {
    if (m.id === "quake_th") return "ไม่มีแผ่นดินไหวในไทยวันนี้ (ไม่ใช่ข้อมูลขาด)";
    if (m.id.startsWith("lot")) return "ไม่ใช่วันออกสลาก — ออกรางวัลวันที่ 1 และ 16 ของเดือน";
    // Scheduled-release metrics (macro etc.): no daily fetch, they publish on fixed rounds.
    const REL_KW: Record<string, string> = { cpi: "เงินเฟ้อ", gdp: "GDP", unemp: "ว่างงาน" };
    const rel = data.releases.find((x) => x.family_id === m.family_id && (!REL_KW[m.id] || x.title.includes(REL_KW[m.id]))) ?? data.releases.find((x) => x.family_id === m.family_id);
    if (!srcOf(m.id) && rel) return `ประกาศตามรอบ ไม่ได้ดึงรายวัน — รอบถัดไป ${thaiDate(rel.release_date, { day: "numeric", month: "short" })} (${rel.title})`;
    const src = srcOf(m.id);
    const c = completeness?.find((x) => x.source === src);
    const run = src ? data.runs.find((x) => x.source === src) : null;
    if (!src) return rel ? `ประกาศตามรอบ — รอบถัดไป ${thaiDate(rel.release_date, { day: "numeric", month: "short" })}` : "ไม่มีแหล่งข้อมูลผูกไว้";
    if (!run) return `${src}: ยังไม่เคยดึงสำเร็จ — รอรอบดึงถัดไป`;
    if (!run.ok) return `${src}: ดึงล้มเหลวล่าสุด ${hm(run.ran_at)} น.${run.error ? ` — ${run.error}` : ""}`;
    if (c && c.status !== "ok") return `${src}: ${c.reason}`;
    return `${src}: ดึงสำเร็จล่าสุด ${hm(run.ran_at)} น. แต่ยังไม่มีค่าของวันนี้ก่อนเวลาตัด`;
  };
  const fmt = (v: number, d: number) => Number(v).toLocaleString("th-TH", { maximumFractionDigits: d });
  const rows = data.metrics.map((m: any) => {
    const os = data.obs.filter((o) => o.metric_id === m.id);
    const today = os.find((o) => o.observed_on === date);
    const inTime = today && Date.parse(today.received_at) <= cut;
    const before = os.find((o) => o.observed_on <= prev);
    let status: string, cls = "";
    if (!today) { status = `ไม่มีข้อมูล — ${reasonOf(m)}`; cls = "text-muted-foreground"; }
    else if (!inTime) { status = `ตัดออก — ได้รับ ${hm(today.received_at)} น. หลังเวลาตัด จะเข้าฉบับถัดไป`; cls = "text-muted-foreground"; }
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
                <td className="pr-2">{before ? `${fmt(before.value, m.decimals)} ${m.unit}` : "—"}{before && before.observed_on !== prev ? <span className="text-xs text-muted-foreground"> ({before.observed_on})</span> : null}</td>
                <td className="pr-2">{today ? `${fmt(today.value, m.decimals)} ${m.unit}` : "—"}</td>
                <td className={cls}>{status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
