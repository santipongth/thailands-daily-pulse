import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { HouseholdBasket } from "@/components/household-basket";
import { householdImpact } from "@/lib/impact";
import { bkkToday, fmt, shiftDate, thaiDate, type Family, type Metric, type Signal } from "@/lib/signals";

const compareQuery = (date: string) =>
  queryOptions({
    queryKey: ["day-compare", date],
    queryFn: async () => {
      const prev = shiftDate(date, -1);
      const [s, f, m] = await Promise.all([
        supabase.from("signals").select("*").in("signal_date", [date, prev]),
        supabase.from("families").select("*"),
        supabase.from("metrics").select("*"),
      ]);
      const err = s.error || f.error || m.error;
      if (err) throw err;
      return { prev, signals: s.data as Signal[], families: f.data as Family[], metrics: m.data as Metric[] };
    },
  });

export const Route = createFileRoute("/day/$date")({
  staticData: { sitemap: false },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(compareQuery(params.date)),
  head: ({ params }) => ({
    meta: [
      { title: `สัญญาณวันที่ ${params.date} เทียบวันก่อน — Thailand Daily Signals` },
      { name: "description", content: "ดูว่าสัญญาณไหนเกิดใหม่ หายไป หรือยังต่อเนื่อง เมื่อเทียบกับวันก่อนหน้า" },
      { property: "og:title", content: `สัญญาณวันที่ ${params.date} — Thailand Daily Signals` },
      { property: "og:description", content: "เปรียบเทียบสัญญาณรายวัน: ใหม่ / หายไป / ต่อเนื่อง" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DayCompare,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-8">ไม่พบวันที่นี้</div>,
});

function DayCompare() {
  const { date } = Route.useParams();
  const { data } = useSuspenseQuery(compareQuery(date));
  const fam = new Map(data.families.map((f) => [f.id, f]));
  const met = new Map(data.metrics.map((m) => [m.id, m]));
  const today = data.signals.filter((s) => s.signal_date === date);
  const before = data.signals.filter((s) => s.signal_date === data.prev);
  const prevBy = new Map(before.map((s) => [s.metric_id, s]));
  const todayIds = new Set(today.map((s) => s.metric_id));
  const fresh = today.filter((s) => !prevBy.has(s.metric_id));
  const cont = today.filter((s) => prevBy.has(s.metric_id));
  const ended = before.filter((s) => !todayIds.has(s.metric_id));

  const sc = (s: Signal) => Number(s.score ?? 0);
  const ranked = [...today].sort((a, b) => sc(b) - sc(a));
  const prevRanked = [...before].sort((a, b) => sc(b) - sc(a));
  const prevRank = new Map(prevRanked.map((s, i) => [s.metric_id, i + 1]));
  const maxScore = Math.max(1, ...ranked.map(sc));
  const sevTh: Record<string, string> = { high: "สูง", medium: "กลาง", low: "ต่ำ" };
  const v = (s: Signal, x: number | null) => (x == null ? "—" : `${fmt(Number(x), met.get(s.metric_id)?.decimals ?? 2)} ${met.get(s.metric_id)?.unit ?? ""}`);

  const Group = ({ title, list, note, showPrev }: { title: string; list: Signal[]; note: string; showPrev?: boolean }) => (
    <section className="mt-8">
      <h2 className="border-b-2 border-foreground pb-1 font-display text-2xl">{title} <span className="text-base font-normal text-muted-foreground">({list.length})</span></h2>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      {list.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">ไม่มี</p> : (
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="py-1">สัญญาณ</th><th>ก่อน</th><th>หลัง</th>{showPrev && <th>เมื่อวาน</th>}<th>ประเภท</th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-b border-border align-top">
                <td className="py-1.5 pr-2"><Link to="/signals/$family" params={{ family: s.family_id }} className="hover:underline">{fam.get(s.family_id)?.emoji} {s.title}</Link></td>
                <td className="tabular-nums">{v(s, s.prev_value)}</td>
                <td className="tabular-nums font-semibold">{v(s, s.new_value)}</td>
                {showPrev && <td className="text-muted-foreground">{prevBy.get(s.metric_id)?.title}</td>}
                <td>{s.is_demo ? <span className="text-muted-foreground">ตัวอย่าง</span> : <span className="font-semibold text-primary">จริง</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between border-b border-foreground py-2 text-sm">
          <Link to="/day/$date" params={{ date: shiftDate(date, -1) }} className="hover:underline">← วันก่อน</Link>
          <span className="font-semibold">{thaiDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          {date < bkkToday() ? <Link to="/day/$date" params={{ date: shiftDate(date, 1) }} className="hover:underline">วันถัดไป →</Link> : <span className="text-muted-foreground">ล่าสุด</span>}
        </div>
        <h1 className="mt-6 font-display text-4xl">สัญญาณรายวัน เทียบกับ {thaiDate(data.prev, { day: "numeric", month: "short" })}</h1>
        <p className="mt-2 text-muted-foreground">วันนี้ {today.length} สัญญาณ · เมื่อวาน {before.length} สัญญาณ</p>
        <section className="mt-8">
          <h2 className="border-b-2 border-foreground pb-1 font-display text-2xl">อันดับสัญญาณวันนี้</h2>
          <p className="mt-1 text-xs text-muted-foreground">คะแนน = น้ำหนักความรุนแรง × ตัวคูณความแรง (z ÷ vol_k, 1–2) × ความน่าเชื่อถือแหล่ง × ผลต่อครัวเรือน · <Link to="/method" className="underline">ดูวิธีคำนวณ</Link></p>
          {ranked.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">ไม่มีสิ่งใดเปลี่ยนเกินเกณฑ์</p> : (
            <ol className="mt-3 space-y-3">
              {ranked.map((s, i) => {
                const k = s.checks?.score ?? {};
                const pr = prevRank.get(s.metric_id);
                const move = pr == null ? <span className="text-primary">ใหม่</span> : pr > i + 1 ? <span className="text-primary">▲ {pr - (i + 1)}</span> : pr < i + 1 ? <span className="text-destructive">▼ {i + 1 - pr}</span> : <span className="text-muted-foreground">= คงที่</span>;
                const imp = householdImpact(s);
                return (
                  <li key={s.id} className="grid grid-cols-[3rem_1fr] gap-3 border-b border-border pb-3">
                    <div className="font-display text-3xl tabular-nums">{i + 1}</div>
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link to="/signals/$family" params={{ family: s.family_id }} className="font-semibold hover:underline">{fam.get(s.family_id)?.emoji} {s.title}</Link>
                        <span className="text-xs">{move} {pr != null && <span className="text-muted-foreground">(เมื่อวานอันดับ {pr})</span>}</span>
                      </div>
                      <div className="mt-1 h-2 bg-muted"><div className="h-2 bg-primary" style={{ width: `${(sc(s) / maxScore) * 100}%` }} /></div>
                      <div className="mt-1 text-xs tabular-nums text-muted-foreground">
                        คะแนน <b className="text-foreground">{sc(s).toFixed(2)}</b> = ความรุนแรง {sevTh[s.severity] ?? s.severity} {k.severity_weight ?? "—"} × ความแรง {k.z_factor != null ? Number(k.z_factor).toFixed(2) : "—"} × แหล่ง {k.trust_factor ?? "—"} × ครัวเรือน {k.reach ?? "—"} × ไฟล์ดิบ {k.evidence_factor ?? "—"}{k.demo_zeroed ? " (ตัวอย่าง → 0)" : ""}
                        {" · "}ก่อน {v(s, s.prev_value)} → หลัง {v(s, s.new_value)}{s.change_pct != null ? ` (${Number(s.change_pct) > 0 ? "+" : ""}${Number(s.change_pct).toFixed(1)}%)` : ""}
                      </div>
                      {imp && <div className="mt-1 text-sm">🏠 {imp}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <div className="mt-8"><HouseholdBasket date={date} /></div>
        <Group title="เกิดใหม่วันนี้" list={fresh} note="ไม่มีในวันก่อนหน้า — นี่คือสิ่งที่เปลี่ยนชัดเจนจริงวันนี้" />
        <Group title="ยังต่อเนื่อง" list={cont} note="เกิดทั้งเมื่อวานและวันนี้" showPrev />
        <Group title="หายไปจากเมื่อวาน" list={ended} note="เมื่อวานเป็นสัญญาณ แต่วันนี้ไม่เกินเกณฑ์แล้ว" />
      </main>
    </div>
  );
}
