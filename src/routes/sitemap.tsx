import { createFileRoute, Link } from "@tanstack/react-router";
import { Masthead } from "@/components/masthead";
const groups = [
  ["ข้อมูลวันนี้", [["วันนี้", "/"], ["Daily Brief", "/brief"], ["ข้อมูลสำคัญ", "/key-data"], ["ข้อมูลทั้งหมด", "/data-all"], ["ปฏิทินวันหยุดและภาษี", "/calendar"]]],
  ["คลังและหลักฐาน", [["เหตุการณ์", "/events"], ["ข้อมูลดิบ", "/data"], ["ไฟล์หลักฐาน", "/evidence"], ["ติดตามข้อมูล", "/tracking"], ["แหล่งข้อมูล", "/sources"], ["หน่วยงาน", "/agencies"]]],
  ["วิธีการ", [["วิธีคำนวณ", "/method"], ["สูตรผลกระทบ", "/impact"], ["การตั้งค่า", "/settings"]]],
  ["สำหรับนักพัฒนา", [["Developer Document", "/developers"], ["Public API", "/developers/api"], ["MCP Server", "/developers/mcp"]]],
] as const;
export const Route = createFileRoute("/sitemap")({ staticData: { sitemap: true }, head: () => ({ meta: [
  { title: "แผนผังเว็บไซต์ — Thailand Daily Signals" }, { name: "description", content: "รวมทุกหน้าข้อมูล วิธีการ หลักฐาน และเอกสารนักพัฒนาของ Thailand Daily Signals" }, { property: "og:title", content: "แผนผังเว็บไซต์ — Thailand Daily Signals" }, { property: "og:description", content: "ค้นหาหน้าข้อมูลวันนี้ คลังหลักฐาน วิธีการ และเครื่องมือสำหรับนักพัฒนา" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: Sitemap });
function Sitemap() { return <div className="min-h-screen"><Masthead /><main className="mx-auto max-w-6xl px-4 py-8"><h1 className="font-display text-4xl sm:text-5xl">แผนผังเว็บไซต์</h1><p className="mt-2 text-muted-foreground">รวมหน้าข้อมูลและเอกสารทั้งหมด แยกตามงานที่ต้องการ</p><div className="mt-8 grid gap-10 sm:grid-cols-2">{groups.map(([title, links]) => <section key={title}><h2 className="border-b-2 border-foreground pb-2 font-display text-2xl">{title}</h2><ul className="mt-3 divide-y divide-border">{links.map(([label, to]) => <li key={to}><Link to={to} className="flex items-center justify-between py-3 hover:underline"><span>{label}</span><span aria-hidden>→</span></Link></li>)}</ul></section>)}</div></main></div>; }
