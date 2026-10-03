import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { upcomingQuery } from "@/lib/calendar";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { z } from "zod";
import { Masthead } from "@/components/masthead";
import { SignalCard, Sparkline } from "@/components/signals-ui";
import { bkkToday, dayQuery, fmt, shiftDate, thaiDate } from "@/lib/signals";
import { refreshData } from "@/lib/signals.functions";
import { SENS_SEVERITIES } from "@/lib/signals";
import { useSensitivity } from "@/hooks/use-sensitivity";
import { useSourcePrefs, readIntervalHours } from "@/hooks/use-source-prefs";
import { SOURCES } from "@/lib/sources";
import { HouseholdBasket } from "@/components/household-basket";
import { BriefItems, type BriefItem } from "@/components/brief-items";
import { BkkForecast } from "@/components/bkk-forecast";
import { LatestLottery } from "@/components/latest-lottery";
import { SocialFeed } from "@/components/social-feed";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  validateSearch: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(dayQuery(deps.date ?? bkkToday())),
  head: () => ({
    meta: [
      { title: "Thailand Today — Thailand Daily Signals" },
      { name: "description", content: "สรุปทุกเช้า: วันนี้มีอะไรเปลี่ยนไปในประเทศไทยที่อาจกระทบชีวิตคุณ อากาศ PM2.5 น้ำมัน ค่าเงิน ทอง ราคาอาหาร" },
      { property: "og:title", content: "Thailand Today — Thailand Daily Signals" },
      { property: "og:description", content: "อะไรไม่เปลี่ยนก็เงียบ อะไรเปลี่ยนอย่างมีนัยสำคัญถึงขึ้นเป็น Signal" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Today,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-8">ไม่พบข้อมูล</div>,
});

function Today() {
  const { date: dParam } = Route.useSearch();
  const today = bkkToday();
  const date = dParam ?? today;
  const { data } = useSuspenseQuery(dayQuery(date));
  const refresh = useServerFn(refreshData);
  const qc = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (date !== today) return;
    refresh({ data: { maxAgeHours: readIntervalHours() } }).then((r) => {
      if (r?.refreshed) {
        qc.invalidateQueries({ queryKey: ["day", date] });
        router.invalidate();
      }
    }).catch(() => { /* Scheduled collection failure is shown in source status. */ });
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const fam = new Map(data.families.map((f) => [f.id, f]));
  const met = new Map(data.metrics.map((m) => [m.id, m]));
  const hist = (id: string) => data.obs.filter((o) => o.metric_id === id);
  const releases = data.signals.filter((s) => met.get(s.metric_id)?.kind === "release");
  const [sens] = useSensitivity();
  const [prefs] = useSourcePrefs();
  const off = new Set(SOURCES.filter((x) => prefs.disabled.includes(x.source)).flatMap((x) => x.metrics));
  const allMoves = data.signals.filter((s) => met.get(s.metric_id)?.kind !== "release" && !off.has(s.metric_id));
  const moves = allMoves.filter((s) => SENS_SEVERITIES[sens].includes(s.severity));
  const hidden = allMoves.length - moves.length;
  const agencyNews = data.news.filter((n) => n.agency).slice(0, 6);
  const activeFams = new Set([...releases, ...moves].map((s) => s.family_id));
  const quiet = data.families.filter((f) => !activeFams.has(f.id));

  const fallback = moves.slice(0, 4).map((s) => s.title).join(" · ");

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-6xl px-4 pb-16 font-editorial-body">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-editorial-rule py-3 text-sm sm:grid-cols-[1fr_auto_1fr]">
          <Link to="/" search={{ date: shiftDate(date, -1) }} className="hover:underline">← วันก่อน</Link>
          <span className="col-span-2 row-start-2 text-center font-semibold sm:col-span-1 sm:row-start-auto">วันนี้ · {thaiDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          {date < today ? (
            <Link to="/" search={shiftDate(date, 1) === today ? {} : { date: shiftDate(date, 1) }} className="text-right hover:underline">วันถัดไป →</Link>
          ) : (
            <span className="text-right text-muted-foreground">ล่าสุด</span>
          )}
        </div>

        <section className="grid gap-8 border-b border-editorial-rule py-8 md:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-editorial-red">สรุปประจำวัน</p>
            <h1 className="mt-2 font-editorial text-4xl leading-tight text-editorial-ink sm:text-5xl">Thailand Daily Signals</h1>
            <p className="mt-4 font-editorial-body text-xl font-medium leading-relaxed sm:text-2xl">
              {data.brief?.body ?? (data.signals.length ? fallback : "ยังไม่มีข้อมูลที่ตรวจสอบได้เปลี่ยนเกินเกณฑ์ในวันนี้")}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {data.brief ? (data.brief.published_at ? "สรุปฉบับเช้า · บทนำเรียบเรียงโดย AI จากข้อมูลในฉบับ" : "สรุประหว่างวัน · บทนำเรียบเรียงโดย AI จากข้อมูลในฉบับ") : "กำลังเตรียมสรุป"} · ขณะนี้พบ {data.signals.length} สัญญาณ จาก {data.families.length} กลุ่มข้อมูล
            </p>
            {data.brief?.published_at && data.signals.length !== (Array.isArray(data.brief.items) ? data.brief.items.length : 0) && <p className="mt-2 text-sm text-muted-foreground">สัญญาณปัจจุบันอาจต่างจากฉบับเช้าที่ปิดรับข้อมูลแล้ว ดูรายการล่าสุดด้านล่าง</p>}
            {Array.isArray(data.brief?.items) && data.brief!.items.length > 0 && (
              <div className="mt-6">
                <BriefItems items={(data.brief!.items as BriefItem[]).slice(0, 4)} />
                <Link to="/brief/$date" params={{ date }} className="mt-4 inline-block text-sm underline">อ่าน Daily Brief ฉบับเต็ม →</Link>
              </div>
            )}
            {date === today && <div className="mt-6"><BkkForecast /></div>}
            <Link to="/day/$date" params={{ date }} className="mt-3 inline-block text-sm underline">อันดับสัญญาณวันนี้ เทียบเมื่อวาน →</Link>
          </div>
          <aside className="border-l border-editorial-rule pl-6 max-md:border-l-0 max-md:border-t max-md:pl-0 max-md:pt-6">
            <h2 className="font-editorial text-2xl text-editorial-red">กำลังจะมา</h2>
            <UpcomingDates today={today} releases={data.calendar.map((c) => ({ k: `r${c.id}`, d: c.release_date, t: `${fam.get(c.family_id)?.emoji ?? ""} ${c.title}` }))} />
            <Link to="/calendar" className="mt-3 inline-block text-sm underline">วันหยุดและกำหนดภาษีทั้งหมด →</Link>
          </aside>
        </section>

        {releases.length > 0 && (
          <section className="mb-10 bg-foreground p-5 text-background">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70">ประกาศใหม่วันนี้</p>
            <ul className="mt-2 space-y-1">
              {releases.map((s) => (
                <li key={s.id} className="flex flex-wrap items-baseline gap-x-3 font-editorial text-xl">
                  <Link to="/signals/$family" params={{ family: s.family_id }} className="hover:underline">
                    {fam.get(s.family_id)?.emoji} {s.title}
                  </Link>
                  {s.prev_value != null && (
                    <span className="text-sm opacity-70">ครั้งก่อน {fmt(s.prev_value, met.get(s.metric_id)!.decimals)}</span>
                  )}
                  {s.is_demo && <span className="text-[10px] uppercase opacity-60">ข้อมูลตัวอย่าง</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-9 border-t border-editorial-ink pt-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-editorial text-3xl text-editorial-red">สัญญาณวันนี้</h2>
            <Link to="/settings" className="text-xs text-muted-foreground hover:underline">
              ความไว: {{ low: "ต่ำสุด", medium: "ปานกลาง", high: "สูง" }[sens]}{hidden > 0 ? ` · ซ่อน ${hidden} เรื่องเล็ก` : ""} — ปรับ
            </Link>
          </div>
          {moves.length === 0 ? (
            <p className="text-muted-foreground">ยังไม่มีการเปลี่ยนแปลงจากข้อมูลที่ตรวจสอบได้ที่เกินเกณฑ์ ส่วนแหล่งที่ตรวจไม่ได้ต้องดูสถานะแยกต่างหาก</p>
          ) : (
            <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {moves.map((s) => (
                <SignalCard key={s.id} s={s} family={fam.get(s.family_id)!} metric={met.get(s.metric_id)!} history={hist(s.metric_id)} news={data.news} />
              ))}
            </div>
          )}
        </section>

        {date === today && <div className="mt-12"><SocialFeed limit={6} /></div>}

        {agencyNews.length > 0 && (
          <section className="mt-12 border-t border-editorial-ink pt-5">
            <div className="flex items-baseline gap-3 border-b border-editorial-rule pb-3">
              <h2 className="font-editorial text-2xl leading-snug text-editorial-red">ความเคลื่อนไหวจากหน่วยงานราชการ</h2>
              <span aria-hidden="true" className="hidden h-px flex-1 bg-editorial-rule sm:block" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">ข่าวจากหนังสือพิมพ์ที่กล่าวถึงหน่วยงานราชการ · ไม่ใช่ประกาศยืนยันจากหน่วยงานโดยตรง</p>
            <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
              {agencyNews.map((n) => (
                <li key={n.id} className="border-b border-editorial-rule py-4 text-sm leading-relaxed">
                  <span className="text-xs font-semibold text-editorial-red">{n.agency}</span>
                  <a href={n.link} target="_blank" rel="noreferrer" className="mt-1 block hover:underline">{n.title}</a>
                  <span className="mt-2 block text-xs text-muted-foreground">{n.source} · {new Date(n.published_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-12"><HouseholdBasket date={date} /></div>
        {date === today && <div className="mt-10"><LatestLottery /></div>}

        <section className="mt-14 border-t border-editorial-ink pt-4">
           <h2 className="font-editorial text-2xl text-editorial-red">หมวดที่ยังไม่มีสัญญาณ <span className="font-editorial-body text-sm font-normal text-muted-foreground">— แหล่งที่ตรวจไม่ได้ไม่ถือว่าไม่มีการเปลี่ยนแปลง</span></h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quiet.map((f) => {
              const m = data.metrics.find((x) => x.family_id === f.id);
              const h = m ? hist(m.id) : [];
              const last = h.at(-1);
              return (
                <Link key={f.id} to="/signals/$family" params={{ family: f.id }} className="flex items-center justify-between gap-2 border border-border p-3 text-sm hover:bg-card">
                  <div className="min-w-0">
                    <div className="truncate">{f.emoji} {f.name_th}</div>
                    <div className="truncate text-xs text-muted-foreground tabular-nums">
                       {m && last ? `${m.name_th} ${fmt(last.value, m.decimals)} ${m.unit}` : "ยังไม่มีค่าที่แสดงได้"}
                    </div>
                  </div>
                  {m && m.kind !== "release" && <Sparkline values={h.map((o) => Number(o.value))} className="text-muted-foreground" />}
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function UpcomingDates({ today, releases }: { today: string; releases: { k: string; d: string; t: string }[] }) {
  const { data } = useQuery(upcomingQuery(today));
  const rows = [
    ...releases,
    ...(data?.holidays ?? []).map((h) => ({ k: `h${h.id}`, d: h.holiday_date, t: `🗓️ ${h.name} (วันหยุด${h.kind})` })),
    ...(data?.tax ?? []).map((t) => ({ k: `t${t.id}`, d: t.due_date, t: `🧾 ${t.items[0]}${t.items.length > 1 ? ` +${t.items.length - 1}` : ""}${t.channel.includes("อินเทอร์เน็ต") ? " (ออนไลน์)" : ""}` })),
  ].sort((a, b) => a.d.localeCompare(b.d)).slice(0, 8);
  if (!rows.length) return null;
  return (
    <ul className="mt-3 space-y-3 text-sm">
      {rows.map((r) => (
        <li key={r.k} className="flex gap-3">
          <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{thaiDate(r.d, { day: "numeric", month: "short" })}</span>
          <span>{r.t}</span>
        </li>
      ))}
    </ul>
  );
}
