import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-4 border-double border-editorial-ink bg-editorial-surface font-editorial-body">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="font-editorial text-2xl text-editorial-ink">Thailand Daily Signals</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">ข้อมูลสาธารณะเพื่อช่วยติดตามสิ่งที่เปลี่ยนไปในประเทศไทย ไม่ใช่คำแนะนำทางการเงิน สุขภาพ หรือกฎหมายส่วนบุคคล</p>
          <p className="mt-4 text-xs text-muted-foreground">© {new Date().getFullYear()} Thailand Daily Signals</p>
        </div>
        <nav aria-label="ลิงก์ข้อมูล" className="text-sm">
          <p className="mb-2 font-semibold">ข้อมูลและวิธีการ</p>
          <ul className="space-y-2"><li><Link to="/sitemap" className="hover:underline">แผนผังเว็บไซต์</Link></li><li><Link to="/data-map" className="hover:underline">แผนผังข้อมูล</Link></li><li><Link to="/search" className="hover:underline">ค้นหา</Link></li><li><Link to="/admin" className="hover:underline">ผู้ดูแลระบบ</Link></li></ul>
        </nav>
        <nav aria-label="ลิงก์นักพัฒนา" className="text-sm">
          <p className="mb-2 font-semibold">สำหรับนักพัฒนาและ AI</p>
          <ul className="space-y-2"><li><Link to="/developers" className="hover:underline">Developer Document</Link></li><li><Link to="/developers/api" className="hover:underline">Public API</Link></li><li><Link to="/developers/mcp" className="hover:underline">MCP Tools</Link></li><li><a href="/api/public/openapi.json" className="hover:underline">OpenAPI 3.1</a></li></ul>
        </nav>
      </div>
    </footer>
  );
}
