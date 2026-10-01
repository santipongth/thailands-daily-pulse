import { bkkToday } from "@/lib/signals";
import { Link } from "@tanstack/react-router";
import { FailureAlert } from "@/components/failure-alert";
import { useUnseen } from "@/hooks/use-unseen";

export function Masthead() {
  const { count } = useUnseen();
  return (
    <header className="border-b-4 border-double border-foreground">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 pb-3 pt-6">
        <Link to="/" search={{}} className="font-display text-3xl font-bold leading-none sm:text-5xl">
          Thailand Daily Signals
        </Link>
        <nav className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm">
          <Link to="/" search={{}} className="hover:underline" activeOptions={{ exact: true }} activeProps={{ className: "font-semibold underline" }}>วันนี้</Link>
          <Link to="/day/$date" params={{ date: bkkToday() }} className="hover:underline" activeProps={{ className: "font-semibold underline" }}>รายวัน</Link>
          <Link to="/agencies" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>หน่วยงาน</Link>
          <Link to="/monitor" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>
            ติดตาม{count > 0 && <span className="ml-1 rounded-full bg-up px-1.5 text-xs text-background">{count}</span>}
          </Link>
          <Link to="/data" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ข้อมูลดิบ</Link>
          <Link to="/sources" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>แหล่งข้อมูล</Link>
          <Link to="/settings" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ตั้งค่า</Link>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-3 text-sm text-muted-foreground">
        วันนี้ มีอะไรเปลี่ยนไปในประเทศไทยที่อาจกระทบชีวิตคุณ — อะไรไม่เปลี่ยน เราก็เงียบ
      </p>
      <FailureAlert />
      <div className="h-3" />
    </header>
  );
}
