import { createFileRoute, Link } from "@tanstack/react-router";
import { SOURCES } from "@/lib/sources";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { evidenceUrl } from "@/lib/signals.functions";
import { fmt, thaiDate, type Family, type Metric, type News } from "@/lib/signals";

type Row = { metric_id: string; observed_on: string; value: number; is_demo: boolean; created_at: string };

const rawQuery = queryOptions({
  queryKey: ["raw-data"],
  queryFn: async () => {
    const [f, m, o, n, r] = await Promise.all([
      supabase.from("families").select("*").order("sort"),
      supabase.from("metrics").select("*").order("sort"),
      supabase.from("observations").select("metric_id,observed_on,value,is_demo,created_at").order("observed_on", { ascending: false }).limit(1000),
      supabase.from("news_items").select("*").order("published_at", { ascending: false }).limit(60),
      supabase.from("source_runs").select("*").order("source"),
    ]);
    const [j, ev] = await Promise.all([
      supabase.from("ingest_jobs").select("id,source,job_type,run_kind,status,attempts,max_attempts,rows,error,created_at,finished_at,run_after").order("id", { ascending: false }).limit(30),
      supabase.from("raw_evidence").select("id,source,url,http_status,content_type,bytes,sha256,fetched_at").order("id", { ascending: false }).limit(60),
    ]);
    const err = f.error || m.error || o.error || n.error || r.error;
    if (err) throw err;
    return { families: f.data as Family[], metrics: m.data as Metric[], obs: o.data as Row[], news: n.data as News[], runs: (r.data ?? []) as { source: string; ran_at: string; ok: boolean; rows: number; error: string | null; run_kind?: string }[], jobs: (j.data ?? []) as any[], evidence: (ev.data ?? []) as any[] };
  },
});

export const Route = createFileRoute("/data")({
  staticData: { sitemap: true },
  loader: ({ context }) => context.queryClient.ensureQueryData(rawQuery),
  head: () => ({
    meta: [
      { title: "ข้อมูลดิบรายวัน — Thailand Daily Signals" },
      { name: "description", content: "ข้อมูลที่เข้ามาจริงจากหน่วยงานและสื่อ ก่อนผ่านเกณฑ์ตัดเป็นสัญญาณ" },
      { property: "og:title", content: "ข้อมูลดิบรายวัน — Thailand Daily Signals" },
      { property: "og:description", content: "ดูค่าล่าสุดของทุกตัวชี้วัดและข่าวหน่วยงานที่เข้ามาในระบบ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DataPage,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
});

function DataPage() {
  const { data } = useSuspenseQuery(rawQuery);
  const byMetric = new Map<string, Row[]>();
  for (const r of data.obs) {
    const a = byMetric.get(r.metric_id) ?? [];
    if (a.length < 2) a.push(r);
    byMetric.set(r.metric_id, a);
  }
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-4xl">ข้อมูลดิบรายวัน</h1>
        <p className="mt-2 text-muted-foreground">ค่าที่เข้ามาจริงทุกตัว ก่อนเทียบเกณฑ์ — ค่าที่ไม่ผ่านเกณฑ์จะไม่กลายเป็นสัญญาณ</p>
        <section className="mt-6">
          <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">สถานะการดึงข้อมูลแต่ละแหล่ง</h2>
          <table className="mt-2 w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1">แหล่ง</th><th>สถานะ</th><th>ค่าที่ได้</th><th>รอบ</th><th>ดึงล่าสุด</th></tr></thead>
            <tbody>
              {data.runs.length === 0 && <tr><td colSpan={4} className="py-2 text-muted-foreground">ยังไม่มีการดึงข้อมูลรอบใหม่</td></tr>}
              {data.runs.map((r) => (
                <tr key={r.source} className="border-b border-border">
                  <td className="py-1">{r.source}</td>
                  <td>{r.ok ? <span className="font-semibold text-primary">สำเร็จ</span> : <span className="text-destructive" title={r.error ?? ""}>ล้มเหลว</span>}</td>
                  <td>{r.rows}</td>
                  <td>{({ hourly: "รายชั่วโมง", daily: "รายวัน 05:30", manual: "สั่งดึง/เวลาที่ตั้งเอง" } as Record<string, string>)[r.run_kind ?? ""] ?? r.run_kind}</td>
                  <td>{new Date(r.ran_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <DailyArrival obs={data.obs} />
        <section className="mt-6">
          <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">คิวงานดึงข้อมูล (1 งานต่อ 1 แหล่ง)</h2>
          <p className="mt-1 text-xs text-muted-foreground">แต่ละแหล่งเป็นงานแยกกัน ถ้าล้มเหลวจะลองใหม่อัตโนมัติสูงสุด 3 ครั้ง (เว้น 20 / 40 นาที)</p>
          <table className="mt-2 w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1">งาน</th><th>สถานะ</th><th>ครั้งที่</th><th>ค่าที่ได้</th><th>เวลา</th></tr></thead>
            <tbody>
              {data.jobs.length === 0 && <tr><td colSpan={5} className="py-2 text-muted-foreground">ยังไม่มีงานในคิว</td></tr>}
              {data.jobs.map((j) => (
                <tr key={j.id} className="border-b border-border">
                  <td className="py-1">{j.source}</td>
                  <td title={j.error ?? ""}>{({ queued: "รอคิว", running: "กำลังทำ", done: "สำเร็จ", failed: "ล้มเหลว" } as Record<string, string>)[j.status] ?? j.status}{j.status === "queued" && j.attempts > 0 ? ` (ลองใหม่ ${new Date(j.run_after).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })})` : ""}</td>
                  <td>{j.attempts}/{j.max_attempts}</td>
                  <td>{j.rows}</td>
                  <td>{new Date(j.finished_at ?? j.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="mt-6">
          <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">หลักฐานดิบ (ไฟล์ต้นฉบับที่ดึงมา) <Link to="/evidence" className="text-sm font-normal underline">ดูทั้งหมดและเทียบไฟล์ก่อนหน้า →</Link></h2>
          <p className="mt-1 text-xs text-muted-foreground">เก็บไฟล์ต้นฉบับทุกครั้งที่ดึงไว้ถาวร พร้อมรหัส SHA-256 เพื่อพิสูจน์ว่าข้อมูลที่เห็นมาจากแหล่งจริง ไฟล์ที่เนื้อหาเหมือนเดิมเก็บครั้งเดียว</p>
          <table className="mt-2 w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1">แหล่ง</th><th>URL</th><th>ขนาด</th><th>SHA-256</th><th>ดึงเมื่อ</th><th></th></tr></thead>
            <tbody>
              {data.evidence.length === 0 && <tr><td colSpan={6} className="py-2 text-muted-foreground">ยังไม่มีหลักฐาน — จะเริ่มเก็บในรอบดึงข้อมูลถัดไป</td></tr>}
              {data.evidence.map((e) => (
                <tr key={e.id} className="border-b border-border align-top">
                  <td className="py-1 pr-2">{e.source}</td>
                  <td className="max-w-xs truncate pr-2 text-xs" title={e.url}>{e.url}</td>
                  <td className="whitespace-nowrap">{(e.bytes / 1024).toFixed(1)} KB</td>
                  <td className="font-mono text-xs">{e.sha256.slice(0, 12)}…</td>
                  <td className="whitespace-nowrap">{new Date(e.fetched_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}</td>
                  <td><button type="button" className="underline" onClick={async () => { const w = window.open("", "_blank"); try { const r = await evidenceUrl({ data: { id: e.id } }); if (w) w.location.href = r.url; } catch { w?.close(); } }}>เปิดไฟล์</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {data.families.map((f) => {
          const ms = data.metrics.filter((m) => m.family_id === f.id);
          if (!ms.length) return null;
          return (
            <section key={f.id} className="mt-8">
              <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">{f.emoji} {f.name_th} <span className="text-sm font-normal text-muted-foreground">· {f.source_name}</span></h2>
              <table className="mt-2 w-full text-sm">
                <thead><tr className="text-left text-muted-foreground"><th className="py-1">ตัวชี้วัด</th><th>ค่าล่าสุด</th><th>ก่อนหน้า</th><th>เปลี่ยน</th><th>วันที่ข้อมูล</th><th>บันทึกเมื่อ</th><th>ประเภท</th></tr></thead>
                <tbody>
                  {ms.map((m) => {
                    const [cur, prev] = byMetric.get(m.id) ?? [];
                    return (
                      <tr key={m.id} className="border-b border-border">
                        <td className="py-1">{m.name_th}</td>
                        <td className="font-semibold">{cur ? `${fmt(cur.value, m.decimals)} ${m.unit}` : "—"}</td>
                        <td>{prev ? `${fmt(prev.value, m.decimals)} (${thaiDate(prev.observed_on, { day: "numeric", month: "short" })})` : "—"}</td>
                        <td className="tabular-nums">{cur && prev ? (() => { const d = cur.value - prev.value; return d === 0 ? "ไม่เปลี่ยน" : `${d > 0 ? "+" : ""}${fmt(d, m.decimals)}`; })() : "—"}</td>
                        <td>{cur ? thaiDate(cur.observed_on, { dateStyle: "medium" }) : "—"}</td>
                        <td>{cur ? new Date(cur.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                        <td>{cur ? (cur.is_demo ? <span className="text-muted-foreground">ตัวอย่าง</span> : <span className="font-semibold text-primary">จริง</span>) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
        <section className="mt-10">
          <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">ข่าวหน่วยงานที่เข้ามาล่าสุด</h2>
          <ul className="mt-2 divide-y divide-border text-sm">
            {data.news.map((n) => (
              <li key={n.id} className="py-2">
                <a href={n.link} target="_blank" rel="noreferrer" className="hover:underline">{n.title}</a>
                <div className="text-xs text-muted-foreground">{n.source} · {n.agency ?? "—"} · {new Date(n.published_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

const TRACKED = ["CheckRaka (ราคาอาหาร)", "RakaKaset (ราคาเกษตร)", "Longdo Traffic Index"];
function DailyArrival({ obs }: { obs: Row[] }) {
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() + 7 * 3600e3 - i * 86400e3).toISOString().slice(0, 10)).reverse();
  return (
    <section className="mt-6">
      <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">ข้อมูลรายวัน 7 วันล่าสุด</h2>
      <p className="mt-1 text-xs text-muted-foreground">✓ = มีค่าจริงเข้ามาในวันนั้น (จำนวนตัวชี้วัด) · — = ไม่มีค่า</p>
      <table className="mt-2 w-full text-sm">
        <thead><tr className="text-left text-muted-foreground"><th className="py-1">แหล่ง</th>{days.map((d) => <th key={d}>{d.slice(8)}/{d.slice(5, 7)}</th>)}</tr></thead>
        <tbody>
          {TRACKED.map((name) => {
            const ms = new Set(SOURCES.find((s) => s.source === name)?.metrics ?? []);
            return (
              <tr key={name} className="border-b border-border">
                <td className="py-1">{name}</td>
                {days.map((d) => {
                  const n = new Set(obs.filter((o) => !o.is_demo && o.observed_on === d && ms.has(o.metric_id)).map((o) => o.metric_id)).size;
                  return <td key={d} className={n ? "font-semibold text-primary" : "text-muted-foreground"}>{n ? `✓ ${n}` : "—"}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
