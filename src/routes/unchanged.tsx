import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Masthead } from "@/components/masthead";

type Row = { id: string; name: string; unit: string; decimals: number; family: string; source: string; value: number | null; since: string | null; effective: string | null; days: number | null; checked: string | null; latest: string | null; status: "same" | "stale" | "none" };

const bkkToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400e3);

const unchangedQuery = queryOptions({
  queryKey: ["unchanged"],
  queryFn: async (): Promise<Row[]> => {
    const since = new Date(Date.now() - 180 * 86400e3).toISOString().slice(0, 10);
    const [m, f, o] = await Promise.all([
      supabase.from("metrics").select("id,family_id,name_th,unit,decimals,kind,late_window_days,lag_days").neq("kind", "release"),
      supabase.from("families").select("id,name_th,source_name"),
      supabase.from("observations").select("metric_id,observed_on,value,effective_from,received_at").eq("is_demo", false).gte("observed_on", since).order("observed_on", { ascending: false }).limit(10000),
    ]);
    if (m.error) throw m.error;
    const fam = new Map((f.data ?? []).map((x) => [x.id, x]));
    const by = new Map<string, NonNullable<typeof o.data>>();
    for (const r of o.data ?? []) { const a = by.get(r.metric_id) ?? []; a.push(r); by.set(r.metric_id, a); }
    const today = bkkToday();
    const rows: Row[] = [];
    for (const x of m.data ?? []) {
      const obs = by.get(x.id) ?? [];
      const ff = fam.get(x.family_id);
      const base = { id: x.id, name: x.name_th, unit: x.unit, decimals: x.decimals, family: ff?.name_th ?? x.family_id, source: ff?.source_name ?? "" };
      if (!obs.length) { rows.push({ ...base, value: null, since: null, effective: null, days: null, checked: null, latest: null, status: "none" }); continue; }
      const latest = obs[0]!;
      // first day of the current unbroken run of the same value
      let first = latest;
      for (const r of obs) { if (Number(r.value) !== Number(latest.value)) break; first = r; }
      const changed = obs.some((r) => Number(r.value) !== Number(latest.value));
      const sinceDay = latest.effective_from && latest.effective_from < first.observed_on ? latest.effective_from : changed ? first.observed_on : (latest.effective_from ?? first.observed_on);
      const checked = obs.reduce((a, r) => (r.received_at > a ? r.received_at : a), latest.received_at);
      const staleAfter = Math.max(2, (x.lag_days ?? 0) + 1, x.late_window_days ?? 0);
      const status: Row["status"] = dayDiff(latest.observed_on, today) > staleAfter ? "stale" : "same";
      if (status === "same" && obs.length < 2 && !(latest.effective_from && latest.effective_from < latest.observed_on)) continue; // nothing to compare and no source effective date
      if (status === "same" && dayDiff(sinceDay, today) < 7) continue; // moved within the last week → not "unchanged"
      rows.push({ ...base, value: Number(latest.value), since: sinceDay, effective: latest.effective_from && latest.effective_from < latest.observed_on ? latest.effective_from : null, days: dayDiff(sinceDay, today), checked, latest: latest.observed_on, status });
    }
    return rows.sort((a, b) => (b.days ?? -1) - (a.days ?? -1));
  },
});

export const Route = createFileRoute("/unchanged")({
  head: () => ({
    meta: [
      { title: "ข้อมูลที่ยังไม่เปลี่ยน — Thailand Daily Signals" },
      { name: "description", content: "ติดตามตัวเลขที่ยังนิ่ง เช่น ราคาก๊าซหุงต้ม ว่านิ่งมากี่วัน ตรวจล่าสุดเมื่อไร และแยกจากแหล่งที่ไม่อัปเดต" },
      { property: "og:title", content: "ข้อมูลที่ยังไม่เปลี่ยน — Thailand Daily Signals" },
      { property: "og:description", content: "ตัวเลขที่ตรวจแล้วยังไม่เปลี่ยน แยกจากแหล่งที่ไม่อัปเดตหรือตรวจไม่ได้" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(unchangedQuery),
  component: Unchanged,
});

const thD = (d: string | null) => (d ? new Date(`${d}T00:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" }) : "—");
const thT = (s: string | null) => (s ? new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

const GROUPS: [Row["status"], string, string][] = [
  ["same", "ตรวจแล้ว ค่าไม่เปลี่ยน", "แหล่งยังส่งข้อมูลตามรอบ แต่ตัวเลขเท่าเดิมมาอย่างน้อย 7 วัน"],
  ["stale", "แหล่งไม่อัปเดต (ข้อมูลเก่า)", "ไม่มีค่าใหม่เกินรอบปกติของแหล่ง — ไม่ได้แปลว่าไม่เปลี่ยน"],
  ["none", "ตรวจไม่ได้", "ยังไม่มีค่าจริงใน 180 วันล่าสุด"],
];

function Unchanged() {
  const { data } = useSuspenseQuery(unchangedQuery);
  return (
    <div className="page-shell">
      <Masthead />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="section-heading text-4xl">ข้อมูลที่ยังไม่เปลี่ยน</h1>
        <p className="mt-2 text-sm text-muted-foreground">ตัวเลขที่ไม่ขึ้นการ์ดในหน้า "วันนี้" เพราะไม่เปลี่ยน — ดูได้ว่านิ่งมานานเท่าไร และตรวจล่าสุดเมื่อไร เรียงจากนิ่งนานที่สุด</p>
        {GROUPS.map(([st, title, note]) => {
          const rows = data.filter((r) => r.status === st);
          if (!rows.length) return null;
          return (
            <section key={st} className="mt-10">
              <div className="flex items-baseline gap-3 border-t-2 border-editorial-ink pt-3">
                <h2 className="font-editorial text-2xl text-editorial-red">{title}</h2>
                <span className="text-sm text-muted-foreground">({rows.length})</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{note}</p>
              <ul className="mt-3 divide-y divide-editorial-rule">
                {rows.map((r) => (
                  <li key={r.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-baseline sm:gap-6">
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.family}{r.source && ` · ${r.source}`}</div>
                    </div>
                    <div className="font-editorial text-2xl">{r.value === null ? "—" : r.value.toLocaleString("th-TH", { maximumFractionDigits: r.decimals })} <span className="font-editorial-body text-xs text-muted-foreground">{r.value !== null && r.unit}</span></div>
                    <div className="text-xs text-muted-foreground sm:text-right">
                      {r.status === "same" && <div className="font-semibold text-foreground">นิ่งมา {r.days?.toLocaleString("th-TH")} วัน</div>}
                      {r.status === "stale" && <div className="font-semibold text-destructive">ค่าล่าสุด {thD(r.latest)}</div>}
                      {r.status !== "none" && <>
                        <div>{r.effective ? `มีผลตั้งแต่ ${thD(r.effective)} (ตามแหล่ง)` : `ค่าเท่านี้ตั้งแต่ ${thD(r.since)}`}</div>
                        <div>ตรวจล่าสุด {thT(r.checked)}</div>
                      </>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {!data.length && <p className="mt-8 text-muted-foreground">ทุกตัวเลขมีการเปลี่ยนแปลงภายใน 7 วันล่าสุด</p>}
        <p className="mt-10 text-sm"><Link to="/" className="underline">← กลับหน้าวันนี้</Link></p>
      </main>
    </div>
  );
}
