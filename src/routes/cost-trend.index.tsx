import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { BASKET } from "@/lib/impact";
import { costTrend, GROUP_TH } from "@/lib/cost-trend";

export const Route = createFileRoute("/cost-trend/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "แนวโน้มค่าครองชีพครัวเรือน 7/30 วัน — Thailand Daily Signals" },
      { name: "description", content: "ตะกร้าค่าใช้จ่ายครัวเรือนไทยต่อวันจากราคาจริง เปลี่ยนสุทธิกี่บาทในรอบ 7 และ 30 วัน พร้อมกราฟแยกน้ำมันและอาหาร" },
      { property: "og:title", content: "แนวโน้มค่าครองชีพครัวเรือน — Thailand Daily Signals" },
      { property: "og:description", content: "ค่าใช้จ่ายตะกร้าครัวเรือนเปลี่ยนไปกี่บาทในรอบ 30 วัน จากราคาจริง" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CostTrend,
});

const b2 = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sign = (n: number) => (n > 0.005 ? `+${b2(n)}` : n < -0.005 ? `−${b2(-n)}` : "0.00");
const bkkToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

function CostTrend() {
  const [days, setDays] = useState<7 | 30 | 90 | 365>(30);
  const end = bkkToday();
  const { data: obs, isLoading } = useQuery({
    queryKey: ["cost-trend-obs"],
    queryFn: async () => {
      const out: { metric_id: string; observed_on: string; value: number }[] = [];
      const since = new Date(Date.parse(end) - 760 * 86400e3).toISOString().slice(0, 10);
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("observations").select("metric_id,observed_on,value")
          .in("metric_id", BASKET.map((b) => b.metric_id)).eq("is_demo", false).lte("observed_on", end).gte("observed_on", since)
          .order("observed_on", { ascending: false }).range(from, from + 999);
        if (error) throw error;
        out.push(...(data ?? [])); if ((data ?? []).length < 1000) break;
      }
      return out;
    },
  });
  const r = obs ? costTrend(obs, end, days) : null;
  // Last year's same window: average of complete days, only if at least half the days are complete. Never estimated.
  const prevEnd = new Date(Date.parse(end) - 365 * 86400e3).toISOString().slice(0, 10);
  const py = obs ? costTrend(obs, prevEnd, days).series.filter((d) => d.complete) : [];
  const prevYearAvg = py.length >= days * 0.5 ? py.reduce((a, d) => a + d.total, 0) / py.length : null;
  const done = r?.series.filter((d) => d.complete) ?? [];
  const spanAvg = done.length ? done.reduce((a, d) => a + d.total, 0) / done.length : null;
  const first = r?.series.find((d) => d.complete) ?? r?.series[0];
  const last = r?.series[r.series.length - 1];
  // Incomplete days (some basket prices not yet collected) are left blank instead of drawn as a low/zero total.
  const chart = r?.series.map((d) => ({ ...d, label: d.date.slice(5), total: d.complete ? d.total : null, fuel: d.complete ? d.fuel : null, food: d.complete ? d.food : null, gas: d.complete ? d.gas : null, power: d.complete ? d.power : null })) ?? [];
  return (
    <div className="min-h-screen bg-background font-editorial-body">
      <Masthead />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-editorial text-4xl text-editorial-ink">แนวโน้มค่าครองชีพครัวเรือน</h1>
        <p className="mt-1 text-sm"><Link to="/cost-signals/$item" params={{ item: "dit_pork" }} className="underline">วิเคราะห์สัญญาณรายสินค้า (ตั้งเกณฑ์เอง) →</Link> · <Link to="/cost-trend/$item" params={{ item: "elec_unit" }} className="underline">ค่าไฟฟ้า →</Link></p>
        <p className="mt-2 text-sm text-muted-foreground">ตะกร้าครัวเรือนเดียวกับฉบับเช้า × ราคาจริงแต่ละวัน — ไม่มีการเดาค่า</p>
        <div className="mt-4 flex gap-2">
          {([7, 30, 90, 365] as const).map((n) => (
            <button key={n} onClick={() => setDays(n)} className={`border px-3 py-1 text-sm ${days === n ? "border-editorial-ink font-semibold" : "border-editorial-rule"}`}>{n === 365 ? "1 ปี" : `${n} วัน`}</button>
          ))}
        </div>
        {isLoading || !r ? <p className="mt-6 text-sm text-muted-foreground">กำลังคำนวณ…</p> : <>
          <section className="mt-6 grid gap-4 border-y-2 border-editorial-ink py-4 sm:grid-cols-3">
            <div><div className="text-xs text-muted-foreground">ต่อวัน ({first?.date})</div><div className="font-editorial text-2xl tabular-nums">{b2(first?.total ?? 0)} ฿</div></div>
            <div><div className="text-xs text-muted-foreground">ต่อวัน ({last?.date})</div><div className="font-editorial text-2xl tabular-nums">{b2(last?.total ?? 0)} ฿</div></div>
            <div><div className="text-xs text-muted-foreground">เปลี่ยนสุทธิ</div><div className={`font-editorial text-2xl tabular-nums ${r.netDay > 0.005 ? "text-destructive" : r.netDay < -0.005 ? "text-primary" : ""}`}>{sign(r.netDay)} ฿/วัน</div><div className="text-xs text-muted-foreground">≈ {sign(r.netMonth)} ฿/เดือน</div></div>
          </section>
          <h2 className="mt-8 font-editorial text-2xl text-editorial-red">ค่าใช้จ่ายตะกร้ารวมต่อวัน</h2>
          <div className="mt-2 h-64"><ResponsiveContainer><LineChart data={chart}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} domain={["auto", "auto"]} /><Tooltip formatter={(v: number) => `${b2(v)} ฿`} /><Line dataKey="total" name="รวม" stroke="var(--editorial-ink, currentColor)" dot={false} strokeWidth={2} />
            {prevYearAvg != null && <ReferenceLine y={prevYearAvg} stroke="var(--map-4)" strokeDasharray="6 4" label={{ value: `เฉลี่ยปีก่อน ${b2(prevYearAvg)}`, fontSize: 10, position: "insideTopRight" }} />}
            {prevYearAvg == null && days === 365 && spanAvg != null && <ReferenceLine y={spanAvg} stroke="var(--map-2)" strokeDasharray="2 3" label={{ value: `เฉลี่ยทั้งช่วงที่มีข้อมูล ${b2(spanAvg)}`, fontSize: 10, position: "insideBottomRight" }} />}
          </LineChart></ResponsiveContainer></div>
          <p className="mt-1 text-xs text-muted-foreground">{prevYearAvg != null ? `เส้นประ = ค่าเฉลี่ยช่วงเดียวกันของปีก่อน ${b2(prevYearAvg)} ฿/วัน` : "ยังไม่มีข้อมูลปีก่อนหน้า — เส้นเปรียบเทียบจะแสดงเองเมื่อมีราคาจริงครบช่วง"}</p>
          <h2 className="mt-8 font-editorial text-2xl text-editorial-red">แยกตามกลุ่ม</h2>
          <div className="mt-2 h-64"><ResponsiveContainer><LineChart data={chart}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} domain={["auto", "auto"]} /><Tooltip formatter={(v: number) => `${b2(v)} ฿`} /><Legend />
            <Line dataKey="fuel" name={GROUP_TH.fuel} stroke="var(--map-4)" dot={false} />
            <Line dataKey="food" name={GROUP_TH.food} stroke="var(--map-2)" dot={false} />
            {chart.some((d) => (d.power ?? 0) > 0) && <Line dataKey="power" name={GROUP_TH.power} stroke="var(--map-1)" dot={false} />}
            {chart.some((d) => (d.gas ?? 0) > 0) && <Line dataKey="gas" name={GROUP_TH.gas} stroke="var(--map-5)" dot={false} />}
          </LineChart></ResponsiveContainer></div>
          <h2 className="mt-8 font-editorial text-2xl text-editorial-red">รายการที่เปลี่ยนมากที่สุด</h2>
          <div className="overflow-x-auto"><table className="mt-2 w-full min-w-[520px] text-sm">
            <thead><tr className="border-b border-editorial-ink text-left text-muted-foreground"><th className="py-2">รายการ</th><th>ราคาเริ่ม ({r.start})</th><th>ราคาล่าสุด</th><th>ผลต่อวัน</th></tr></thead>
            <tbody>{r.items.map((i) => (
              <tr key={i.metric_id} className="border-b border-editorial-rule"><td className="py-2 font-medium"><Link to="/cost-trend/$item" params={{ item: i.metric_id }} className="underline">{i.label}</Link></td>
                <td className="tabular-nums">{i.start == null ? <span className="text-xs text-muted-foreground">ข้อมูลไม่ครบช่วง</span> : b2(i.start)}</td>
                <td className="tabular-nums">{i.end == null ? "—" : b2(i.end)}</td>
                <td className="tabular-nums">{i.deltaDay == null ? "—" : `${sign(i.deltaDay)} ฿`}</td></tr>
            ))}</tbody>
          </table></div>
          <p className="mt-5 border-t border-editorial-rule pt-3 text-xs leading-relaxed text-muted-foreground">วันที่ไม่มีราคาใหม่ใช้ราคาล่าสุดที่รู้ก่อนหน้า · รายการที่ไม่มีราคาตั้งแต่ต้นช่วงไม่นับในยอดเปลี่ยนสุทธิ{r.partial ? " (ช่วงนี้มีบางรายการข้อมูลไม่ครบ)" : ""} · ต่อเดือน = × 30</p>
        </>}
      </main>
    </div>
  );
}
