import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { z } from "zod";
import { Masthead } from "@/components/masthead";
import { DataBadge, SignalCard, Sparkline } from "@/components/signals-ui";
import { bkkToday, dayQuery, fmt, shiftDate, thaiDate } from "@/lib/signals";
import { refreshData } from "@/lib/signals.functions";
import { SENS_SEVERITIES } from "@/lib/signals";
import { useSensitivity } from "@/hooks/use-sensitivity";
import { useSourcePrefs, readIntervalHours } from "@/hooks/use-source-prefs";
import { SOURCES } from "@/lib/sources";
import { GovAlert } from "@/components/gov-alert";
import { BriefItems, type BriefItem } from "@/components/brief-items";

export const Route = createFileRoute("/")({
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
      if (r.refreshed) {
        qc.invalidateQueries({ queryKey: ["day", date] });
        router.invalidate();
      }
    });
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
      <main className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-center justify-between border-b border-foreground py-2 text-sm">
          <Link to="/" search={{ date: shiftDate(date, -1) }} className="hover:underline">← วันก่อน</Link>
          <span className="font-semibold">🇹🇭 Thailand Today — {thaiDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          {date < today ? (
            <Link to="/" search={shiftDate(date, 1) === today ? {} : { date: shiftDate(date, 1) }} className="hover:underline">วันถัดไป →</Link>
          ) : (
            <span className="text-muted-foreground">ล่าสุด</span>
          )}
        </div>

        {date === today && <GovAlert date={date} />}
        <div className="mt-3 text-right text-xs"><Link to="/day/$date" params={{ date }} className="underline">เทียบสัญญาณกับวันก่อน →</Link></div>
        <section className="grid gap-8 py-8 md:grid-cols-[2fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-up">สรุปวันนี้</p>
            <p className="mt-3 font-display text-2xl leading-relaxed sm:text-3xl">
              {data.brief?.body ?? (data.signals.length ? fallback : "วันนี้ยังไม่มีอะไรเปลี่ยนแปลงอย่างมีนัยสำคัญ")}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {data.brief ? (data.brief.published_at ? "Daily Brief ฉบับ 06:00 · บทนำเรียบเรียงโดย AI จากข้อมูลจริงเท่านั้น" : "ฉบับระหว่างวัน · บทนำเรียบเรียงโดย AI จากข้อมูลจริงเท่านั้น") : "กำลังเตรียมสรุป…"} · ตรวจพบ {data.signals.length} สัญญาณ จาก {data.families.length} กลุ่มข้อมูล
            </p>
            {Array.isArray(data.brief?.items) && data.brief!.items.length > 0 && (
              <div className="mt-6">
                <BriefItems items={(data.brief!.items as BriefItem[]).slice(0, 4)} />
                <Link to="/brief/$date" params={{ date }} className="mt-4 inline-block text-sm underline">อ่าน Daily Brief ฉบับเต็ม →</Link>
              </div>
            )}
          </div>
          <aside className="border-l border-foreground/30 pl-6 max-md:border-l-0 max-md:border-t max-md:pl-0 max-md:pt-6">
            <h2 className="font-display text-lg">กำลังจะมา</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {data.calendar.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{thaiDate(c.release_date, { day: "numeric", month: "short" })}</span>
                  <span>{fam.get(c.family_id)?.emoji} {c.title}</span>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        {releases.length > 0 && (
          <section className="mb-10 bg-foreground p-5 text-background">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70">ประกาศใหม่วันนี้</p>
            <ul className="mt-2 space-y-1">
              {releases.map((s) => (
                <li key={s.id} className="flex flex-wrap items-baseline gap-x-3 font-display text-xl">
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

        <section>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">สัญญาณวันนี้</h2>
            <Link to="/settings" className="text-xs text-muted-foreground hover:underline">
              ความไว: {{ low: "ต่ำสุด", medium: "ปานกลาง", high: "สูง" }[sens]}{hidden > 0 ? ` · ซ่อน ${hidden} เรื่องเล็ก` : ""} — ปรับ
            </Link>
          </div>
          {moves.length === 0 ? (
            <p className="text-muted-foreground">ไม่มีการเปลี่ยนแปลงที่เกินเกณฑ์ — No change, no signal.</p>
          ) : (
            <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {moves.map((s) => (
                <SignalCard key={s.id} s={s} family={fam.get(s.family_id)!} metric={met.get(s.metric_id)!} history={hist(s.metric_id)} news={data.news} />
              ))}
            </div>
          )}
        </section>

        {agencyNews.length > 0 && (
          <section className="mt-14 border-t border-foreground pt-4">
            <h2 className="font-display text-lg">ความเคลื่อนไหวจากหน่วยงานราชการ <span className="text-sm font-normal text-muted-foreground">— จาก RSS หนังสือพิมพ์</span></h2>
            <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {agencyNews.map((n) => (
                <li key={n.id} className="border-b border-border pb-3 text-sm">
                  <span className="text-xs font-semibold text-up">{n.agency}</span>
                  <a href={n.link} target="_blank" rel="noreferrer" className="mt-0.5 block hover:underline">{n.title}</a>
                  <span className="text-xs text-muted-foreground">{n.source} · {new Date(n.published_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-14 border-t border-foreground pt-4">
          <h2 className="font-display text-lg">เงียบวันนี้ <span className="text-sm font-normal text-muted-foreground">— ไม่มีอะไรเปลี่ยนอย่างมีนัยสำคัญ</span></h2>
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
                      {m && last ? `${m.name_th} ${fmt(last.value, m.decimals)} ${m.unit}` : "ไม่มีข้อมูลใหม่"}
                    </div>
                  </div>
                  {m && m.kind !== "release" && <Sparkline values={h.map((o) => Number(o.value))} className="text-muted-foreground" />}
                </Link>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <DataBadge demo={false} /> ดึงจากแหล่งจริงอัตโนมัติ
            <DataBadge demo /> ใช้ข้อมูลตัวอย่างระหว่างเชื่อมต่อแหล่งข้อมูลราชการ
          </div>
        </section>
      </main>
    </div>
  );
}
