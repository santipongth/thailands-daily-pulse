import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { registryQuery, bkkToday } from "@/lib/registry";
import { STATUS_TH } from "@/lib/completeness";
import { SOURCES } from "@/lib/sources";
import { hm, type Window } from "@/components/cut-events";

const todayData = (d: string) => queryOptions({
  queryKey: ["tracking", d],
  queryFn: async () => {
    const start = new Date(`${d}T00:00:00+07:00`).toISOString();
    const [hist, obs, brief] = await Promise.all([
      supabase.from("source_run_history").select("source,ran_at,ok,rows,error").gte("ran_at", start).order("ran_at").limit(1000),
      supabase.from("observations").select("metric_id,received_at").eq("observed_on", d).eq("is_demo", false).limit(1000),
      supabase.from("daily_briefs").select("data_window").eq("brief_date", d).maybeSingle(),
    ]);
    return { hist: hist.data ?? [], obs: obs.data ?? [], window: (brief.data?.data_window ?? null) as Window | null };
  },
});

export const Route = createFileRoute("/tracking")({
  staticData: { sitemap: true },
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(registryQuery), context.queryClient.ensureQueryData(todayData(bkkToday()))]),
  head: () => ({
    meta: [
      { title: "ติดตามการเก็บข้อมูลวันนี้ — Thailand Daily Signals" },
      { name: "description", content: "ทุกแหล่งข้อมูลในหน้าเดียว: ช่วงเวลาที่เก็บ จำนวนข้อมูลที่ขาด และเหตุผลที่ถูกตัดออกจาก Daily Brief" },
      { property: "og:title", content: "ติดตามการเก็บข้อมูลวันนี้ — Thailand Daily Signals" },
      { property: "og:description", content: "แหล่งข้อมูล ช่วงเวลาที่เก็บ ข้อมูลที่ขาด และเหตุผลที่ตัด" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Tracking,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
});

const t = (s: string) => new Date(s).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

function Tracking() {
  const today = bkkToday();
  const { data: reg } = useSuspenseQuery(registryQuery);
  const { data } = useSuspenseQuery(todayData(today));
  const comp = new Map(reg.completeness.map((c) => [c.source, c]));
  const got = new Set(data.obs.map((o) => o.metric_id));
  const cuts = data.window?.excluded ?? [];
  const rows = reg.registry.map((r) => {
    const metrics = SOURCES.filter((s) => s.source === r.source).flatMap((s) => s.metrics);
    const runs = data.hist.filter((h) => h.source === r.source);
    const missing = metrics.filter((m) => !got.has(m));
    return { r, c: comp.get(r.source), metrics, missing, runs, fails: runs.filter((x) => !x.ok), cut: cuts.filter((x) => metrics.includes(x.metric_id)) };
  });
  const totalMissing = rows.reduce((a, x) => a + x.missing.length, 0);
  const totalMetrics = rows.reduce((a, x) => a + x.metrics.length, 0);

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-4xl">ติดตามการเก็บข้อมูลวันนี้</h1>
        <p className="mt-2 text-muted-foreground">วันที่ {today} · ได้ข้อมูลจริง {totalMetrics - totalMissing} จาก {totalMetrics} ตัวชี้วัด · ขาด {totalMissing} · ตัดออกจาก Brief {cuts.length}</p>
        {data.window ? (
          <p className="mt-1 text-sm">ช่วงนับเข้า Brief 06:00: {hm(data.window.from)} – {hm(data.window.to)} · ได้รับจริงครั้งแรก {hm(data.window.first_received)} · ครั้งสุดท้าย {hm(data.window.last_received)} · <Link to="/brief/$date" params={{ date: today }} className="underline">เปิด Brief</Link></p>
        ) : <p className="mt-1 text-sm text-muted-foreground">Brief วันนี้ยังไม่ปิดรอบ (ปิดรอบ 05:45 น.)</p>}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-foreground text-left align-bottom">
                <th className="py-2 pr-3">แหล่งข้อมูล</th><th className="pr-3">ช่วงเวลาที่เก็บวันนี้</th><th className="pr-3">ข้อมูลที่ขาด</th><th className="pr-3">สถานะ</th><th>เหตุผลที่ตัด / ขาด</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, c, metrics, missing, runs, fails, cut }) => (
                <tr key={r.source} className="border-b border-border align-top">
                  <td className="py-2 pr-3"><div className="font-semibold">{r.source}</div><div className="text-xs text-muted-foreground">{r.cadence}</div></td>
                  <td className="pr-3 tabular-nums">{runs.length ? <>{t(runs[0]!.ran_at)} – {t(runs[runs.length - 1]!.ran_at)}<div className="text-xs text-muted-foreground">{runs.length} รอบ · ล้ม {fails.length}</div></> : <span className="text-muted-foreground">ยังไม่ได้เก็บวันนี้</span>}</td>
                  <td className="pr-3">{metrics.length ? <><b className={missing.length ? "text-destructive" : ""}>{missing.length}</b> / {metrics.length}{missing.length > 0 && <div className="text-xs text-muted-foreground">{missing.join(", ")}</div>}</> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="pr-3">{c && <span className={c.status === "ok" ? "font-semibold text-primary" : "font-semibold text-destructive"}>{STATUS_TH[c.status]}</span>}</td>
                  <td className="text-xs">
                    {cut.map((x) => <div key={x.metric_id}>✂️ {x.title} — {x.reason}</div>)}
                    {fails.length > 0 && <div>ดึงไม่ได้: {(fails[fails.length - 1]!.error ?? "").slice(0, 140)}</div>}
                    {c && c.status !== "ok" && <div className="text-muted-foreground">{c.reason}</div>}
                    {!cut.length && !fails.length && c?.status === "ok" && <span className="text-muted-foreground">ไม่มี</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
