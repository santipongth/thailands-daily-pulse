// /data-all: dam daily charts (all real days) + ThaiWater attempt log with verbatim failure reasons.
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const DAMS = ["cp_dam_q", "dam_pasak_pct", "dam_pasak_out", "dam_khundan_pct"];
const fmt = (v: number, d = 2) => Number(v).toLocaleString("th-TH", { maximumFractionDigits: d });
const hm = (t: string) => new Date(t).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const bkDay = (t: string) => new Date(t).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
const label = (e: string | null) => {
  if (!e) return "ไม่ทราบสาเหตุ (ไม่มีข้อความจากปลายทาง)";
  const fc = /firecrawl/i.test(e);
  if (/429/.test(e)) return fc ? "ถูกจำกัดคำขอ (429) — ปลายทางบล็อกทั้งเซิร์ฟเวอร์และ Firecrawl" : "ถูกจำกัดคำขอ (429) — ปลายทางบล็อกเซิร์ฟเวอร์";
  if (/\b5\d\d\b/.test(e)) return "เซิร์ฟเวอร์ปลายทางขัดข้อง (5xx)";
  if (/timeout|timed out|abort/i.test(e)) return "ปลายทางตอบช้าเกินเวลา (หมดเวลา)";
  return e.slice(0, 120);
};

export function DamsMonitor() {
  const { data } = useQuery({
    queryKey: ["dams-monitor"],
    queryFn: async () => {
      const [m, o, h, r, dd] = await Promise.all([
        supabase.from("metrics").select("id,name_th,unit,decimals").in("id", DAMS),
        supabase.from("observations").select("metric_id,observed_on,value,received_at").in("metric_id", DAMS).eq("is_demo", false).order("observed_on"),
        supabase.from("source_run_history").select("source,ran_at,ok,rows,error,run_kind").like("source", "ThaiWater%").order("ran_at", { ascending: false }).limit(10),
        supabase.from("dam_readings").select("metric_id,value,read_at").gte("read_at", new Date(Date.now() - 48 * 3600e3).toISOString()).order("read_at"),
        supabase.from("source_run_history").select("ran_at,ok,error").like("source", "ThaiWater%").gte("ran_at", new Date(Date.now() - 31 * 864e5).toISOString()).order("ran_at", { ascending: false }).limit(1000),
      ]);
      return { m: m.data ?? [], o: o.data ?? [], h: h.data ?? [], r: r.data ?? [], d: dd.data ?? [] };
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
                {(() => {
                  const raw = data.r.filter((x) => x.metric_id === id);
                  const hp = raw.map((x) => ({ t: hm(x.read_at), v: Number(x.value) }));
                  const lr = raw.at(-1), pr = raw.at(-2);
                  const target = lr ? new Date(lr.read_at).getTime() - 864e5 : 0;
                  const yr = lr ? raw.filter((x) => Math.abs(new Date(x.read_at).getTime() - target) < 90 * 60e3).at(0) : undefined;
                  const diff = (a?: { value: number }, b?: { value: number }) => {
                    if (!a || !b) return null;
                    const d = Number(a.value) - Number(b.value);
                    return d === 0 ? "ไม่เปลี่ยน" : `${d > 0 ? "+" : ""}${fmt(d, m.decimals)}`;
                  };
                  return (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {lr && (
                        <div className="mb-1 text-foreground">
                          รอบล่าสุด {hm(lr.read_at)}: <b>{fmt(Number(lr.value), m.decimals)}</b>
                          {" · "}เทียบรอบก่อน: {pr ? `${diff(lr, pr)} (${hm(pr.read_at)})` : "ยังไม่มีรอบก่อน"}
                          {" · "}เทียบชั่วโมงเดียวกันเมื่อวาน: {yr ? `${diff(lr, yr)} (${hm(yr.read_at)})` : "ยังไม่มีข้อมูลเมื่อวาน"}
                          {" · "}เทียบวันก่อน: {ch === null ? "ยังไม่มีวันก่อน" : ch === 0 ? "ไม่เปลี่ยน" : `${ch > 0 ? "+" : ""}${fmt(ch, m.decimals)}`}
                        </div>
                      )}
                      รายชั่วโมง 48 ชม.: {hp.length ? `${hp.length} รอบ` : "ยังไม่มีรอบที่ได้ค่า"}
                      {hp.length > 0 && (
                        <div className="h-20">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={hp}>
                              <XAxis dataKey="t" hide />
                              <YAxis domain={["auto", "auto"]} hide />
                              <Tooltip formatter={(v) => `${fmt(Number(v), m.decimals)} ${m.unit}`} />
                              <Line type="stepAfter" dataKey="v" stroke="var(--color-muted-foreground)" dot={{ r: 2 }} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
        <div className="overflow-x-auto"><table className="mt-2 min-w-[680px] w-full text-sm">
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
        </table></div>
        <h3 className="mt-4 text-sm font-semibold">สรุปรายวัน 30 วัน (เวลาไทย)</h3>
        <div className="overflow-x-auto"><table className="mt-1 min-w-[760px] w-full text-sm">
          <thead><tr className="text-left"><th>วันที่</th><th>ครั้ง</th><th>สำเร็จ</th><th>ไม่สำเร็จ</th><th>สำเร็จล่าสุด</th><th>เหตุผลที่พบบ่อยสุด</th></tr></thead>
          <tbody>
            {Array.from({ length: 30 }, (_, i) => bkDay(new Date(Date.now() - i * 864e5).toISOString())).map((d) => {
              const rs = data.d.filter((x) => bkDay(x.ran_at) === d);
              if (!rs.length) return <tr key={d} className="border-t border-border"><td className="py-1 pr-2">{d}</td><td colSpan={5} className="text-muted-foreground">ไม่มีรอบดึงวันนี้ (ยังไม่เริ่มเก็บประวัติ หรือไม่มีรอบที่ตั้งไว้)</td></tr>;
              const ok = rs.filter((x) => x.ok), bad = rs.filter((x) => !x.ok);
              const cnt = new Map<string, { n: number; raw: string }>();
              for (const x of bad) { const l = label(x.error); const e = cnt.get(l) ?? { n: 0, raw: x.error ?? "" }; e.n++; cnt.set(l, e); }
              const top = [...cnt.entries()].sort((a, b) => b[1].n - a[1].n)[0];
              return (
                <tr key={d} className="border-t border-border align-top">
                  <td className="py-1 pr-2 whitespace-nowrap">{d}</td><td className="pr-2">{rs.length}</td>
                  <td className="pr-2 font-semibold">{ok.length}</td><td className={bad.length ? "pr-2 text-destructive" : "pr-2"}>{bad.length}</td>
                  <td className="pr-2">{ok[0] ? hm(ok[0].ran_at) : "ไม่สำเร็จเลย"}</td>
                  <td className="text-xs">{top ? <details><summary className="cursor-pointer">{top[0]} ({top[1].n} ครั้ง)</summary><div className="break-all text-muted-foreground">{top[1].raw || "ไม่มีข้อความจากปลายทาง"}</div></details> : "ไม่มีความล้มเหลว"}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </section>
    </>
  );
}
