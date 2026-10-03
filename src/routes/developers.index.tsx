import { createFileRoute, Link } from "@tanstack/react-router";
import { Masthead } from "@/components/masthead";
import { DeveloperNav } from "@/components/developer-nav";
import { API_SPEC, API_BASE, DOCS_UPDATED } from "@/lib/openapi";

const MCP_FOR: Record<string, string> = { briefs: "get_today_brief / get_brief_by_date", "brief-updates": "—", signals: "list_signals / get_signal", events: "list_signal_events", observations: "get_observations", dams: "get_dam_levels", weather: "get_weather_observations", lottery: "get_latest_lottery", sources: "list_sources", "source-health": "get_source_health", evidence: "get_evidence_metadata", social: "list_social_updates", news: "list_news_mentions", holidays: "get_calendar", "tax-deadlines": "get_calendar", calendar: "get_calendar" };

export const Route = createFileRoute("/developers/")({ staticData: { sitemap: true }, head: () => ({ meta: [
  { title: "Developer Document — Thailand Daily Signals" }, { name: "description", content: "คู่มือ Public API, OpenAPI และ MCP สำหรับนักพัฒนาและ AI Agents — ข้อมูลสาธารณะแบบอ่านอย่างเดียว" },
  { property: "og:title", content: "Developer Document — Thailand Daily Signals" }, { property: "og:description", content: "REST API 16 resource, MCP 17 tools, OpenAPI 3.1 สำหรับอ่าน Signals, Briefs และหลักฐาน" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: Developers });

const H = ({ children }: { children: React.ReactNode }) => <h2 className="section-heading text-2xl">{children}</h2>;
const Pre = ({ children }: { children: string }) => <pre className="mt-3 overflow-x-auto border-t-2 border-editorial-ink bg-editorial-surface p-4 text-xs"><code>{children}</code></pre>;

function Developers() {
  return <div className="min-h-screen"><Masthead /><main className="page-shell">
    <header className="max-w-3xl"><p className="text-sm font-semibold text-editorial-red">FOR HUMANS & AI AGENTS · อัปเดต {DOCS_UPDATED}</p><h1 className="mt-2 font-editorial text-4xl sm:text-5xl">Developer Document</h1><p className="mt-3 text-muted-foreground">ข้อมูลชุดเดียวกับหน้าเว็บ เปิดผ่าน REST API ({API_SPEC.length} resource) และ MCP (17 tools) ทั้งหมดอ่านอย่างเดียว ไม่ต้องสมัครหรือใช้กุญแจ</p></header>
    <DeveloperNav />

    <section className="mt-10"><H>ความสามารถที่เปิดให้ใช้</H><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b-2 border-editorial-ink text-left"><th className="py-2">กลุ่ม</th><th>ข้อมูล</th><th>REST</th><th>MCP</th></tr></thead><tbody>{API_SPEC.map((r) => <tr key={r.path} className="border-b border-editorial-rule align-top"><td className="py-2 text-muted-foreground">{r.group}</td><td className="py-2">{r.th}</td><td className="py-2"><code>/{r.path}</code></td><td className="py-2"><code className="text-xs">{MCP_FOR[r.path]}</code></td></tr>)}</tbody></table></div></section>

    <section className="mt-10 grid gap-8 md:grid-cols-2">
      <div><H>เริ่มต้นเร็ว</H><Pre>{`curl '${API_BASE}/signals?limit=10'\ncurl '${API_BASE}/observations?id=lpg&limit=5'`}</Pre><p className="mt-3 text-sm">รายละเอียด parameter, field และตัวอย่าง: <Link to="/developers/api" className="underline">REST API</Link> · เชื่อม AI: <Link to="/developers/mcp" className="underline">MCP</Link> · สำหรับ LLM: <a href="/llms.txt" className="underline">/llms.txt</a></p></div>
      <div><H>ข้อจำกัด</H><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
        <li>GET เท่านั้น สูงสุด 100 รายการต่อคำขอ (ค่าเริ่มต้น 25) เรียงใหม่สุดก่อน</li>
        <li>จำกัด 120 คำขอ/นาที/IP — เกินจะได้ 429 พร้อม <code>Retry-After: 60</code></li>
        <li>CORS เปิดทุก origin, cache 60 วินาที (health ไม่ cache)</li>
        <li>ไม่มีคำสั่งดึงข้อมูล, เผยแพร่ Brief, backfill, คิวงาน หรือการตั้งค่า</li>
        <li>หลักฐานดิบเปิดเฉพาะ metadata (url, sha256, ขนาด) ไม่มีไฟล์หรือลิงก์ดาวน์โหลด</li>
        <li>ข่าวและ Social เป็นบริบท ไม่สร้างและไม่เพิ่มคะแนน Signal</li>
      </ul></div>
    </section>

    <section className="mt-10"><H>วงจรรายวัน (เวลา Asia/Bangkok)</H><ol className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      {[["00:00–05:45", "ช่วงข้อมูลของ Brief ดึงรอบเร่ง 00:10 / 03:00 / 05:00 / 05:30"], ["05:45", "ตัดรอบ (freeze) — ข้อมูลที่ received_at หลังนี้ไม่เข้า Brief"], ["05:55", "เผยแพร่ Brief (ลองซ้ำ 05:58) หลังเผยแพร่แล้วไม่แก้"], ["หลังเผยแพร่", "การแก้ไข/ถอน/ข้อมูลมาช้า ไปอยู่ที่ /brief-updates"]].map(([t, d]) => <li key={t} className="border-t-2 border-editorial-ink bg-editorial-surface p-3"><p className="font-semibold text-editorial-red">{t}</p><p className="mt-1 text-muted-foreground">{d}</p></li>)}
    </ol></section>

    <section className="mt-10 grid gap-8 md:grid-cols-2">
      <div><H>ระดับสัญญาณ</H><dl className="mt-3 space-y-2 text-sm"><div><dt className="inline font-semibold"><code>high</code> สำคัญมาก</dt> <dd className="inline text-muted-foreground">— เกินเกณฑ์ทางการ ≥ 3 เท่า หรือข้าม ≥ 2 ระดับ</dd></div><div><dt className="inline font-semibold"><code>medium</code> น่าจับตา</dt> <dd className="inline text-muted-foreground">— เกินเกณฑ์ ≥ 1.5 เท่า</dd></div><div><dt className="inline font-semibold"><code>low</code> เล็กน้อย</dt> <dd className="inline text-muted-foreground">— ผ่านเกณฑ์ขั้นต่ำ เก็บในประวัติ แต่หน้า “วันนี้” ไม่แสดง</dd></div></dl><p className="mt-3 text-sm text-muted-foreground">กฎที่ผ่านอยู่ใน <code>checks</code> และคะแนนจัดอันดับใน <code>score</code> (severity × z × ความน่าเชื่อถือ × reach × หลักฐาน) — เกณฑ์เป็นค่าทางการ ผู้อ่านตั้งเองไม่ได้</p></div>
      <div><H>เวอร์ชัน การถอน และข้อมูลมาช้า</H><ul className="mt-3 list-disc space-y-2 pl-5 text-sm"><li><code>event_id</code> = <code>metric_id:YYYY-MM-DD</code> มีเวอร์ชันใหม่เมื่อเนื้อหาเปลี่ยนเท่านั้น</li><li><code>status</code> = <code>withdrawn</code> เมื่อข้อมูลแก้แล้วไม่ผ่านเกณฑ์</li><li>ข้อมูลที่มาช้าแต่ผ่านเกณฑ์ เก็บวันที่ข้อมูลเดิม แสดงในวันที่มาถึง <code>checks.arrival_rule = "late_above_threshold"</code></li><li>ไม่มีการเติมวันที่ขาดหาย ช่องว่างคือช่องว่าง</li></ul></div>
    </section>

    <section className="mt-10"><H>ความหมายของเวลาและคุณภาพ</H><dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {[["observed_on / period_start–end", "วันที่ที่ข้อมูลกล่าวถึง"], ["effective_from", "วันที่ราคา/ค่าเริ่มมีผลจริงตามต้นทาง (เช่น ก๊าซหุงต้ม 2023-03-01)"], ["published_at", "เวลาที่ต้นทางเผยแพร่ (ถ้าระบุ)"], ["received_at", "เวลาที่ระบบได้รับ ใช้ตัดรอบ 05:45 และไม่ถูกเขียนทับเมื่อค่าไม่เปลี่ยน"], ["evidence_id", "อ้างอิงไฟล์หลักฐานดิบที่ใช้ (ดู /evidence)"], ["is_demo / is_live", "แยกข้อมูลตัวอย่างออกจากข้อมูลจริง"]].map(([k, v]) => <div key={k}><dt className="font-semibold"><code>{k}</code></dt><dd className="text-muted-foreground">{v}</dd></div>)}
    </dl><p className="mt-4 text-sm text-muted-foreground">เวลาทั้งหมดเป็น ISO 8601 (UTC) ส่วนวันที่ (date) เป็นวันตามปฏิทินกรุงเทพฯ</p></section>

    <section className="mt-10"><H>ประวัติการเปลี่ยนแปลง</H><ul className="mt-3 space-y-1 text-sm"><li><b>{DOCS_UPDATED}</b> — เอกสารสร้างจากสเปกเดียวกับ API; ระบุ <code>date</code>/<code>id</code> ราย endpoint; <code>/signals?id=</code> กรอง <code>metric_id</code> (เดิมเกิด 500); MCP <code>get_signal</code> คืน event + versions, <code>get_household_impact</code> อ่านจาก signal versions; OpenAPI 1.1 มี field, 429 และ /health</li><li><b>1.0</b> — เปิด REST v1, OpenAPI 3.1 และ MCP 17 tools</li></ul></section>
  </main></div>;
}
