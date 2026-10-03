import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { blocks, shiftDays, weeklyCalc, type Block } from "@/lib/cost-trend";

export const Route = createFileRoute("/cost-signals/$item")({
  staticData: { sitemap: false },
  head: () => {
    const title = "วิเคราะห์สัญญาณราคาสินค้า รายสัปดาห์/รายเดือน — Thailand Daily Signals";
    const desc = "ดูว่าราคาสินค้าแต่ละตัวเปลี่ยนเกินเกณฑ์เมื่อไร เทียบรายสัปดาห์และรายเดือน และลองตั้งเกณฑ์สัญญาณของคุณเอง";
    return { meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }] };
  },
  component: CostSignals,
});

const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const n2 = (n: number | null) => (n == null ? "—" : n.toLocaleString("th-TH", { maximumFractionDigits: 2 }));
const pc = (n: number | null) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);

function CostSignals() {
  const { item } = Route.useParams();
  const key = `cost-threshold:${item}`;
  const [mine, setMine] = useState<number | null>(null);
  useEffect(() => { const v = localStorage.getItem(key); if (v) setMine(Number(v)); }, [key]);
  const save = (v: number | null) => { setMine(v); if (v == null) localStorage.removeItem(key); else localStorage.setItem(key, String(v)); };

  const { data: all } = useQuery({
    queryKey: ["weekly-metrics"],
    queryFn: async () => (await supabase.from("metrics").select("id,name_th,unit,decimals,threshold_pct,lag_days,expected_days,families(trust)").eq("weekly", true).order("sort")).data ?? [],
  });
  const m: any = all?.find((x) => x.id === item);
  const { data: obs, isLoading } = useQuery({
    queryKey: ["cost-signals-obs", item],
    queryFn: async () => ((await supabase.from("observations").select("observed_on,value").eq("metric_id", item).eq("is_demo", false).gte("observed_on", shiftDays(today(), -190)).order("observed_on")).data ?? []).map((o) => ({ observed_on: o.observed_on, value: Number(o.value) })),
  });
  const d = today();
  const official = m?.threshold_pct ?? null;
  const th = mine ?? official;
  const wm = m ? { id: m.id, threshold_pct: official, lag_days: m.lag_days, expected_days: m.expected_days, trust: m.families?.trust ?? "high" } : null;
  const calcOfficial = wm && obs ? weeklyCalc(obs, wm, d) : null;
  const calcMine = wm && obs && mine != null ? weeklyCalc(obs, wm, d, mine) : null;
  const end = calcOfficial?.priceDate ?? d;
  const weeks = obs ? blocks(obs, end, 7, 12, th) : [];
  const months = obs ? blocks(obs, end, 30, 6, th) : [];

  return (
    <div className="min-h-screen bg-background font-editorial-body"><Masthead /><main className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/cost-trend" className="text-sm underline">← ค่าครองชีพทั้งหมด</Link>
      <h1 className="mt-2 font-editorial text-4xl text-editorial-ink">วิเคราะห์สัญญาณ: {m?.name_th ?? item}</h1>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {all?.map((x: any) => <Link key={x.id} to="/cost-signals/$item" params={{ item: x.id }} className={`border px-2 py-1 ${x.id === item ? "border-editorial-ink bg-editorial-ink text-background" : "border-editorial-rule"}`}>{x.name_th}</Link>)}
      </div>

      <section className="mt-6 border-t-2 border-editorial-ink pt-4">
        <h2 className="font-editorial text-2xl text-editorial-red">เกณฑ์สัญญาณ</h2>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
          <span>เกณฑ์ทางการ: <b>{official ?? "—"}%</b></span>
          <label className="flex items-center gap-2">เกณฑ์ของฉัน
            <input type="range" min={1} max={30} step={0.5} value={th ?? 5} onChange={(e) => save(Number(e.target.value))} aria-label="เกณฑ์ของฉัน (%)" />
            <b className="tabular-nums">{th ?? "—"}%</b>
          </label>
          {mine != null && <button onClick={() => save(null)} className="underline">ใช้เกณฑ์ทางการ</button>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">เกณฑ์ของคุณเก็บไว้ในเครื่องนี้ และใช้เฉพาะหน้านี้ — สัญญาณบนหน้า “วันนี้” ยังใช้เกณฑ์ทางการเหมือนกันทุกคน</p>
        {calcOfficial && <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Verdict title="สัปดาห์นี้ตามเกณฑ์ทางการ" c={calcOfficial} unit={m?.unit} />
          {calcMine && <Verdict title="สัปดาห์นี้ตามเกณฑ์ของฉัน" c={calcMine} unit={m?.unit} />}
        </div>}
      </section>

      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">กำลังโหลด…</p> : <>
        <Chart title="รายสัปดาห์ (12 สัปดาห์ล่าสุด)" rows={weeks} th={th} unit={m?.unit} />
        <Chart title="รายเดือน (ช่วงละ 30 วัน, 6 ช่วงล่าสุด)" rows={months} th={th} unit={m?.unit} />
      </>}
      <p className="mt-6 text-xs text-muted-foreground">ใช้เฉพาะราคาจริงที่ดึงมา ไม่เติมวันที่ไม่มีข้อมูล · ช่วงที่มีข้อมูลน้อยกว่า 3 วันจะไม่คำนวณ % · <Link to="/cost-trend/$item" params={{ item }} className="underline">ดูราคารายวัน →</Link></p>
    </main></div>
  );
}

function Verdict({ title, c, unit }: { title: string; c: ReturnType<typeof weeklyCalc>; unit?: string }) {
  return (
    <div className="border border-editorial-rule p-3">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 font-display text-2xl">{c.severity ? "เกินเกณฑ์" : "ไม่ถึงเกณฑ์"} <span className="text-base tabular-nums">{pc(c.pct)}</span></div>
      <div className="text-xs text-muted-foreground">เฉลี่ย {n2(c.prevAvg)} → {n2(c.curAvg)} {unit} · ราคาวันที่ {c.priceDate ?? "—"} · {c.reason}</div>
    </div>
  );
}

function Chart({ title, rows, th, unit }: { title: string; rows: Block[]; th: number | null; unit?: string }) {
  const data = rows.map((r) => ({ k: r.to.slice(5), pct: r.pct, avg: r.avg, days: r.days, crosses: r.crosses, range: `${r.from} – ${r.to}` }));
  return (
    <section className="mt-8">
      <h2 className="font-editorial text-2xl text-editorial-red">{title}</h2>
      <div className="mt-2 h-60"><ResponsiveContainer><BarChart data={data}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="k" fontSize={11} /><YAxis fontSize={11} unit="%" />
        <Tooltip formatter={(v: number) => `${v?.toFixed?.(1)}%`} labelFormatter={(_l, p) => (p?.[0]?.payload?.range ?? "")} />
        {th != null && <><ReferenceLine y={th} stroke="var(--map-5)" strokeDasharray="4 2" /><ReferenceLine y={-th} stroke="var(--map-5)" strokeDasharray="4 2" /></>}
        <Bar dataKey="pct" name="เปลี่ยนจากช่วงก่อน">{data.map((r, i) => <Cell key={i} fill={r.crosses ? "var(--map-5)" : "var(--map-2)"} />)}</Bar>
      </BarChart></ResponsiveContainer></div>
      <div className="overflow-x-auto"><table className="mt-2 w-full min-w-[560px] text-sm">
        <thead><tr className="border-b border-editorial-ink text-left text-muted-foreground"><th className="py-1">ช่วง</th><th>เฉลี่ย ({unit})</th><th>วันที่มีข้อมูล</th><th>เปลี่ยน</th><th>ผล</th></tr></thead>
        <tbody>{[...rows].reverse().map((r) => <tr key={r.to} className="border-b border-editorial-rule"><td className="py-1 tabular-nums">{r.from} – {r.to}</td><td className="tabular-nums">{n2(r.avg)}</td><td>{r.days}</td><td className="tabular-nums">{pc(r.pct)}</td><td>{r.crosses ? <b className="text-up">เกินเกณฑ์</b> : r.pct == null ? "ข้อมูลไม่พอ" : "—"}</td></tr>)}</tbody>
      </table></div>
    </section>
  );
}
