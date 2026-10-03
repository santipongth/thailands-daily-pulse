import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { evidenceUrl } from "@/lib/signals.functions";
import { SourcePerformance } from "@/components/source-performance";
import { CostSignalCalc } from "@/components/cost-signal-calc";

export const Route = createFileRoute("/_admin/raw-log")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "บันทึกข้อมูลดิบจากแหล่งภายนอก — Thailand Daily Signals" },
      { name: "description", content: "ทุกครั้งที่ระบบดึงข้อมูลจากกรมอุตุฯ กรมชลฯ ThaiWater และแหล่งอื่น: มาจากไหน เมื่อไร และอ่านค่าอะไรได้" },
      { property: "og:title", content: "บันทึกข้อมูลดิบ — Thailand Daily Signals" },
      { property: "og:description", content: "ที่มาและเวลาของข้อมูลดิบทุกไฟล์ที่ระบบดึงมา" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RawLog,
});

const CATS: { v: string; label: string; re: RegExp }[] = [
  { v: "weather", label: "อากาศ / แผ่นดินไหว", re: /กรมอุตุ|TMD/ },
  { v: "water", label: "น้ำ / เขื่อน", re: /ThaiWater \(|RID|ชลประทาน/ },
  { v: "flood", label: "น้ำท่วม / น้ำท้องถิ่น", re: /ThaiWater สถานี|กทม\.|ปภ\./ },
  { v: "air", label: "ฝุ่น PM2.5", re: /GISTDA|Air4Thai/ },
  { v: "rail", label: "รถไฟฟ้า", re: /รถไฟฟ้า|BTS|MRT/ },
  { v: "price", label: "ราคา", re: /PTT|ทองคำ|Exchange|CheckRaka|RakaKaset|น้ำมัน|กรมการค้า|การไฟฟ้า/ },
  { v: "traffic", label: "จราจร", re: /Longdo|FM91/ },
];
const PAGE = 50;
type Ev = { id: number; source: string; url: string; http_status: number | null; content_type: string | null; bytes: number; fetched_at: string; last_seen_at: string | null; seen_count: number };
const dt = (s: string) => new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "medium" });

function RawLog() {
  const [cat, setCat] = useState("");
  const [src, setSrc] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const { data: sources } = useQuery({
    queryKey: ["raw-log-sources"],
    queryFn: async () => [...new Set(((await supabase.from("source_runs").select("source")).data ?? []).map((r) => r.source))].sort(),
  });
  const shown = (sources ?? []).filter((s) => !cat || CATS.find((c) => c.v === cat)!.re.test(s));
  const { data, isFetching, error } = useQuery({
    queryKey: ["raw-log", cat, src, from, to, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from("raw_evidence").select("id,source,url,http_status,content_type,bytes,fetched_at,last_seen_at,seen_count").order("fetched_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE);
      if (src) q = q.eq("source", src);
      else if (cat) q = q.in("source", shown.length ? shown : ["-"]);
      if (from) q = q.gte("fetched_at", `${from}T00:00:00+07:00`);
      if (to) q = q.lte("fetched_at", `${to}T23:59:59+07:00`);
      const { data: ev, error: e } = await q;
      if (e) throw e;
      const rows = (ev ?? []) as Ev[];
      const ids = rows.map((r) => r.id);
      const { data: obs } = ids.length ? await supabase.from("observations").select("evidence_id,metric_id,value,observed_on,metrics(name_th,unit)").in("evidence_id", ids) : { data: [] };
      const vals = new Map<number, { label: string }[]>();
      for (const o of (obs ?? []) as any[]) vals.set(o.evidence_id, [...(vals.get(o.evidence_id) ?? []), { label: `${o.metrics?.name_th ?? o.metric_id} ${Number(o.value)} ${o.metrics?.unit ?? ""} (ข้อมูลวันที่ ${o.observed_on})` }]);
      return { rows: rows.slice(0, PAGE), more: rows.length > PAGE, vals };
    },
  });
  const reset = (f: () => void) => { f(); setPage(0); };
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="page-shell">
        <h1 className="font-editorial text-4xl sm:text-5xl">บันทึกข้อมูลดิบ</h1>
        <p className="mt-2 text-muted-foreground">ทุกครั้งที่ระบบดึงข้อมูลจากแหล่งภายนอก: มาจากที่อยู่ไหน ดึงเมื่อไร เห็นไฟล์เดิมซ้ำกี่ครั้ง และอ่านค่าอะไรได้จากไฟล์นั้น ไฟล์ต้นฉบับเก็บไว้ถาวร</p>
        <SourcePerformance />
        <h2 className="section-heading mt-10 text-2xl">การคำนวณสัญญาณค่าครองชีพ (วันนี้)</h2>
        <div className="mt-4"><CostSignalCalc /></div>
        <h2 className="section-heading mt-10 text-2xl">รายการไฟล์ที่ดึง</h2>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <select aria-label="หมวด" value={cat} onChange={(e) => reset(() => { setCat(e.target.value); setSrc(""); })} className="border border-editorial-rule bg-background px-3 py-2">
            <option value="">ทุกหมวด</option>
            {CATS.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
          </select>
          <select aria-label="แหล่ง" value={src} onChange={(e) => reset(() => setSrc(e.target.value))} className="border border-editorial-rule bg-background px-3 py-2">
            <option value="">ทุกแหล่ง</option>
            {shown.map((s) => <option key={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-1">จาก <input type="date" value={from} onChange={(e) => reset(() => setFrom(e.target.value))} className="border border-editorial-rule bg-background px-2 py-2" /></label>
          <label className="flex items-center gap-1">ถึง <input type="date" value={to} onChange={(e) => reset(() => setTo(e.target.value))} className="border border-editorial-rule bg-background px-2 py-2" /></label>
          {(cat || src || from || to) && <button className="underline" onClick={() => reset(() => { setCat(""); setSrc(""); setFrom(""); setTo(""); })}>ล้างตัวกรอง</button>}
        </div>
        {error && <p className="mt-6 text-destructive">โหลดไม่สำเร็จ: {(error as Error).message}</p>}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b-2 border-editorial-ink text-left align-bottom">
                <th className="py-2 pr-2">ดึงครั้งแรก</th><th className="pr-2">แหล่ง / ที่อยู่ต้นทาง</th><th className="pr-2">เห็นล่าสุด</th><th className="pr-2">ตอบกลับ</th><th className="pr-2">ค่าที่อ่านได้</th><th></th>
              </tr>
            </thead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {(data?.rows ?? []).map((e) => (
                <tr key={e.id} className="border-b border-border align-top">
                  <td className="whitespace-nowrap py-2 pr-2">{dt(e.fetched_at)}</td>
                  <td className="max-w-[340px] pr-2"><div className="font-semibold">{e.source}</div><div className="truncate text-xs text-muted-foreground" title={e.url}>{e.url}</div></td>
                  <td className="whitespace-nowrap pr-2 text-xs">{e.last_seen_at ? dt(e.last_seen_at) : "—"}<div className="text-muted-foreground">{e.seen_count > 1 ? `ไฟล์เดิม ${e.seen_count} ครั้ง` : "ไฟล์ใหม่"}</div></td>
                  <td className="whitespace-nowrap pr-2 text-xs">{e.http_status ?? "—"} · {(e.bytes / 1024).toFixed(1)} KB<div className="text-muted-foreground">{e.content_type?.split(";")[0] ?? ""}</div></td>
                  <td className="pr-2 text-xs">{(data?.vals.get(e.id) ?? []).map((v, i) => <div key={i}>{v.label}</div>)}{!data?.vals.get(e.id) && <span className="text-muted-foreground">—</span>}</td>
                  <td className="whitespace-nowrap"><button type="button" className="underline" onClick={async () => { const w = window.open("", "_blank"); try { const r = await evidenceUrl({ data: { id: e.id } }); if (w) w.location.href = r.url; } catch { w?.close(); } }}>เปิดไฟล์</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && !data.rows.length && <p className="mt-6 text-muted-foreground">ไม่มีข้อมูลตามตัวกรองนี้</p>}
        </div>
        <div className="mt-4 flex gap-4 text-sm">
          {page > 0 && <button className="underline" onClick={() => setPage(page - 1)}>← ใหม่กว่า</button>}
          {data?.more && <button className="underline" onClick={() => setPage(page + 1)}>เก่ากว่า →</button>}
        </div>
      </main>
    </div>
  );
}
