import { createFileRoute } from "@tanstack/react-router";
import { Masthead } from "@/components/masthead";
import { DeveloperNav } from "@/components/developer-nav";
import { MCP_TOOLS } from "@/lib/mcp-catalog";
import { SITE } from "@/lib/openapi";

export const Route = createFileRoute("/developers/mcp")({ staticData: { sitemap: true }, head: () => ({ meta: [
  { title: "MCP Server — Thailand Daily Signals" }, { name: "description", content: "เครื่องมือ MCP สาธารณะ 17 รายการพร้อมคำอธิบายและ argument สำหรับ AI Agents อ่าน Daily Brief, Signals และหลักฐาน" }, { property: "og:title", content: "MCP Server — Thailand Daily Signals" }, { property: "og:description", content: "เชื่อม AI Agents เข้ากับข้อมูลสาธารณะแบบอ่านอย่างเดียวผ่าน Model Context Protocol" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: McpDocs });

const EP = `${SITE}/mcp`;
const Pre = ({ title, children }: { title: string; children: string }) => <div><p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p><pre className="mt-1 overflow-x-auto border-t-2 border-editorial-ink bg-editorial-surface p-4 text-xs"><code>{children}</code></pre></div>;
const curl = (body: string) => `curl -X POST ${EP} \\\n  -H 'Content-Type: application/json' \\\n  -H 'Accept: application/json, text/event-stream' \\\n  -d '${body}'`;

function McpDocs() {
  const groups = [...new Set(MCP_TOOLS.map((t) => t.group))];
  return <div className="min-h-screen"><Masthead /><main className="page-shell">
    <h1 className="font-editorial text-4xl sm:text-5xl">MCP Server</h1>
    <p className="mt-3 max-w-3xl text-muted-foreground">ให้ AI Agents เรียกเครื่องมือข้อมูลผ่าน Streamable HTTP สาธารณะ อ่านอย่างเดียว ไม่ต้องเข้าสู่ระบบ ข้อมูลชุดเดียวกับ REST API</p>
    <DeveloperNav />
    <section className="mt-10 grid gap-8 md:grid-cols-2">
      <div><h2 className="section-heading text-2xl">การเชื่อมต่อ</h2><dl className="mt-3 space-y-2 text-sm"><div><dt className="font-semibold">Endpoint</dt><dd><code>{EP}</code></dd></div><div><dt className="font-semibold">ชื่อ server / เวอร์ชัน</dt><dd><code>thailand-daily-signals</code> 1.0.0</dd></div><div><dt className="font-semibold">Transport</dt><dd>Streamable HTTP — POST JSON-RPC 2.0 พร้อม <code>Accept: application/json, text/event-stream</code></dd></div><div><dt className="font-semibold">Origins</dt><dd>ทุก origin ไม่ต้องใช้ token</dd></div></dl></div>
      <div><h2 className="section-heading text-2xl">ขอบเขตความปลอดภัย</h2><p className="mt-3 text-sm">ทุก tool ติดป้าย <code>readOnlyHint</code> และ <code>idempotentHint</code> อ่านผ่านสิทธิ์สาธารณะเท่านั้น ไม่มี tool สำหรับ ingest, publish, rerun, backfill, สร้างภาพ, settings, queue, jobs หรือไฟล์หลักฐานส่วนตัว</p><p className="mt-3 text-sm">ผลลัพธ์คืนทั้ง <code>content</code> (ข้อความ JSON) และ <code>structuredContent</code> = <code>{`{data, meta:{timezone:"Asia/Bangkok", read_only:true, note}}`}</code> ข่าวและ Social มี note ว่าเป็นบริบทเท่านั้น</p></div>
    </section>

    <section className="mt-10"><h2 className="section-heading text-2xl">Tool catalog ({MCP_TOOLS.length})</h2>{groups.map((g) => <div key={g} className="mt-6"><h3 className="text-sm font-semibold uppercase text-editorial-red">{g}</h3><div className="mt-2 overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><tbody>{MCP_TOOLS.filter((t) => t.group === g).map((t) => <tr key={t.name} className="border-b border-editorial-rule align-top"><td className="w-56 py-2 pr-3"><code className="font-semibold">{t.name}</code></td><td className="py-2 pr-3">{t.description}</td><td className="w-64 py-2 text-xs text-muted-foreground">{t.args}</td></tr>)}</tbody></table></div></div>)}</section>

    <section className="mt-10"><h2 className="section-heading text-2xl">ตัวอย่างคำขอ</h2><div className="mt-3 grid gap-4 lg:grid-cols-2">
      <Pre title="1. initialize">{curl(`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"demo","version":"1"}}}`)}</Pre>
      <Pre title="2. tools/list">{curl(`{"jsonrpc":"2.0","id":2,"method":"tools/list"}`)}</Pre>
      <Pre title="3. tools/call — Brief วันนี้">{curl(`{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_today_brief","arguments":{}}}`)}</Pre>
      <Pre title="4. tools/call — สัญญาณรายตัว">{curl(`{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_signal","arguments":{"id":"lpg:2026-10-04"}}}`)}</Pre>
      <Pre title="ตั้งค่าใน AI client (mcp.json)">{JSON.stringify({ mcpServers: { "thailand-daily-signals": { type: "http", url: EP } } }, null, 2)}</Pre>
    </div></section>
  </main></div>;
}
