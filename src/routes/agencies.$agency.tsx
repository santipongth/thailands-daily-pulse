import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { AGENCIES, agencyMetrics } from "@/lib/sources";
import { bkkToday, fmt, shiftDate, thaiDate, type Metric } from "@/lib/signals";

const agencyQuery = (key: string) =>
  queryOptions({
    queryKey: ["agency", key],
    queryFn: async () => {
      const a = AGENCIES.find((x) => x.key === key);
      if (!a) return null;
      const since = shiftDate(bkkToday(), -13);
      const mids = agencyMetrics(a);
      const [metrics, obs, changes, datasets, history, news] = await Promise.all([
        supabase.from("metrics").select("*").in("id", mids.length ? mids : ["-"]),
        supabase.from("observations").select("metric_id,observed_on,value,is_demo").in("metric_id", mids.length ? mids : ["-"]).eq("is_demo", false).gte("observed_on", shiftDate(since, -1)).order("observed_on"),
        a.catalog ? supabase.from("gov_changes").select("id,change_date,kind,reason_th,before_text,after_text,pct,gov_datasets(url)").eq("agency", a.catalog).gte("change_date", since).order("change_date", { ascending: false }) : Promise.resolve({ data: [] }),
        a.catalog ? supabase.from("gov_datasets").select("id,title,org,url").eq("agency", a.catalog).order("title").limit(60) : Promise.resolve({ data: [] }),
        supabase.from("source_run_history").select("source,ran_at,ok,rows,error").in("source", a.sources).order("ran_at", { ascending: false }).limit(20),
        a.newsAgency ? supabase.from("news_items").select("id,title,link,source,published_at").eq("agency", a.newsAgency).like("source", "%เว็บไซต์ทางการ%").gte("published_at", since).order("published_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
      ]);
      return { a, metrics: (metrics.data ?? []) as Metric[], obs: obs.data ?? [], changes: (changes.data ?? []) as any[], datasets: (datasets.data ?? []) as any[], history: history.data ?? [], news: (news.data ?? []) as any[], since };
    },
  });

export const Route = createFileRoute("/agencies/$agency")({
  staticData: { sitemap: false },
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(agencyQuery(params.agency));
    if (!d) throw notFound();
    return { label: d.a.label };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.label ?? "หน่วยงาน"} — ข้อมูลจริงรายวัน · Thailand Daily Signals` },
      { name: "description", content: `ไทม์ไลน์ข้อมูลที่เปลี่ยนจริงของ ${loaderData?.label ?? "หน่วยงาน"} ย้อนหลัง 14 วัน` },
      { property: "og:title", content: `${loaderData?.label ?? "หน่วยงาน"} — Thailand Daily Signals` },
      { property: "og:description", content: "ค่าก่อน → หลัง ชุดข้อมูลที่อัปเดต และประกาศใหม่ รายวัน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgencyPage,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-8">ไม่พบหน่วยงานนี้ <Link to="/agencies" className="underline">กลับ</Link></div>,
});

type Item = { key: string; text: string; detail?: string; href?: string };

function AgencyPage() {
  const { agency } = Route.useParams();
  const { data } = useSuspenseQuery(agencyQuery(agency));
  if (!data) return null;
  const met = new Map(data.metrics.map((m) => [m.id, m]));
  const days: string[] = [];
  for (let i = 0; i < 14; i++) days.push(shiftDate(bkkToday(), -i));
  const byDay = new Map<string, Item[]>(days.map((d) => [d, []]));
  // value changes: compare each day's real observation with the previous real one
  for (const m of data.metrics) {
    const rows = data.obs.filter((o) => o.metric_id === m.id);
    for (let i = 1; i < rows.length; i++) {
      const p = rows[i - 1]!, c = rows[i]!;
      if (Number(p.value) === Number(c.value) || !byDay.has(c.observed_on)) continue;
      const pct = Number(p.value) ? ((Number(c.value) - Number(p.value)) / Math.abs(Number(p.value))) * 100 : null;
      byDay.get(c.observed_on)!.push({ key: `${m.id}${c.observed_on}`, text: `${m.name_th}: ${fmt(Number(p.value), m.decimals)} → ${fmt(Number(c.value), m.decimals)} ${m.unit}`, detail: `${pct != null ? `${pct > 0 ? "+" : ""}${pct.toFixed(2)}% · ` : ""}เทียบกับ ${thaiDate(p.observed_on, { day: "numeric", month: "short" })}` });
    }
  }
  for (const c of data.changes) byDay.get(c.change_date)?.push({ key: `c${c.id}`, text: c.reason_th, detail: `${c.before_text ?? "—"} → ${c.after_text ?? "—"}${c.pct != null ? ` · ${c.pct}%` : ""}${c.kind === "updated" ? " · อัปโหลดใหม่โดยไม่เปลี่ยนตัวเลข (ไม่ตัดเป็นสัญญาณ)" : ""}`, href: c.gov_datasets?.url });
  for (const n of data.news) {
    const d = new Date(new Date(n.published_at).getTime() + 7 * 3600e3).toISOString().slice(0, 10);
    byDay.get(d)?.push({ key: `n${n.id}`, text: `ประกาศใหม่บนเว็บไซต์: ${n.title}`, href: n.link });
  }
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link to="/agencies" className="text-sm hover:underline">← ทุกหน่วยงาน</Link>
        <h1 className="mt-3 font-display text-4xl">{data.a.label}</h1>
        <section className="mt-6">
          <h2 className="border-b-2 border-foreground pb-1 font-display text-2xl">ไทม์ไลน์สิ่งที่เปลี่ยนจริง (14 วัน)</h2>
          {days.map((d) => {
            const items = byDay.get(d)!;
            return (
              <div key={d} className="grid grid-cols-[7rem_1fr] gap-4 border-b border-border py-3 text-sm">
                <div className="text-muted-foreground">{thaiDate(d, { day: "numeric", month: "short", weekday: "short" })}</div>
                {items.length === 0 ? <div className="text-muted-foreground">ไม่เปลี่ยน</div> : (
                  <ul className="space-y-2">
                    {items.map((it) => (
                      <li key={it.key}>
                        {it.href ? <a href={it.href} target="_blank" rel="noreferrer" className="hover:underline">{it.text}</a> : it.text}
                        {it.detail && <span className="block text-xs text-muted-foreground">{it.detail}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
        {data.metrics.length > 0 && (
          <section className="mt-10">
            <h2 className="border-b-2 border-foreground pb-1 font-display text-2xl">ค่าล่าสุด</h2>
            <ul className="mt-2 text-sm">
              {data.metrics.map((m) => {
                const o = data.obs.filter((x) => x.metric_id === m.id).at(-1);
                return <li key={m.id} className="flex justify-between border-b border-border py-1.5"><span>{met.get(m.id)?.name_th}</span><span className="tabular-nums">{o ? `${fmt(Number(o.value), m.decimals)} ${m.unit} · ${thaiDate(o.observed_on, { day: "numeric", month: "short" })}` : "—"}</span></li>;
              })}
            </ul>
          </section>
        )}
        {data.datasets.length > 0 && (
          <section className="mt-10">
            <h2 className="border-b-2 border-foreground pb-1 font-display text-2xl">ชุดข้อมูลที่ติดตาม ({data.datasets.length})</h2>
            <ul className="mt-2 grid gap-x-6 text-sm sm:grid-cols-2">
              {data.datasets.map((d) => (
                <li key={d.id} className="border-b border-border py-1.5"><a href={d.url} target="_blank" rel="noreferrer" className="hover:underline">{d.title}</a><span className="block text-xs text-muted-foreground">{d.org}</span></li>
              ))}
            </ul>
          </section>
        )}
        <section className="mt-10">
          <h2 className="border-b-2 border-foreground pb-1 font-display text-2xl">การดึงข้อมูลล่าสุด</h2>
          <ul className="mt-2 text-sm">
            {data.history.length === 0 && <li className="py-2 text-muted-foreground">ยังไม่มีประวัติ (เริ่มบันทึกตั้งแต่รอบถัดไป)</li>}
            {data.history.map((h: any, i: number) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 border-b border-border py-1.5">
                <span>{h.source}</span>
                <span className={h.ok ? "text-primary" : "text-destructive"}>{h.ok ? `สำเร็จ · ${h.rows} รายการ` : `ล้มเหลว · ${h.error}`} · {new Date(h.ran_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
