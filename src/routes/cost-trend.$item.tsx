import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { BASKET } from "@/lib/impact";
import { DIT_ITEMS } from "@/lib/dit";
import { pctChange, periodStats, shiftDays, type PeriodStats } from "@/lib/cost-trend";

export const Route = createFileRoute("/cost-trend/$item")({
  staticData: { sitemap: false },
  head: ({ params }) => {
    const label = BASKET.find((b) => b.metric_id === params.item)?.label ?? DIT_ITEMS.find((d) => d.metric === params.item)?.label ?? params.item;
    const title = `ราคา${label} รายสัปดาห์/รายเดือน — Thailand Daily Signals`;
    const desc = `ราคาจริงของ${label}ในกรุงเทพฯ เทียบสัปดาห์นี้กับสัปดาห์ก่อน และเดือนนี้กับเดือนก่อน จากแหล่งที่ดึงมาจริง`;
    return { meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }] };
  },
  component: Item,
});

const b2 = (n: number | null) => (n == null ? "—" : n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const pct = (n: number | null) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

function Item() {
  const { item } = Route.useParams();
  const dit = DIT_ITEMS.find((d) => d.metric === item || d.basket === item);
  const basket = BASKET.find((b) => b.metric_id === item || b.metric_id === dit?.basket);
  const ids = [basket?.metric_id, dit?.metric].filter(Boolean) as string[];
  const { data, isLoading } = useQuery({
    queryKey: ["cost-item", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const [{ data: obs }, { data: mets }] = await Promise.all([
        supabase.from("observations").select("metric_id,observed_on,value,received_at").in("metric_id", ids).eq("is_demo", false).gte("observed_on", shiftDays(today(), -75)).order("observed_on"),
        supabase.from("metrics").select("id,name_th,unit").in("id", ids),
      ]);
      return { obs: obs ?? [], mets: mets ?? [] };
    },
  });
  if (!ids.length) return <Shell><p className="mt-6">ไม่พบสินค้านี้ · <Link to="/cost-trend" className="underline">กลับหน้าค่าครองชีพ</Link></p></Shell>;
  const end = today();
  const ranges = [
    { label: "สัปดาห์นี้ vs สัปดาห์ก่อน", cur: [shiftDays(end, -6), end], prev: [shiftDays(end, -13), shiftDays(end, -7)] },
    { label: "30 วันนี้ vs 30 วันก่อน", cur: [shiftDays(end, -29), end], prev: [shiftDays(end, -59), shiftDays(end, -30)] },
  ] as const;
  const srcName = (id: string) => (id.startsWith("dit_") ? "กรมการค้าภายใน (ราคาขายปลีก กทม.)" : "CheckRaka (รวบรวมหลายแหล่ง)");
  const dates = [...new Set((data?.obs ?? []).map((o) => o.observed_on))].sort();
  const chart = dates.map((d) => Object.fromEntries([["date", d.slice(5)], ...ids.map((id) => [id, data!.obs.find((o) => o.metric_id === id && o.observed_on === d)?.value ?? null])]));
  return (
    <Shell>
      <Link to="/cost-trend" className="text-sm underline">← ค่าครองชีพทั้งหมด</Link>
      <h1 className="mt-2 font-editorial text-4xl text-editorial-ink">{basket?.label ?? dit?.label}</h1>
      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">กำลังโหลด…</p> : ids.map((id) => {
        const rows = data!.obs.filter((o) => o.metric_id === id);
        const m = data!.mets.find((x) => x.id === id);
        const last = rows.at(-1);
        const impact = basket && id === basket.metric_id ? basket : null;
        return (
          <section key={id} className="mt-8 border-t-2 border-editorial-ink pt-4">
            <h2 className="font-editorial text-2xl text-editorial-red">{srcName(id)}</h2>
            <p className="mt-1 text-sm">{m?.name_th} · ล่าสุด <b className="tabular-nums">{b2(last ? Number(last.value) : null)}</b> {m?.unit} {last && <span className="text-muted-foreground">(ราคาวันที่ {last.observed_on})</span>}</p>
            {!rows.length && <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีข้อมูลจริงในช่วงนี้</p>}
            <div className="overflow-x-auto"><table className="mt-3 w-full min-w-[640px] text-sm">
              <thead><tr className="border-b border-editorial-ink text-left text-muted-foreground"><th className="py-2">ช่วง</th><th>เฉลี่ย ปัจจุบัน</th><th>เฉลี่ย ก่อนหน้า</th><th>เปลี่ยน</th><th>ต่ำ–สูง (ปัจจุบัน)</th><th>วันที่มีข้อมูล</th>{impact && <th>ผลต่อครัวเรือน</th>}</tr></thead>
              <tbody>{ranges.map((r) => {
                const c: PeriodStats = periodStats(rows, r.cur[0], r.cur[1]); const p = periodStats(rows, r.prev[0], r.prev[1]);
                const ch = pctChange(c.avg, p.avg);
                return <tr key={r.label} className="border-b border-editorial-rule"><td className="py-2 font-medium">{r.label}</td><td className="tabular-nums">{b2(c.avg)}</td><td className="tabular-nums">{b2(p.avg)}</td>
                  <td className={`tabular-nums ${ch != null && ch > 0.05 ? "text-destructive" : ch != null && ch < -0.05 ? "text-primary" : ""}`}>{pct(ch)}</td>
                  <td className="tabular-nums">{c.min == null ? "—" : `${b2(c.min)}–${b2(c.max)}`}</td><td>{c.days} / {p.days}</td>
                  {impact && <td className="tabular-nums">{c.avg == null || p.avg == null ? "—" : `${b2((c.avg - p.avg) * impact.qty)} ฿/วัน`}</td>}</tr>;
              })}</tbody>
            </table></div>
          </section>
        );
      })}
      {chart.length > 0 && <>
        <h2 className="mt-8 font-editorial text-2xl text-editorial-red">ราคาจริงรายวัน (75 วัน)</h2>
        <div className="mt-2 h-72"><ResponsiveContainer><LineChart data={chart}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} domain={["auto", "auto"]} /><Tooltip /><Legend />
          {ids.map((id, i) => <Line key={id} dataKey={id} name={srcName(id)} stroke={i ? "var(--map-4)" : "var(--map-2)"} dot={{ r: 2 }} connectNulls={false} />)}
        </LineChart></ResponsiveContainer></div>
        <p className="mt-2 text-xs text-muted-foreground">จุด = วันที่มีราคาจริง · เส้นขาด = วันที่ไม่มีข้อมูล (เช่น วันหยุด) ไม่มีการเติมค่า · หน่วยของแต่ละแหล่งอาจต่างกัน</p>
      </>}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background font-editorial-body"><Masthead /><main className="mx-auto max-w-5xl px-4 py-8">{children}</main></div>;
}
