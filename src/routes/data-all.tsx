import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { makeReasonOf, srcOf, type Run, type Release } from "@/lib/missing-reason";
import { StationMap } from "@/components/station-map";

// Every metric the site really collected (is_demo = false): latest vs previous value, change, daily chart.
const allQuery = queryOptions({
  queryKey: ["data-all"],
  queryFn: async () => {
    const since = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
    const [f, m, o, r, rc] = await Promise.all([
      supabase.from("families").select("id,name_th,emoji,sort").order("sort"),
      supabase.from("metrics").select("id,family_id,name_th,unit,decimals,sort").order("sort"),
      supabase.from("observations").select("metric_id,observed_on,value").eq("is_demo", false).order("observed_on").limit(20000),
      supabase.from("source_runs").select("source,ran_at,ok,error"),
      supabase.from("release_calendar").select("family_id,title,release_date").gte("release_date", since).order("release_date"),
    ]);
    for (const x of [f, m, o]) if (x.error) throw new Error(x.error.message);
    return { families: f.data ?? [], metrics: m.data ?? [], obs: o.data ?? [], runs: (r.data ?? []) as Run[], releases: (rc.data ?? []) as Release[] };
  },
});

export const Route = createFileRoute("/data-all")({
  staticData: { sitemap: true },
  loader: ({ context }) => context.queryClient.ensureQueryData(allQuery),
  head: () => ({
    meta: [
      { title: "ข้อมูลทั้งหมดที่เก็บได้จริง — Thailand Daily Signals" },
      { name: "description", content: "ทุกตัวเลขจริงที่เว็บเก็บได้: ค่าล่าสุด ค่าเดิม การเปลี่ยนแปลง และกราฟรายวัน พร้อมเหตุผลเมื่อไม่มีค่า" },
      { property: "og:title", content: "ข้อมูลทั้งหมดที่เก็บได้จริง — Thailand Daily Signals" },
      { property: "og:description", content: "ค่าล่าสุด ค่าเดิม การเปลี่ยนแปลง และกราฟรายวันของทุกตัวชี้วัด" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DataAll,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
});

const fmt = (v: number, d: number) => Number(v).toLocaleString("th-TH", { maximumFractionDigits: d });

function DataAll() {
  const { data } = useSuspenseQuery(allQuery);
  const [open, setOpen] = useState<string | null>(null);
  const reasonOf = makeReasonOf(data.runs, data.releases);
  const withData = new Set(data.obs.map((o) => o.metric_id));
  return (
    <div className="min-h-screen bg-background">
      <Masthead />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl">ข้อมูลทั้งหมดที่เก็บได้จริง</h1>
        <p className="mt-1 text-sm text-muted-foreground">ข้อมูลจริงเท่านั้น (ไม่รวมข้อมูลตัวอย่าง) · มีค่า {withData.size} จาก {data.metrics.length} ตัวชี้วัด · กดแถวเพื่อดูกราฟรายวันขนาดใหญ่</p>
        <StationMap />
        {data.families.map((f) => {
          const ms = data.metrics.filter((m) => m.family_id === f.id);
          if (!ms.length) return null;
          return (
            <section key={f.id} className="mt-8">
              <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">{f.emoji} {f.name_th}</h2>
              <div className="overflow-x-auto">
                <table className="mt-2 w-full text-sm">
                  <thead><tr className="text-left"><th>ตัวชี้วัด</th><th>ล่าสุด</th><th>ค่าเดิม</th><th>เปลี่ยน</th><th className="w-40">30 วัน</th></tr></thead>
                  <tbody>
                    {ms.map((m) => {
                      const os = data.obs.filter((o) => o.metric_id === m.id).map((o) => ({ d: o.observed_on, v: Number(o.value) }));
                      const last = os[os.length - 1], prev = os[os.length - 2];
                      const ch = last && prev ? last.v - prev.v : null;
                      const pct = ch !== null && prev && prev.v !== 0 ? (ch / Math.abs(prev.v)) * 100 : null;
                      const isOpen = open === m.id;
                      return [
                        <tr key={m.id} className="cursor-pointer border-t border-border align-top hover:bg-muted" onClick={() => setOpen(isOpen ? null : m.id)}>
                          <td className="py-1 pr-2">{m.name_th}<div className="text-xs text-muted-foreground">{srcOf(m.id) ?? "ประกาศตามรอบ"}</div></td>
                          {last ? (
                            <>
                              <td className="pr-2">{fmt(last.v, m.decimals)} {m.unit}<div className="text-xs text-muted-foreground">{last.d}</div></td>
                              <td className="pr-2">{prev ? <>{fmt(prev.v, m.decimals)} {m.unit}<div className="text-xs text-muted-foreground">{prev.d}</div></> : "ค่าแรก"}</td>
                              <td className={ch ? "pr-2 font-semibold" : "pr-2"}>{ch === null ? "—" : ch === 0 ? "ไม่เปลี่ยน" : `${ch > 0 ? "+" : ""}${fmt(ch, m.decimals)}${pct !== null ? ` (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)` : ""}`}</td>
                              <td>
                                <div className="h-10 w-40">
                                  <ResponsiveContainer><LineChart data={os}><Line type="monotone" dataKey="v" stroke="var(--color-foreground)" dot={os.length < 3} strokeWidth={1.5} isAnimationActive={false} /><YAxis hide domain={["auto", "auto"]} /></LineChart></ResponsiveContainer>
                                </div>
                              </td>
                            </>
                          ) : (
                            <td colSpan={4} className="text-muted-foreground">ไม่มีค่า — {reasonOf(m)}</td>
                          )}
                        </tr>,
                        isOpen && last ? (
                          <tr key={m.id + "-big"}><td colSpan={5}>
                            <div className="h-64 w-full py-2">
                              <ResponsiveContainer>
                                <LineChart data={os}>
                                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                                  <XAxis dataKey="d" fontSize={11} />
                                  <YAxis domain={["auto", "auto"]} fontSize={11} width={60} />
                                  <Tooltip formatter={(v: number) => `${fmt(v, m.decimals)} ${m.unit}`} />
                                  <Line type="monotone" dataKey="v" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 pb-2 text-xs">
                              {os.map((p) => <span key={p.d}>{p.d}: <b>{fmt(p.v, m.decimals)}</b></span>)}
                            </div>
                          </td></tr>
                        ) : null,
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
