// /data-all: dam daily charts (all real days) + ThaiWater attempt log with verbatim failure reasons.
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const DAMS = ["cp_dam_q", "dam_pasak_pct", "dam_pasak_out", "dam_khundan_pct"];
const fmt = (v: number, d = 2) => Number(v).toLocaleString("th-TH", { maximumFractionDigits: d });
const hm = (t: string) => new Date(t).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function DamsMonitor() {
  const { data } = useQuery({
    queryKey: ["dams-monitor"],
    queryFn: async () => {
      const [m, o, h] = await Promise.all([
        supabase.from("metrics").select("id,name_th,unit,decimals").in("id", DAMS),
        supabase.from("observations").select("metric_id,observed_on,value,received_at").in("metric_id", DAMS).eq("is_demo", false).order("observed_on"),
        supabase.from("source_run_history").select("source,ran_at,ok,rows,error,run_kind").like("source", "ThaiWater%").order("ran_at", { ascending: false }).limit(10),
      ]);
      return { m: m.data ?? [], o: o.data ?? [], h: h.data ?? [] };
    },
    refetchInterval: 5 * 60e3,
  });
  if (!data) return null;
  const cp = data.o.filter((x) => x.metric_id === "cp_dam_q").at(-1);
  const lastOk = data.h.find((x) => x.ok);
  return (
    <>
      <section className="mt-8">
        <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">เขื่อนรอบกรุงเทพ — กราฟรายวัน (อัปเดตทุกชั่วโมง)</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {DAMS.map((id) => {
            const m = data.m.find((x) => x.id === id);
            if (!m) return null;
            const pts = data.o.filter((x) => x.metric_id === id).map((x) => ({ d: x.observed_on, v: Number(x.value) }));
            const last = pts.at(-1), prev = pts.at(-2);
            const ch = last && prev ? last.v - prev.v : null;
            return (
              <div key={id} className="border border-border p-2">
                <div className="text-sm font-semibold">{m.name_th}</div>
                <div className="text-xs text-muted-foreground">
                  {last ? <>ล่าสุด {fmt(last.v, m.decimals)} {m.unit} ({last.d}) · ก่อนหน้า {prev ? `${fmt(prev.v, m.decimals)} (${prev.d})` : "—"} · {ch === null ? "ค่าแรก" : ch === 0 ? "ไม่เปลี่ยน" : `${ch > 0 ? "+" : ""}${fmt(ch, m.decimals)}`}</> : "ยังไม่มีค่า — ดูเหตุผลในกล่อง ThaiWater ด้านล่าง"}
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pts}>
                      <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} width={50} />
                      <Tooltip formatter={(v) => `${fmt(Number(v), m.decimals)} ${m.unit}`} />
                      <Line type="monotone" dataKey="v" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">ติดตาม ThaiWater (สสน.) — เขื่อนเจ้าพระยา</h2>
        <p className="mt-1 text-sm">
          ค่าล่าสุด: {cp ? <b>{fmt(Number(cp.value), 0)} ลบ.ม./วินาที ({cp.observed_on}, ได้รับ {hm(cp.received_at)})</b> : "ยังไม่มีค่า"}
          {" · "}ดึงสำเร็จล่าสุด: {lastOk ? hm(lastOk.ran_at) : "ไม่สำเร็จใน 10 ครั้งล่าสุด"}
        </p>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="text-left"><th>เวลา</th><th>ผล</th><th>รอบ</th><th>ช่องทาง / เหตุผล</th></tr></thead>
          <tbody>
            {data.h.length ? data.h.map((r) => (
              <tr key={r.ran_at} className="border-t border-border align-top">
                <td className="py-1 pr-2 whitespace-nowrap">{hm(r.ran_at)}</td>
                <td className={r.ok ? "pr-2 font-semibold" : "pr-2 text-destructive"}>{r.ok ? `สำเร็จ ${r.rows} ค่า` : "ไม่สำเร็จ"}</td>
                <td className="pr-2">{r.run_kind}</td>
                <td className="text-xs">{r.ok ? (r.error?.includes("Firecrawl") ? "ผ่าน Firecrawl" : "ดึงตรง") : r.error ?? "ไม่ทราบสาเหตุ (ไม่มีข้อความจากปลายทาง)"}</td>
              </tr>
            )) : <tr><td colSpan={4} className="text-muted-foreground">ยังไม่มีประวัติการดึงใน 30 วัน</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
