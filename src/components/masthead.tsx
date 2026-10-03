import { bkkToday } from "@/lib/signals";
import { Link } from "@tanstack/react-router";
import { FailureAlert } from "@/components/failure-alert";
import { DailyTicker } from "@/components/daily-ticker";

export function Masthead() {
  return (
    <header className="border-b-4 border-double border-foreground">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 pb-3 pt-6">
        <Link to="/" search={{}} className="font-display text-3xl font-bold leading-none sm:text-5xl">
          Thailand Daily Signals
        </Link>
        <nav className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm">
          <Link to="/" search={{}} className="hover:underline" activeOptions={{ exact: true }} activeProps={{ className: "font-semibold underline" }}>วันนี้</Link>
          <Link to="/brief" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>Brief</Link>
          <Link to="/key-data" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ข้อมูลสำคัญ</Link>
          <Link to="/data-all" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ข้อมูลทั้งหมด</Link>
          <Link to="/day/$date" params={{ date: bkkToday() }} className="hover:underline" activeProps={{ className: "font-semibold underline" }}>รายวัน</Link>
          <Link to="/agencies" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>หน่วยงาน</Link>
          <Link to="/events" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>เหตุการณ์</Link>
          <Link to="/impact" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>สูตรผลกระทบ</Link>
          <Link to="/calendar" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>วันหยุด/ภาษี</Link>
          <Link to="/data" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ข้อมูลดิบ</Link>
          <Link to="/evidence" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ไฟล์ดิบ</Link>
          <Link to="/method" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>วิธีคำนวณ</Link>
          <Link to="/sources" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>แหล่งข้อมูล</Link>
          <Link to="/tracking" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ติดตามข้อมูล</Link>
          <Link to="/settings" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ตั้งค่า</Link>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-3 text-sm text-muted-foreground">
        วันนี้ มีอะไรเปลี่ยนไปในประเทศไทยที่อาจกระทบชีวิตคุณ — อะไรไม่เปลี่ยน เราก็เงียบ
      </p>
      <DailyTicker />
      {/* FailureAlert renders nothing visible; it only fires browser notifications */}
      <FailureAlert />
    </header>
  );
}
