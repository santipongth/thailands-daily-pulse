import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { HouseholdBasket } from "@/components/household-basket";
import { BriefItems, type BriefItem, type ValueEvidence } from "@/components/brief-items";
import { supabase } from "@/integrations/supabase/client";
import { bkkToday, shiftDate, thaiDate } from "@/lib/signals";
import { STATUS_TH, type Completeness } from "@/lib/completeness";
import { AllMetricsCompare } from "@/components/all-metrics-compare";
import { DamsBox, StationCompare } from "@/components/brief-dams-weather";
import { SocialFeed } from "@/components/social-feed";
import { DailyTrends, ForecastCompare } from "@/components/brief-trends";
import { BriefFrontPage } from "@/components/brief-frontpage";

const hm = (s: string) => new Date(s).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

const briefQuery = (date: string) =>
  queryOptions({
    queryKey: ["brief", date],
    queryFn: async () => {
      const [{ data, error }, { data: updates }, { data: prevB }] = await Promise.all([
        supabase.from("daily_briefs").select("brief_date,body,published_at,generated_at,items,cutoff_at,edition,completeness,data_window").eq("brief_date", date).maybeSingle(),
        supabase.from("brief_updates").select("*").eq("brief_date", date).order("created_at"),
        supabase.from("daily_briefs").select("brief_date,items,data_window,completeness").lt("brief_date", date).order("brief_date", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (error) throw error;
      if (!data) return null;
      // Exact raw file behind each compared value (today's and the one it was compared with).
      const items = (data.items ?? []) as BriefItem[];
      const ids = [...new Set(items.map((i) => i.metric_id))];
      const dates = [...new Set(items.flatMap((i) => [i.data_date, i.compared_with]).filter(Boolean))] as string[];
      const valueEvidence: ValueEvidence = {};
      if (ids.length && dates.length) {
        const { data: obs, error: oe } = await supabase.from("observations").select("metric_id,observed_on,evidence_id").in("metric_id", ids).in("observed_on", dates);
        if (oe) throw oe;
        for (const i of items) {
          const find = (d?: string | null) => obs?.find((o) => o.metric_id === i.metric_id && o.observed_on === d)?.evidence_id ?? null;
          valueEvidence[i.metric_id] = { cur: find(i.data_date), prev: find(i.compared_with) };
        }
      }
      return { ...data, updates: updates ?? [], valueEvidence, prev: prevB ?? null };
    },
  });

export const Route = createFileRoute("/brief/$date")({
  staticData: { sitemap: false },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(briefQuery(params.date)),
  head: ({ params }) => ({
    meta: [
      { title: `Daily Brief ${params.date} — Thailand Daily Signals` },
      { name: "description", content: `สรุปสัญญาณประจำวันที่ ${params.date}: อะไรเปลี่ยน สำคัญแค่ไหน กระทบครัวเรือน และคำแนะนำจากแหล่งทางการ` },
      { property: "og:title", content: `Daily Brief ${params.date} — Thailand Daily Signals` },
      { property: "og:description", content: "4 คำถามที่คนไทยควรรู้ทุกเช้า" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BriefPage,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-8">ไม่พบ Brief วันนี้</div>,
});

function BriefPage() {
  const { date } = Route.useParams();
  const { data } = useSuspenseQuery(briefQuery(date));
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="page-shell">
        <nav aria-label="ฉบับ Daily Brief" className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-editorial-rule pb-3 text-sm sm:flex sm:items-center sm:justify-between">
          <Link to="/brief/$date" params={{ date: shiftDate(date, -1) }} className="hover:underline">← วันก่อน</Link>
          <Link to="/brief" className="hover:underline">คลังทั้งหมด</Link>
          {date < bkkToday() && <Link to="/brief/$date" params={{ date: shiftDate(date, 1) }} className="col-span-2 text-right hover:underline sm:col-span-1">วันถัดไป →</Link>}
        </nav>
        <header className="my-8 border-b-4 border-editorial-red pb-5 text-center">
           <p className="font-editorial text-3xl italic text-editorial-red">สรุปสัญญาณประจำวัน · Thailand Daily Signals</p>
          <h1 className="mt-3 font-editorial-body text-2xl font-semibold leading-relaxed text-editorial-ink sm:text-3xl">{thaiDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h1>
        </header>
         {!data ? (
           <p className="mt-6 text-muted-foreground">ยังไม่มีสรุปของวันนี้ ฉบับถัดไปมีกำหนดเผยแพร่เวลา 06:00 น.</p>
        ) : (
          <>
            <div className="mx-auto max-w-3xl"><BriefFrontPage date={date} items={(data.items ?? []) as BriefItem[]} edition={data.edition} cutoff={data.cutoff_at} /></div>
            <div className="mx-auto max-w-3xl">
            <p className="mt-6 text-xs text-muted-foreground">
               {data.published_at ? `เผยแพร่ ${new Date(data.published_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })} น.` : "ฉบับระหว่างวัน (ฉบับประจำเช้าเผยแพร่ 06:00 น.)"} · บทนำเรียบเรียงโดย AI จากข้อเท็จจริงด้านล่างเท่านั้น
            </p>
            {data.cutoff_at && <p className="mt-1 text-sm font-semibold">ข้อมูลถึง {hm(data.cutoff_at)} น. — ข้อมูลที่ได้รับหลังเวลานี้เข้าเป็นอัปเดตด้านล่างหรือฉบับถัดไป</p>}
             <section id="summary" className="mt-10 border-t border-editorial-ink pt-5">
               <h2 className="font-editorial text-3xl text-editorial-red">สรุปประจำวัน</h2>
               <p className="mt-4 font-editorial-body text-xl font-medium leading-relaxed">{data.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">ตัวเลขทั้งหมดคำนวณโดยระบบจากข้อมูลทางการ — AI ใช้เรียบเรียงภาษาบทนำเท่านั้น และถูกตรวจว่าไม่เพิ่มตัวเลขใหม่</p>
              <div className="mt-6"><BriefItems items={(data.items ?? []) as BriefItem[]} valueEvidence={data.valueEvidence} /></div>
            </section>
             <section id="comparison" className="mt-12 border-t border-editorial-ink pt-5">
               <h2 className="font-editorial text-3xl text-editorial-red">เทียบกับวันก่อนหน้า</h2>
              <CompareWithPrev cur={data} prev={data.prev} />
            </section>
            {data.updates.length > 0 && (
               <section id="updates" className="mt-12 border-t border-editorial-ink pt-5">
                 <h2 className="font-editorial text-3xl text-editorial-red">อัปเดตหลังเผยแพร่</h2>
                <ul className="mt-4 divide-y divide-border text-sm">
                  {data.updates.map((u: any) => (
                    <li key={u.id} className="py-2"><span className="font-semibold">{hm(u.created_at)} น. · {({ update: "เหตุใหม่", correction: "แก้ไข", withdrawal: "ถอน" } as Record<string, string>)[u.kind] ?? u.kind}</span> — {u.title}{u.body ? ` (${u.body})` : ""} {u.event_id && <Link to="/events/$id" params={{ id: u.event_id }} className="text-xs underline">รุ่น {u.version}</Link>}</li>
                  ))}
                </ul>
              </section>
            )}
             <section id="daily-data" className="mt-12 border-t border-editorial-ink pt-5">
               <h2 className="font-editorial text-3xl text-editorial-red">ข้อมูลและกราฟรายวัน</h2>
              <SocialFeed from={(data as any).data_window?.from ?? `${date}T00:00:00+07:00`} to={data.cutoff_at ?? (data as any).data_window?.to ?? null} />
              <DamsBox date={date} cutoff={data.cutoff_at ?? (data as any).data_window?.to ?? null} />
              <ForecastCompare date={date} />
              <StationCompare date={date} />
              <DailyTrends date={date} />
              <AllMetricsCompare date={date} cutoff={data.cutoff_at ?? (data as any).data_window?.to ?? null} completeness={Array.isArray(data.completeness) ? (data.completeness as Completeness[]) : null} />
            </section>
             <section id="sources" className="mt-12 border-t border-editorial-ink pt-5">
               <h2 className="font-editorial text-3xl text-editorial-red">ข้อมูลที่ใช้และแหล่งที่ตรวจสอบไม่ได้</h2>
            {(data as any).data_window && (() => { const w = (data as any).data_window; return (
              <div className="mt-4 border-y border-border py-3 text-sm">
                <p className="font-semibold">ช่วงข้อมูลที่นับ: {hm(w.from)} → {hm(w.to)} น. ของวันนี้ · ได้รับหลังจากนั้น = ตัดออก</p>
                <p>เก็บจริง: ค่าแรก {w.first_received ? hm(w.first_received) : "—"} น. · ค่าสุดท้าย {w.last_received ? hm(w.last_received) : "—"} น.</p>
                <p>ได้รับในช่วงนี้ {w.received_inside} ค่า · ใช้ในฉบับนี้ {w.included} เหตุการณ์ · ตัดออก {w.excluded?.length ?? 0} · ตรวจไม่ได้ {w.unverifiable?.length ?? 0} แหล่ง</p>
                {w.excluded?.map((e: any) => <p key={e.metric_id} className="text-muted-foreground">ตัดออก: {e.title} ({e.reason})</p>)}
                {w.unverifiable?.length > 0 && <p className="text-muted-foreground">ตรวจไม่ได้ (ไม่นับว่าไม่เปลี่ยน): {w.unverifiable.join(", ")}</p>}
              </div>); })()}
            {Array.isArray(data.completeness) && (
              <div className="mt-6">
                <h3 className="border-b border-editorial-rule pb-2 font-editorial text-xl text-editorial-ink">ความครบถ้วนของแหล่งข้อมูล</h3>
                <p className="mt-1 text-xs text-muted-foreground">แหล่งที่ "เก่า" หรือ "ตรวจสอบไม่ได้" ไม่ได้แปลว่าไม่เปลี่ยน — เพียงแต่ยังยืนยันไม่ได้ในฉบับนี้</p>
                <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {(data.completeness as Completeness[]).map((c) => (
                    <li key={c.source}><span className={c.status === "ok" ? "font-semibold text-primary" : "font-semibold text-destructive"}>{STATUS_TH[c.status]}</span> {c.source} <span className="text-xs text-muted-foreground">· ข้อมูลวันที่ {c.data_date ?? "—"}{c.status !== "ok" ? ` · ${c.reason}` : ""}</span></li>
                  ))}
                </ul>
              </div>
            )}
            </section>
             <section id="household" className="mt-12 border-t border-editorial-ink pt-5">
              <HouseholdBasket date={date} />
            </section>
            <Link to="/day/$date" params={{ date }} className="mt-4 inline-block text-sm underline">ดูอันดับสัญญาณทั้งหมดของวันนี้ เทียบเมื่อวาน →</Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function CompareWithPrev({ cur, prev }: { cur: any; prev: any }) {
  if (!prev) return null;
  const cw = cur.data_window ?? {}, pw = prev.data_window ?? {};
  const ci = (cur.items ?? []) as any[], pi = (prev.items ?? []) as any[];
  const perDay = (xs: any[]) => +xs.reduce((a, i) => a + Number(i.impact_calc?.per_day ?? 0), 0).toFixed(2);
  const metrics = [...new Set([...ci, ...pi].map((i) => i.metric_id))];
  const rows: [string, string | number, string | number][] = [
    ["ค่าที่ได้รับก่อน 05:45", pw.received_inside ?? "—", cw.received_inside ?? "—"],
    ["เหตุการณ์ในฉบับ", pi.length, ci.length],
    ["ถูกตัด (มาหลัง 05:45)", pw.excluded?.length ?? "—", cw.excluded?.length ?? "—"],
    ["แหล่งตรวจไม่ได้", pw.unverifiable?.length ?? "—", cw.unverifiable?.length ?? "—"],
    ["ผลต่อครัวเรือนรวม (บาท/วัน)", perDay(pi), perDay(ci)],
  ];
  return (
    <div className="mt-4 overflow-x-auto border-y border-border py-3 text-sm">
       <h3 className="font-semibold">เทียบกับฉบับก่อนหน้า ({thaiDate(prev.brief_date, { day: "numeric", month: "long", year: "numeric" })})</h3>
      <table className="mt-2 w-full">
         <thead><tr className="text-left"><th>รายการ</th><th>{thaiDate(prev.brief_date, { day: "numeric", month: "short" })}</th><th>วันนี้</th></tr></thead>
        <tbody>{rows.map(([k, a, b]) => <tr key={k} className="border-t border-border"><td className="py-1">{k}</td><td>{a}</td><td className={a !== b ? "font-semibold" : ""}>{b}</td></tr>)}</tbody>
      </table>
      <ul className="mt-2 space-y-0.5">
        {metrics.map((m) => {
          const a = pi.find((i) => i.metric_id === m), b = ci.find((i) => i.metric_id === m);
           return <li key={m}>{(b ?? a).what}: {b && a ? (b.what === a.what ? "คำอธิบายเหตุการณ์เหมือนฉบับก่อน" : "คำอธิบายเหตุการณ์เปลี่ยน") : b ? "มีเหตุการณ์ใหม่ในฉบับวันนี้" : "ไม่อยู่ในฉบับวันนี้ — อาจไม่เกินเกณฑ์หรือไม่มีข้อมูลที่ยืนยันได้"}</li>;
        })}
        {!metrics.length && <li className="text-muted-foreground">ทั้งสองฉบับไม่มีเหตุการณ์</li>}
      </ul>
    </div>
  );
}
