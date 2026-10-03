// /data-all: FM91 posts per Bangkok day (count of Bangkok-related traffic reports, not an official index).
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const bkDay = (t: string) => new Date(t).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
const hm = (t: string) => new Date(t).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function SocialDaily() {
  const { data } = useQuery({
    queryKey: ["social-daily"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("social_posts").select("posted_at,area,is_bkk").order("posted_at").limit(5000),
        supabase.from("source_run_history").select("ran_at,ok,error").like("source", "FM91%").order("ran_at", { ascending: false }).limit(1),
      ]);
      return { p: p.data ?? [], r: r.data?.[0] };
    },
    refetchInterval: 5 * 60e3,
  });
  if (!data) return null;
  const days = new Map<string, { n: number; areas: Map<string, number> }>();
  for (const x of data.p) {
    if (!x.is_bkk) continue;
    const d = bkDay(x.posted_at);
    const e = days.get(d) ?? { n: 0, areas: new Map() };
    e.n++;
    if (x.area) e.areas.set(x.area, (e.areas.get(x.area) ?? 0) + 1);
    days.set(d, e);
  }
  const pts = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, e]) => ({
    d, v: e.n, top: [...e.areas.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
  }));
  const today = bkDay(new Date().toISOString());
  const last = pts.find((x) => x.d === today);
  const prev = pts.filter((x) => x.d < today).at(-1);
  const ch = last && prev ? last.v - prev.v : null;
  const yday = bkDay(new Date(Date.now() - 864e5).toISOString());
  const hourOf = (t: string) => Number(new Date(t).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false })) % 24;
  const hours = Array.from({ length: 24 }, (_, h) => ({ h: `${String(h).padStart(2, "0")}:00`, today: 0, yday: 0 }));
  for (const x of data.p) {
    if (!x.is_bkk) continue;
    const d = bkDay(x.posted_at);
    if (d === today) hours[hourOf(x.posted_at)]!.today++;
    else if (d === yday) hours[hourOf(x.posted_at)]!.yday++;
  }
  const hasY = hours.some((x) => x.yday > 0);
  const peak = (k: "today" | "yday") => hours.reduce((a, b) => (b[k] > a[k] ? b : a));
  return (
    <section className="mt-8">
      <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">จราจรจาก FM91 — รายวัน</h2>
      <p className="mt-1 text-xs text-muted-foreground">นับจำนวนโพสต์รายงานจราจรที่ AI ระบุว่าเกี่ยวกับกรุงเทพฯ/ปริมณฑล ไม่ใช่ดัชนีจราจรทางการ (ดัชนีทางการดูแถว Longdo)</p>
      <p className="mt-2 text-sm">
        วันนี้ <b>{last ? `${last.v} โพสต์` : "ยังไม่มีโพสต์"}</b> · วันก่อนหน้า {prev ? `${prev.v} โพสต์ (${prev.d})` : "— ยังไม่มีข้อมูลวันก่อนหน้า"}
        {ch !== null && <> · {ch === 0 ? "เท่าเดิม" : `${ch > 0 ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(ch)} โพสต์`}</>}
        {!last && data.r && <> · ดึงล่าสุด {hm(data.r.ran_at)} {data.r.ok ? "สำเร็จ แต่ยังไม่มีโพสต์เกี่ยวกับกรุงเทพฯ วันนี้" : `ไม่สำเร็จ: ${data.r.error ?? "ไม่ทราบสาเหตุ"}`}</>}
      </p>
      <h3 className="mt-4 text-sm font-semibold">รายชั่วโมงวันนี้ เทียบชั่วโมงเดียวกันเมื่อวาน (เวลาไทย)</h3>
      <p className="text-xs text-muted-foreground">
        ชั่วโมงที่โพสต์มากสุดวันนี้: {peak("today").today ? `${peak("today").h} (${peak("today").today} โพสต์)` : "ยังไม่มี"}
        {" · "}เมื่อวาน: {hasY ? `${peak("yday").h} (${peak("yday").yday} โพสต์)` : "ยังไม่มีข้อมูลเมื่อวานให้เทียบ"}
      </p>
      <div className="mt-1 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={hours}>
            <XAxis dataKey="h" tick={{ fontSize: 9 }} interval={2} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="today" name="วันนี้" fill="var(--color-primary)" isAnimationActive={false} />
            <Line dataKey="yday" name="เมื่อวาน" stroke="var(--color-up)" strokeDasharray="4 3" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {pts.length > 0 && (
        <>
          <div className="mt-2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pts}>
                <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} />
                <Tooltip formatter={(v) => `${v} โพสต์`} />
                <Bar dataKey="v" fill="var(--color-primary)" maxBarSize={48} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="mt-2 w-full text-sm">
            <thead><tr className="text-left"><th>วันที่</th><th>โพสต์</th><th>พื้นที่ที่ถูกพูดถึงบ่อยสุด</th></tr></thead>
            <tbody>{[...pts].reverse().map((x) => (
              <tr key={x.d} className="border-t border-border"><td className="py-1">{x.d}</td><td>{x.v}</td><td>{x.top}</td></tr>
            ))}</tbody>
          </table>
        </>
      )}
    </section>
  );
}
