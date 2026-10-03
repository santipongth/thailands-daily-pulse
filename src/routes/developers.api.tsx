import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Masthead } from "@/components/masthead";
import { DeveloperNav } from "@/components/developer-nav";
import { API_SPEC, API_BASE, API_ERRORS, SITE, type ApiResource } from "@/lib/openapi";

export const Route = createFileRoute("/developers/api")({ staticData: { sitemap: true }, head: () => ({ meta: [
  { title: "Public API v1 — Thailand Daily Signals" }, { name: "description", content: "REST API แบบอ่านอย่างเดียว 16 resource พร้อม OpenAPI 3.1: parameter, field, error และตัวอย่างที่เรียกได้จริง" }, { property: "og:title", content: "Public API v1 — Thailand Daily Signals" }, { property: "og:description", content: "Endpoint, parameters, fields, errors, rate limit และตัวอย่างเรียกข้อมูลสาธารณะ" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: ApiDocs });

function Code({ title, value }: { title: string; value: string }) { return <div><p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p><pre className="mt-1 overflow-x-auto border-t-2 border-editorial-ink bg-editorial-surface p-4 text-xs"><code>{value}</code></pre></div>; }

function sampleUrl(r: ApiResource) { return `/api/public/v1/${r.path}?limit=2${r.idHint ? `&id=${encodeURIComponent(r.idHint)}` : ""}`; }

function Endpoint({ r }: { r: ApiResource }) {
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try { const res = await fetch(sampleUrl(r)); const j = await res.json(); setOut(`HTTP ${res.status}\n` + JSON.stringify(j, null, 2).slice(0, 2500)); }
    catch (e) { setOut(String(e)); } finally { setBusy(false); }
  }
  return <article id={r.path} className="border-t-2 border-editorial-ink bg-editorial-surface p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><code className="font-semibold text-editorial-red">GET /v1/{r.path}</code><span className="text-xs text-muted-foreground">{r.group}</span></div>
    <p className="mt-1 text-sm">{r.th}</p>
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs"><dt className="text-muted-foreground">เรียง</dt><dd><code>{r.order}</code> ใหม่สุดก่อน</dd><dt className="text-muted-foreground">date</dt><dd>{r.date ? <code>{r.date}</code> : "ไม่รองรับ (ถูกละเว้น)"}</dd><dt className="text-muted-foreground">id</dt><dd>{r.id ? <><code>{r.id}</code>{r.idHint && <> เช่น <code>{r.idHint}</code></>}</> : "ไม่รองรับ (ถูกละเว้น)"}</dd>{r.note && <><dt className="text-muted-foreground">หมายเหตุ</dt><dd>{r.note}</dd></>}</dl>
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">fields: {r.fields.map((f) => <code key={f} className="mr-1">{f}</code>)}</p>
    <div className="mt-3 flex flex-wrap gap-2 text-xs"><button type="button" onClick={run} disabled={busy} className="bg-editorial-red px-3 py-1.5 font-semibold text-editorial-paper disabled:opacity-60">{busy ? "กำลังเรียก…" : "ลองเรียก"}</button><a href={sampleUrl(r)} target="_blank" rel="noreferrer" className="border border-border px-3 py-1.5 hover:bg-muted">เปิด URL</a></div>
    {out && <pre className="mt-3 max-h-72 overflow-auto bg-background p-3 text-[11px]"><code>{out}</code></pre>}
  </article>;
}

function ApiDocs() {
  const groups = [...new Set(API_SPEC.map((r) => r.group))];
  return <div className="min-h-screen"><Masthead /><main className="page-shell">
    <h1 className="font-editorial text-4xl sm:text-5xl">Public API v1</h1>
    <p className="mt-3 max-w-3xl text-muted-foreground">Base URL <code>{API_BASE}</code> · GET เท่านั้น ไม่ต้องใช้กุญแจ · ผลลัพธ์ <code>{`{"data":[...],"meta":{"resource","count","limit","timezone":"Asia/Bangkok","read_only":true,"note"}}`}</code></p>
    <DeveloperNav />

    <section className="mt-10 grid gap-8 lg:grid-cols-3">
      <div><h2 className="section-heading text-2xl">Parameters</h2><ul className="mt-3 space-y-2 text-sm"><li><code>limit</code> 1–100 ค่าเริ่มต้น 25 (ค่าผิดรูปใช้ 25)</li><li><code>date</code> YYYY-MM-DD กรองคอลัมน์วันที่ของ resource นั้น — ผิดรูปได้ 400</li><li><code>id</code> ≤ 160 ตัวอักษร กรองตามคอลัมน์ที่ระบุในแต่ละ endpoint</li><li>endpoint ที่ไม่รองรับ <code>date</code>/<code>id</code> จะละเว้นค่านั้น</li></ul></div>
      <div><h2 className="section-heading text-2xl">Headers</h2><ul className="mt-3 space-y-2 text-sm"><li><code>Access-Control-Allow-Origin: *</code> (รองรับ OPTIONS)</li><li><code>Cache-Control: public, max-age=60</code></li><li>จำกัด 120 คำขอ/นาที/IP → 429 + <code>Retry-After: 60</code></li><li>เวอร์ชันอยู่ใน URL <code>/v1</code> การเปลี่ยนที่ไม่เข้ากันจะออกเวอร์ชันใหม่</li></ul></div>
      <div><h2 className="section-heading text-2xl">Errors</h2><table className="mt-3 w-full text-sm"><tbody>{API_ERRORS.map(([s, c, d]) => <tr key={c} className="border-b border-editorial-rule align-top"><td className="py-1 pr-2 font-semibold">{s}</td><td className="py-1 pr-2"><code className="text-xs">{c}</code></td><td className="py-1 text-xs text-muted-foreground">{d}</td></tr>)}</tbody></table><p className="mt-2 text-xs text-muted-foreground">รูปแบบ <code>{`{"error":{"code","message"}}`}</code></p></div>
    </section>

    {groups.map((g) => <section key={g} className="mt-10"><h2 className="section-heading text-2xl">{g}</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{API_SPEC.filter((r) => r.group === g).map((r) => <Endpoint key={r.path} r={r} />)}</div></section>)}

    <section className="mt-10 grid gap-8 lg:grid-cols-2">
      <div><h2 className="section-heading text-2xl">Health</h2><p className="mt-3 text-sm"><code>GET {SITE}/api/public/health</code> — ไม่ cache ตอบ <code>status</code> = <code>ok</code> / <code>degraded</code> พร้อม <code>database</code> (ok, latency_ms), <code>queue</code> (backlog, oldest_due_minutes, pending), <code>brief</code> (latest_date, published_at, late) และ <code>sources</code> (fresh, stale, paused, items[]) ตอบ 503 เมื่อฐานข้อมูลล่ม หรือหลัง 06:30 ยังไม่มี Brief วันนี้ ไม่เปิดเผยข้อความ error หรือ path</p></div>
      <div><h2 className="section-heading text-2xl">ภาพแชร์ Brief</h2><p className="mt-3 text-sm"><code>GET {SITE}/api/public/og/brief/YYYY-MM-DD</code> — ภาพประกอบ Brief ของวันนั้น (ไม่มีข้อความ) ใช้เป็น og:image ได้ ไม่มีภาพจะได้ 404</p></div>
    </section>

    <section className="mt-10"><h2 className="section-heading text-2xl">ตัวอย่าง</h2><div className="mt-3 grid gap-4 lg:grid-cols-3">
      <Code title="curl" value={`curl '${API_BASE}/briefs?limit=1'\ncurl '${API_BASE}/events?id=dit_pork:2026-10-04'`} />
      <Code title="JavaScript" value={`const r = await fetch('${API_BASE}/signals?date=2026-10-04');\nif (r.status === 429) await new Promise(s => setTimeout(s, 60_000));\nconst { data, meta } = await r.json();`} />
      <Code title="Python" value={`import requests\nr = requests.get('${API_BASE}/observations',\n                 params={'id': 'lpg', 'limit': 20})\nr.raise_for_status()\nrows = r.json()['data']`} />
    </div></section>
  </main></div>;
}
