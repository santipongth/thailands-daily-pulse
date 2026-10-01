import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { evidenceDiff, evidenceUrl } from "@/lib/signals.functions";

type Ev = { id: number; source: string; url: string; http_status: number | null; content_type: string | null; bytes: number; sha256: string; fetched_at: string };

const evQuery = queryOptions({
  queryKey: ["evidence-all"],
  queryFn: async () => {
    const { data, error } = await supabase.from("raw_evidence").select("id,source,url,http_status,content_type,bytes,sha256,fetched_at").order("fetched_at", { ascending: false }).limit(1000);
    if (error) throw error;
    return data as Ev[];
  },
});

export const Route = createFileRoute("/evidence")({
  staticData: { sitemap: true },
  loader: ({ context }) => context.queryClient.ensureQueryData(evQuery),
  head: () => ({
    meta: [
      { title: "ไฟล์ดิบจากหน่วยงาน — Thailand Daily Signals" },
      { name: "description", content: "ไฟล์ต้นฉบับที่ดึงจากแต่ละหน่วยงาน พร้อมวันที่ดึงและเปรียบเทียบกับไฟล์ก่อนหน้า" },
      { property: "og:title", content: "ไฟล์ดิบจากหน่วยงาน — Thailand Daily Signals" },
      { property: "og:description", content: "ตรวจสอบไฟล์ต้นฉบับทุกครั้งที่ดึง และดูว่าเปลี่ยนไปจากครั้งก่อนอย่างไร" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EvidencePage,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดไฟล์ดิบไม่สำเร็จ: {(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-8">ไม่พบหน้า</div>,
});

const dt = (s: string) => new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });
const bkkDate = (s: string) => new Date(new Date(s).getTime() + 7 * 3600e3).toISOString().slice(0, 10);

function EvidencePage() {
  const { data } = useSuspenseQuery(evQuery);
  const [src, setSrc] = useState("");
  const [day, setDay] = useState("");
  const sources = [...new Set(data.map((e) => e.source))].sort();
  // previous file of same URL (list is newest first)
  const prevOf = new Map<number, Ev>();
  const lastByUrl = new Map<string, Ev>();
  for (let i = data.length - 1; i >= 0; i--) {
    const e = data[i]!;
    const p = lastByUrl.get(e.url);
    if (p) prevOf.set(e.id, p);
    lastByUrl.set(e.url, e);
  }
  const rows = data.filter((e) => (!src || e.source === src) && (!day || bkkDate(e.fetched_at) === day));
  const groups = new Map<string, Ev[]>();
  for (const e of rows) groups.set(e.source, [...(groups.get(e.source) ?? []), e]);

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-4xl">ไฟล์ดิบจากแต่ละหน่วยงาน</h1>
        <p className="mt-2 text-muted-foreground">ไฟล์ต้นฉบับทุกครั้งที่ระบบดึง พร้อมวันที่ และเทียบกับไฟล์ก่อนหน้าจากที่อยู่เดียวกัน (รหัส SHA-256 เหมือนกัน = เนื้อหาเหมือนเดิมทุกไบต์)</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <select value={src} onChange={(e) => setSrc(e.target.value)} className="border-2 border-foreground bg-background px-2 py-1" aria-label="เลือกแหล่ง">
            <option value="">ทุกแหล่ง</option>
            {sources.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="border-2 border-foreground bg-background px-2 py-1" aria-label="เลือกวันที่" />
          {(src || day) && <button className="underline" onClick={() => { setSrc(""); setDay(""); }}>ล้างตัวกรอง</button>}
        </div>
        {groups.size === 0 && <p className="mt-6 text-muted-foreground">ไม่มีไฟล์ตามตัวกรองนี้</p>}
        {[...groups].map(([source, list]) => (
          <section key={source} className="mt-8">
            <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">{source} <span className="text-sm font-normal text-muted-foreground">({list.length} ไฟล์)</span></h2>
            <ul className="mt-2 divide-y divide-border text-sm">
              {list.map((e) => <EvRow key={e.id} e={e} prev={prevOf.get(e.id)} />)}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}

function EvRow({ e, prev }: { e: Ev; prev?: Ev | undefined }) {
  const [diff, setDiff] = useState<Awaited<ReturnType<typeof evidenceDiff>> | null>(null);
  const [loading, setLoading] = useState(false);
  const status = !prev ? "ไฟล์แรก" : prev.sha256 === e.sha256 ? "เหมือนเดิม" : "เปลี่ยน";
  const delta = prev ? e.bytes - prev.bytes : 0;
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="whitespace-nowrap font-semibold">{dt(e.fetched_at)}</span>
        <span className={status === "เปลี่ยน" ? "font-semibold text-primary" : "text-muted-foreground"}>{status}</span>
        {prev && status === "เปลี่ยน" && <span className="text-xs text-muted-foreground">{delta >= 0 ? "+" : ""}{(delta / 1024).toFixed(1)} KB เทียบไฟล์ {dt(prev.fetched_at)}</span>}
        <span className="text-xs">{(e.bytes / 1024).toFixed(1)} KB</span>
        <span className="font-mono text-xs">{e.sha256.slice(0, 12)}…</span>
        <span className="ml-auto flex gap-3">
          <button type="button" className="underline" onClick={async () => { const w = window.open("", "_blank"); try { const r = await evidenceUrl({ data: { id: e.id } }); if (w) w.location.href = r.url; } catch { w?.close(); } }}>เปิดไฟล์</button>
          {status === "เปลี่ยน" && <button type="button" className="underline" disabled={loading} onClick={async () => { if (diff) { setDiff(null); return; } setLoading(true); try { setDiff(await evidenceDiff({ data: { id: e.id } })); } finally { setLoading(false); } }}>{loading ? "กำลังเทียบ…" : diff ? "ซ่อนส่วนที่เปลี่ยน" : "ดูส่วนที่เปลี่ยน"}</button>}
        </span>
      </div>
      <div className="truncate text-xs text-muted-foreground" title={e.url}>{e.url}</div>
      {diff && (
        <div className="mt-2 max-h-80 overflow-auto border border-border p-2 font-mono text-xs">
          {diff.status === "binary" && <p>ไฟล์ไม่ใช่ข้อความ เทียบได้เฉพาะรหัส SHA-256 และขนาด</p>}
          {diff.status === "changed" && diff.lines.length === 0 && <p>ต่างกันเฉพาะช่องว่าง/การขึ้นบรรทัด</p>}
          {diff.lines.map((l, i) => <div key={i} className={l.t === "+" ? "text-primary" : "text-destructive"}>{l.t} {l.s}</div>)}
          {diff.truncated && <p className="mt-1 text-muted-foreground">แสดงเฉพาะ 200 บรรทัดแรกที่เปลี่ยน</p>}
        </div>
      )}
    </li>
  );
}
