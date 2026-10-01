import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { fmt, thaiDate, type Family, type Metric, type News } from "@/lib/signals";

type Row = { metric_id: string; observed_on: string; value: number; is_demo: boolean; created_at: string };

const rawQuery = queryOptions({
  queryKey: ["raw-data"],
  queryFn: async () => {
    const [f, m, o, n, r] = await Promise.all([
      supabase.from("families").select("*").order("sort"),
      supabase.from("metrics").select("*").order("sort"),
      supabase.from("observations").select("metric_id,observed_on,value,is_demo,created_at").order("observed_on", { ascending: false }).limit(1000),
      supabase.from("news_items").select("*").order("published_at", { ascending: false }).limit(60),
      supabase.from("source_runs").select("*").order("source"),
    ]);
    const err = f.error || m.error || o.error || n.error || r.error;
    if (err) throw err;
    return { families: f.data as Family[], metrics: m.data as Metric[], obs: o.data as Row[], news: n.data as News[], runs: (r.data ?? []) as { source: string; ran_at: string; ok: boolean; rows: number; error: string | null }[] };
  },
});

export const Route = createFileRoute("/data")({
  loader: ({ context }) => context.queryClient.ensureQueryData(rawQuery),
  head: () => ({
    meta: [
      { title: "ข้อมูลดิบรายวัน — Thailand Daily Signals" },
      { name: "description", content: "ข้อมูลที่เข้ามาจริงจากหน่วยงานและสื่อ ก่อนผ่านเกณฑ์ตัดเป็นสัญญาณ" },
      { property: "og:title", content: "ข้อมูลดิบรายวัน — Thailand Daily Signals" },
      { property: "og:description", content: "ดูค่าล่าสุดของทุกตัวชี้วัดและข่าวหน่วยงานที่เข้ามาในระบบ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DataPage,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
});

function DataPage() {
  const { data } = useSuspenseQuery(rawQuery);
  const byMetric = new Map<string, Row[]>();
  for (const r of data.obs) {
    const a = byMetric.get(r.metric_id) ?? [];
    if (a.length < 2) a.push(r);
    byMetric.set(r.metric_id, a);
  }
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-4xl">ข้อมูลดิบรายวัน</h1>
        <p className="mt-2 text-muted-foreground">ค่าที่เข้ามาจริงทุกตัว ก่อนเทียบเกณฑ์ — ค่าที่ไม่ผ่านเกณฑ์จะไม่กลายเป็นสัญญาณ</p>
        <section className="mt-6">
          <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">สถานะการดึงข้อมูลแต่ละแหล่ง</h2>
          <table className="mt-2 w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1">แหล่ง</th><th>สถานะ</th><th>ค่าที่ได้</th><th>ดึงล่าสุด</th></tr></thead>
            <tbody>
              {data.runs.length === 0 && <tr><td colSpan={4} className="py-2 text-muted-foreground">ยังไม่มีการดึงข้อมูลรอบใหม่</td></tr>}
              {data.runs.map((r) => (
                <tr key={r.source} className="border-b border-border">
                  <td className="py-1">{r.source}</td>
                  <td>{r.ok ? <span className="font-semibold text-primary">สำเร็จ</span> : <span className="text-destructive" title={r.error ?? ""}>ล้มเหลว</span>}</td>
                  <td>{r.rows}</td>
                  <td>{new Date(r.ran_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {data.families.map((f) => {
          const ms = data.metrics.filter((m) => m.family_id === f.id);
          if (!ms.length) return null;
          return (
            <section key={f.id} className="mt-8">
              <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">{f.emoji} {f.name_th} <span className="text-sm font-normal text-muted-foreground">· {f.source_name}</span></h2>
              <table className="mt-2 w-full text-sm">
                <thead><tr className="text-left text-muted-foreground"><th className="py-1">ตัวชี้วัด</th><th>ค่าล่าสุด</th><th>ก่อนหน้า</th><th>วันที่ข้อมูล</th><th>บันทึกเมื่อ</th><th>ประเภท</th></tr></thead>
                <tbody>
                  {ms.map((m) => {
                    const [cur, prev] = byMetric.get(m.id) ?? [];
                    return (
                      <tr key={m.id} className="border-b border-border">
                        <td className="py-1">{m.name_th}</td>
                        <td className="font-semibold">{cur ? `${fmt(cur.value, m.decimals)} ${m.unit}` : "—"}</td>
                        <td>{prev ? fmt(prev.value, m.decimals) : "—"}</td>
                        <td>{cur ? thaiDate(cur.observed_on, { dateStyle: "medium" }) : "—"}</td>
                        <td>{cur ? new Date(cur.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                        <td>{cur ? (cur.is_demo ? <span className="text-muted-foreground">ตัวอย่าง</span> : <span className="font-semibold text-primary">จริง</span>) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
        <section className="mt-10">
          <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">ข่าวหน่วยงานที่เข้ามาล่าสุด</h2>
          <ul className="mt-2 divide-y divide-border text-sm">
            {data.news.map((n) => (
              <li key={n.id} className="py-2">
                <a href={n.link} target="_blank" rel="noreferrer" className="hover:underline">{n.title}</a>
                <div className="text-xs text-muted-foreground">{n.source} · {n.agency ?? "—"} · {new Date(n.published_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
