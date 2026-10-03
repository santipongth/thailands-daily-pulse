import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Masthead } from "@/components/masthead";
import { LocalSummary } from "@/components/local-conditions";
import { supabase } from "@/integrations/supabase/client";

// Key numbers: every real metric that feeds the Daily Brief, aggregated per month (average of real
// daily observations) plus the number of brief items per month. Real data only (is_demo = false).
const keyQuery = queryOptions({
  queryKey: ["key-data"],
  queryFn: async () => {
    const [f, m, o, b] = await Promise.all([
      supabase.from("families").select("id,name_th,emoji,sort").order("sort"),
      supabase.from("metrics").select("id,family_id,name_th,unit,decimals,sort").order("sort"),
      supabase.from("observations").select("metric_id,observed_on,value").eq("is_demo", false).order("observed_on").limit(20000),
      supabase.from("daily_briefs").select("brief_date,items,published_at").order("brief_date"),
    ]);
    for (const r of [f, m, o, b]) if (r.error) throw new Error(r.error.message);
    return { families: f.data ?? [], metrics: m.data ?? [], obs: o.data ?? [], briefs: b.data ?? [] };
  },
});

export const Route = createFileRoute("/key-data")({
  staticData: { sitemap: true },
  loader: ({ context }) => context.queryClient.ensureQueryData(keyQuery),
  head: () => ({
    meta: [
      { title: "ข้อมูลสำคัญรายเดือน — Thailand Daily Signals" },
      { name: "description", content: "รวมตัวเลขจริงทุกตัวจาก Daily Brief พร้อมกราฟค่าเฉลี่ยรายเดือนและการเปลี่ยนแปลงเทียบเดือนก่อน" },
      { property: "og:title", content: "ข้อมูลสำคัญรายเดือน — Thailand Daily Signals" },
      { property: "og:description", content: "ตัวเลขจริงจาก Daily Brief เทียบรายเดือน: น้ำมัน ทอง อาหาร อากาศ ค่าเงิน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KeyData,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
});

const monthLabel = (ym: string) =>
  new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(ym + "-01T00:00:00Z"));
const nf = (v: number, d: number) => v.toLocaleString("th-TH", { maximumFractionDigits: d });

function KeyData() {
  const { data } = useSuspenseQuery(keyQuery);
  const months = [...new Set(data.obs.map((o) => o.observed_on.slice(0, 7)))].sort();
  const briefMonths = new Map<string, { n: number; items: number }>();
  for (const b of data.briefs) {
    const k = b.brief_date.slice(0, 7);
    const cur = briefMonths.get(k) ?? { n: 0, items: 0 };
    cur.n++; cur.items += Array.isArray(b.items) ? b.items.length : 0;
    briefMonths.set(k, cur);
  }
  const series = data.metrics.map((m) => {
    const os = data.obs.filter((o) => o.metric_id === m.id);
    const rows = months.map((ym) => {
      const vs = os.filter((o) => o.observed_on.startsWith(ym)).map((o) => Number(o.value));
      return { ym, label: monthLabel(ym), avg: vs.length ? vs.reduce((a, c) => a + c, 0) / vs.length : null, n: vs.length };
    }).filter((r) => r.avg != null) as { ym: string; label: string; avg: number; n: number }[];
    const last = os[os.length - 1];
    const cur = rows[rows.length - 1], prev = rows[rows.length - 2];
    const pct = cur && prev && prev.avg !== 0 ? ((cur.avg - prev.avg) / Math.abs(prev.avg)) * 100 : null;
    return { m, rows, last, pct, cur, prev };
  }).filter((s) => s.rows.length);

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="page-shell">
        <h1 className="font-editorial text-4xl sm:text-5xl">ข้อมูลสำคัญรายเดือน</h1>
        <p className="mt-2 text-muted-foreground">ตัวเลขจริงทุกตัวที่ใช้ใน Daily Brief · กราฟ = ค่าเฉลี่ยรายเดือนจากข้อมูลจริงรายวัน (ไม่รวมข้อมูลตัวอย่าง) · % = เดือนล่าสุดเทียบเดือนก่อน</p>

        <section className="mt-6 border-t-2 border-editorial-ink bg-editorial-surface p-4 shadow-[var(--shadow-editorial)]">
          <h2 className="font-editorial text-2xl text-editorial-red">Daily Brief ต่อเดือน</h2>
          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...briefMonths].map(([ym, v]) => ({ label: monthLabel(ym), ฉบับ: v.n, รายการ: v.items }))}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" />
                <XAxis dataKey="label" fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis fontSize={12} allowDecimals={false} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--background)", border: "1px solid var(--border)" }} />
                <Bar dataKey="ฉบับ" fill="var(--muted-foreground)" />
                <Bar dataKey="รายการ" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <LocalSummary gistda={(() => { const g = data.obs.filter((o) => o.metric_id === "pm25_bkk").at(-1); return g ? { value: Number(g.value), date: g.observed_on } : null; })()} />

        {data.families.map((f) => {
          const ss = series.filter((s) => s.m.family_id === f.id);
          if (!ss.length) return null;
          return (
            <section key={f.id} className="mt-10">
              <h2 className="section-heading text-2xl">
                <Link to="/signals/$family" params={{ family: f.id }} className="hover:underline">{f.emoji} {f.name_th}</Link>
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {ss.map(({ m, rows, last, pct, cur, prev }) => (
                  <article key={m.id} className="border-t-2 border-editorial-ink bg-editorial-surface p-4 shadow-[var(--shadow-editorial)]">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold">{m.name_th}</h3>
                      {pct != null && (
                        <span className={`text-sm font-semibold tabular-nums ${pct > 0 ? "text-destructive" : pct < 0 ? "text-primary" : ""}`}>
                          {pct > 0 ? "+" : ""}{pct.toFixed(1)}% เทียบเดือนก่อน
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ล่าสุด <b className="text-foreground">{nf(Number(last!.value), m.decimals)} {m.unit}</b> ({last!.observed_on})
                      {cur && <> · เฉลี่ย{cur.label} {nf(cur.avg, m.decimals)}</>}
                      {prev && <> · {prev.label} {nf(prev.avg, m.decimals)}</>}
                    </p>
                    <div className="mt-2 h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rows.map((r) => ({ ...r, avg: Number(r.avg.toFixed(m.decimals)) }))}>
                          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" />
                          <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" />
                          <YAxis fontSize={11} width={48} domain={["auto", "auto"]} stroke="var(--muted-foreground)" />
                          <Tooltip
                            formatter={(v: number, _n, p: any) => [`${nf(v, m.decimals)} ${m.unit} (${p.payload.n} วัน)`, "เฉลี่ย"]}
                            contentStyle={{ background: "var(--background)", border: "1px solid var(--border)" }}
                          />
                          <Bar dataKey="avg" fill="var(--primary)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
        {!series.length && <p className="mt-8 text-muted-foreground">ยังไม่มีข้อมูลจริงให้สรุป</p>}
      </main>
    </div>
  );
}
