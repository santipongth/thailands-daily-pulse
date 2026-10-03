import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Masthead } from "@/components/masthead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { listCustom, testCustomSource, saveCustomSource, disableCustomSource } from "@/lib/custom.functions";
import { parseTimes } from "@/lib/schedule-next";

export const Route = createFileRoute("/_admin/custom-sources")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "แหล่งข้อมูลของฉัน — Thailand Daily Signals" },
      { name: "description", content: "ผู้ดูแลเพิ่มแหล่งข้อมูลใหม่ (JSON, CSV, หน้าเว็บ) ทดลองดึง และกำหนดเวลาดึงเอง" },
      { property: "og:title", content: "แหล่งข้อมูลของฉัน" },
      { property: "og:description", content: "เพิ่มแหล่งข้อมูลใหม่พร้อมตารางเวลาดึง" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const HINT: Record<string, string> = {
  json: "ตำแหน่งค่าแบบจุด เช่น data.price หรือ items[-1].value (-1 = ตัวสุดท้าย)",
  csv: "ชื่อคอลัมน์ของค่า เช่น price",
  text: "รูปแบบค้นหา (regex) ที่มีวงเล็บครอบตัวเลข เช่น ราคา\\s*([\\d.,]+)",
};

function Page() {
  const list = useServerFn(listCustom);
  const test = useServerFn(testCustomSource);
  const save = useServerFn(saveCustomSource);
  const disable = useServerFn(disableCustomSource);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["custom-list"], queryFn: () => list() });
  const [f, setF] = useState({ name: "", key: "", owner: "", url: "", licence: "", format: "json", value_path: "", date_path: "", row_match: "", family_id: "", metric_name: "", unit: "", times: "" });
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setRes(null); };
  const cfg = { url: f.url.trim(), format: f.format as "json", value_path: f.value_path, date_path: f.date_path || null, row_match: f.row_match || null };
  const times = parseTimes(f.times);

  const onTest = async () => { setBusy(true); setRes(await test({ data: cfg }).catch((e) => ({ ok: false, error: String(e.message) }))); setBusy(false); };
  const onSave = async () => {
    setBusy(true);
    const r = await save({ data: { ...cfg, key: f.key, name: f.name.trim(), owner: f.owner.trim(), licence: f.licence || "ไม่ระบุ", family_id: f.family_id, metric_name: f.metric_name.trim() || f.name.trim(), unit: f.unit, decimals: 2, custom_times: times } }).catch((e) => ({ ok: false, error: String(e.message) }));
    setBusy(false);
    setRes(r.ok ? { ok: true, saved: true } : r);
    if (r.ok) qc.invalidateQueries({ queryKey: ["custom-list"] });
  };
  const inp = (k: keyof typeof f, label: string, hint?: string) => (
    <div className="space-y-1"><Label htmlFor={k}>{label}</Label><Input id={k} value={f[k]} onChange={set(k)} spellCheck={false} />{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
  );

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="page-shell max-w-3xl space-y-8">
        <header>
          <h1 className="font-editorial text-4xl">แหล่งข้อมูลของฉัน</h1>
          <p className="mt-2 text-muted-foreground">เพิ่มแหล่งข้อมูลใหม่เอง — ทุกครั้งที่ดึงจะเก็บไฟล์ต้นฉบับเป็นหลักฐาน ใช้วันที่ตามจริง และถ้าดึงไม่ได้จะแสดงความล้มเหลวตรง ๆ เมื่อบันทึกแล้วตั้งเวลาเพิ่มเติมได้ที่ <Link to="/admin" className="underline">ตัวจัดการแหล่งข้อมูล</Link> และตั้งเกณฑ์สัญญาณได้ที่ <Link to="/custom-signals" className="underline">สัญญาณของฉัน</Link></p>
        </header>

        <section className="space-y-4">
          <h2 className="border-b border-border pb-1 text-xl font-bold text-primary">เพิ่มแหล่งใหม่</h2>
          {inp("name", "ชื่อแหล่ง", "ชื่อที่แสดงในตัวจัดการแหล่งข้อมูล")}
          {inp("key", "รหัสสั้น (a-z 0-9 _)", "ใช้เป็นรหัสตัวชี้วัด c_รหัส เปลี่ยนภายหลังไม่ได้")}
          {inp("owner", "หน่วยงานเจ้าของ")}
          {inp("url", "ลิงก์ข้อมูล", "URL ที่ดึงได้โดยตรง (ไม่ต้องล็อกอิน)")}
          {inp("licence", "สิทธิ์ใช้ / เงื่อนไข")}
          <div className="space-y-1"><Label htmlFor="format">รูปแบบ</Label>
            <select id="format" value={f.format} onChange={set("format")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="json">JSON API</option><option value="csv">CSV</option><option value="text">หน้าเว็บ / ข้อความ</option>
            </select></div>
          {inp("value_path", "ตำแหน่งค่า", HINT[f.format])}
          {f.format === "csv" && inp("row_match", "เลือกแถว (ไม่บังคับ)", "เช่น item=ไข่ไก่ — ว่าง = แถวสุดท้าย")}
          {inp("date_path", "ตำแหน่งวันที่ของแหล่ง (ไม่บังคับ)", "รูปแบบเดียวกับตำแหน่งค่า — เก็บเป็นวันที่มีผล ถ้าไม่ใส่จะไม่เดาวันที่")}
          <Button onClick={onTest} disabled={busy || !f.url || !f.value_path}>{busy ? "กำลังดึง…" : "ทดลองดึง"}</Button>
          {res && !res.saved && (
            <div className="rounded border border-border bg-muted p-3 text-sm">
              {res.ok ? <><b>ได้ค่า {res.value}</b> · วันที่ของแหล่ง: {res.date ?? "ไม่ระบุ"}<pre className="mt-2 whitespace-pre-wrap text-xs">{res.snippet}</pre></>
                : <b className="text-primary">{res.error}</b>}
            </div>
          )}
          {res?.ok && !res.saved && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-1"><Label htmlFor="family_id">หมวด</Label>
                <select id="family_id" value={f.family_id} onChange={set("family_id")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">— เลือก —</option>{q.data?.families.map((x) => <option key={x.id} value={x.id}>{x.name_th}</option>)}
                </select></div>
              {inp("metric_name", "ชื่อตัวชี้วัด (ไทย)")}
              {inp("unit", "หน่วย", "เช่น บาท/กก.")}
              {inp("times", "เวลาดึง (เวลาไทย)", `เช่น 06:10, 12:30, 18:00 — ว่าง = ดึงเองเท่านั้น · อ่านได้: ${times.join(", ") || "—"}`)}
              <Button onClick={onSave} disabled={busy || !f.name || !/^[a-z0-9_]{2,30}$/.test(f.key) || !f.owner || !f.family_id}>บันทึกแหล่งนี้</Button>
            </div>
          )}
          {res?.saved && <p className="font-semibold">บันทึกแล้ว — แหล่งนี้อยู่ในตัวจัดการแหล่งข้อมูลแล้ว</p>}
        </section>

        <section className="space-y-2">
          <h2 className="border-b border-border pb-1 text-xl font-bold text-primary">แหล่งที่เพิ่มไว้</h2>
          {!q.data?.sources.length && <p className="text-sm text-muted-foreground">ยังไม่มี</p>}
          {q.data?.sources.map((s) => (
            <div key={s.key} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2 text-sm">
              <div><b>{s.name}</b> · {s.owner} · {s.format.toUpperCase()} · ตัวชี้วัด {s.metric_id}{!s.active && " · ปิดแล้ว"}<div className="break-all text-xs text-muted-foreground">{s.url}</div></div>
              {s.active && <Button size="sm" variant="outline" onClick={async () => { if (confirm("หยุดแหล่งนี้? ข้อมูลและหลักฐานเดิมยังเก็บไว้")) { await disable({ data: { key: s.key } }); qc.invalidateQueries({ queryKey: ["custom-list"] }); } }}>หยุดแหล่งนี้</Button>}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
