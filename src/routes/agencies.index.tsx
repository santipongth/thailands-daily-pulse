import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { AGENCIES, agencyMetrics } from "@/lib/sources";
import { bkkToday, fmt, type Metric } from "@/lib/signals";

const agenciesQuery = queryOptions({
  queryKey: ["agencies-overview"],
  queryFn: async () => {
    const today = bkkToday();
    const [runs, metrics, obs, sig] = await Promise.all([
      supabase.from("source_runs").select("source,ok,ran_at,rows,error"),
      supabase.from("metrics").select("*"),
      supabase.from("observations").select("metric_id,observed_on,value,is_demo").eq("is_demo", false).order("observed_on", { ascending: false }).limit(5000),
      supabase.from("signals").select("metric_id").eq("signal_date", today),
    ]);
    return {
      runs: (runs.data ?? []) as { source: string; ok: boolean; ran_at: string; rows: number; error: string | null }[],
      metrics: (metrics.data ?? []) as Metric[],
      obs: obs.data ?? [],
      signals: sig.data ?? [],
    };
  },
});

export const Route = createFileRoute("/agencies/")({
  staticData: { sitemap: true },
  loader: ({ context }) => context.queryClient.ensureQueryData(agenciesQuery),
  head: () => ({
    meta: [
      { title: "ข้อมูลจริงแยกตามหน่วยงาน — Thailand Daily Signals" },
      { name: "description", content: "ข้อมูลที่ดึงได้จริงจากหน่วยงานรัฐแต่ละแห่ง พร้อมการเปลี่ยนแปลงรายวัน" },
      { property: "og:title", content: "ข้อมูลจริงแยกตามหน่วยงาน — Thailand Daily Signals" },
      { property: "og:description", content: "ดูค่าล่าสุด ชุดข้อมูลที่ติดตาม และสิ่งที่เปลี่ยนวันนี้ของแต่ละหน่วยงาน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Agencies,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
});

function Agencies() {
  const { data } = useSuspenseQuery(agenciesQuery);
  const met = new Map(data.metrics.map((m) => [m.id, m]));
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-4xl">ข้อมูลจริงแยกตามแหล่ง</h1>
        <p className="mt-2 text-muted-foreground">ตัวเลขดึงจากแหล่งโดยตรง ไม่ใช่จากข่าว · ตรวจสอบค่าล่าสุดและไทม์ไลน์รายวันของแต่ละแหล่ง</p>
        {(["government", "other"] as const).map((category) => <section key={category} className="mt-10">
          <h2 className="border-b-2 border-foreground pb-2 font-display text-2xl">{category === "government" ? "หน่วยงานรัฐ" : "แหล่งข้อมูลอื่น"}</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {AGENCIES.filter((a) => a.category === category).map((a) => {
            const runs = data.runs.filter((r) => a.sources.includes(r.source));
            const okCount = runs.filter((r) => r.ok).length;
            const mids = agencyMetrics(a);
            const latest = mids.map((id) => ({ m: met.get(id), o: data.obs.find((o) => o.metric_id === id) })).filter((x) => x.m && x.o);
            const nSig = data.signals.filter((s) => mids.includes(s.metric_id)).length;
            return (
              <Link key={a.key} to="/agencies/$agency" params={{ agency: a.key }} className="block border-2 border-foreground p-4 hover:bg-card">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-display text-xl">{a.label}</h2>
                  <span className={`text-xs ${runs.length && okCount === runs.length ? "text-primary" : "text-destructive"}`}>
                    {runs.length ? `ดึงได้ ${okCount}/${runs.length} แหล่ง` : "ยังไม่เคยดึง"}
                  </span>
                </div>
                <ul className="mt-3 space-y-1 text-sm tabular-nums">
                  {latest.slice(0, 3).map(({ m, o }) => (
                    <li key={m!.id} className="flex justify-between gap-2"><span className="truncate text-muted-foreground">{m!.name_th}</span><span>{fmt(Number(o!.value), m!.decimals)} {m!.unit}</span></li>
                  ))}
                  {!latest.length && <li className="text-muted-foreground">{runs.find((r) => !r.ok)?.error ?? (runs.some((r) => r.ok) ? "แหล่งนี้ไม่มีตัวเลขรายวัน" : "ยังไม่มีค่าจริง · ดูสถานะการดึงในหน้ารายละเอียด")}</li>}
                </ul>
                <p className="mt-3 text-xs">
                  วันนี้: สัญญาณ {nSig}
                </p>
              </Link>
            );
          })}
          </div>
        </section>)}
      </main>
    </div>
  );
}
