import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { AGENCIES, agencyMetrics } from "@/lib/sources";
import { bkkToday, fmt, type Metric } from "@/lib/signals";

export const agenciesQuery = queryOptions({
  queryKey: ["agencies-overview"],
  queryFn: async () => {
    const today = bkkToday();
    const [runs, metrics, obs, ds, ch, sig] = await Promise.all([
      supabase.from("source_runs").select("source,ok,ran_at,rows,error"),
      supabase.from("metrics").select("*"),
      supabase.from("observations").select("metric_id,observed_on,value,is_demo").eq("is_demo", false).gte("observed_on", today),
      supabase.from("gov_datasets").select("agency"),
      supabase.from("gov_changes").select("agency").eq("change_date", today),
      supabase.from("signals").select("metric_id").eq("signal_date", today),
    ]);
    return {
      runs: (runs.data ?? []) as { source: string; ok: boolean; ran_at: string; rows: number; error: string | null }[],
      metrics: (metrics.data ?? []) as Metric[],
      obs: obs.data ?? [],
      datasets: ds.data ?? [],
      changes: ch.data ?? [],
      signals: sig.data ?? [],
    };
  },
});

export const Route = createFileRoute("/agencies")({
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
  component: AgenciesLayout,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
});

function AgenciesLayout() {
  const child = useMatch({ from: "/agencies/$agency", shouldThrow: false });
  return child ? <Outlet /> : <Agencies />;
}

function Agencies() {
  const { data } = useSuspenseQuery(agenciesQuery);
  const met = new Map(data.metrics.map((m) => [m.id, m]));
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-4xl">ข้อมูลจริงแยกตามหน่วยงาน</h1>
        <p className="mt-2 text-muted-foreground">ทุกค่าที่นี่ดึงจากแหล่งโดยตรง ไม่ใช่จากข่าว กดเข้าไปดูไทม์ไลน์การเปลี่ยนแปลงรายวัน</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {AGENCIES.map((a) => {
            const runs = data.runs.filter((r) => a.sources.includes(r.source));
            const okCount = runs.filter((r) => r.ok).length;
            const mids = agencyMetrics(a);
            const latest = mids.map((id) => ({ m: met.get(id), o: data.obs.filter((o) => o.metric_id === id).at(-1) })).filter((x) => x.m && x.o);
            const nDs = a.catalog ? data.datasets.filter((d) => d.agency === a.catalog).length : 0;
            const nCh = a.catalog ? data.changes.filter((c) => c.agency === a.catalog).length : 0;
            const nSig = data.signals.filter((s) => mids.includes(s.metric_id) || (a.catalog && s.metric_id.startsWith("cat_") && mids.includes(s.metric_id))).length;
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
                  {a.catalog && <li className="flex justify-between"><span className="text-muted-foreground">ชุดข้อมูลที่ติดตาม</span><span>{nDs}</span></li>}
                </ul>
                <p className="mt-3 text-xs">
                  วันนี้: เปลี่ยน {nCh} ชุด · สัญญาณ {nSig}
                </p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
