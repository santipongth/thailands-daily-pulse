import { bkkToday } from "@/lib/signals";
import { Link } from "@tanstack/react-router";
import { FailureAlert } from "@/components/failure-alert";
import { DailyTicker } from "@/components/daily-ticker";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ReactNode } from "react";

function MobileLink({ to, children }: { to: string; children: ReactNode }) {
  return <SheetClose asChild><a href={to} className="border-b border-border py-3 text-base">{children}</a></SheetClose>;
}

export function Masthead() {
  return (
    <header className="border-b-4 border-double border-editorial-ink bg-editorial-paper font-editorial-body">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-3 pt-5 md:items-end md:pt-6">
        <Link to="/" search={{}} className="min-w-0 font-editorial text-2xl leading-none text-editorial-ink sm:text-4xl lg:text-5xl">
          Thailand Daily Signals
        </Link>
        <nav className="hidden flex-wrap justify-end gap-x-4 gap-y-1 text-sm md:flex">
          <Link to="/" search={{}} className="hover:underline" activeOptions={{ exact: true }} activeProps={{ className: "font-semibold underline" }}>วันนี้</Link>
          <Link to="/brief" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>Brief</Link>
          <Link to="/key-data" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ข้อมูลสำคัญ</Link>
          <Link to="/data-all" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ข้อมูลทั้งหมด</Link>
          <Link to="/stations" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>สถานี</Link>
          <Link to="/day/$date" params={{ date: bkkToday() }} className="hover:underline" activeProps={{ className: "font-semibold underline" }}>รายวัน</Link>
          <Link to="/data-map" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>แผนผังข้อมูล</Link>
          <Link to="/search" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ค้นหา</Link>
          <Link to="/developers" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>สำหรับนักพัฒนา</Link>
        </nav>
        <Sheet>
          <SheetTrigger asChild><Button variant="outline" size="icon" className="shrink-0 md:hidden" aria-label="เปิดเมนู"><Menu /></Button></SheetTrigger>
          <SheetContent side="right" className="w-[88vw] overflow-y-auto p-5 sm:max-w-sm">
            <SheetHeader className="pr-8 text-left"><SheetTitle className="font-editorial text-2xl">เมนู</SheetTitle></SheetHeader>
            <nav className="mt-5 flex flex-col" aria-label="เมนูมือถือ">
              <MobileLink to="/">วันนี้</MobileLink><MobileLink to="/brief">Brief</MobileLink><MobileLink to="/key-data">ข้อมูลสำคัญ</MobileLink><MobileLink to="/data-all">ข้อมูลทั้งหมด</MobileLink><MobileLink to="/stations">สถานี</MobileLink><MobileLink to={`/day/${bkkToday()}`}>รายวัน</MobileLink><MobileLink to="/data-map">แผนผังข้อมูล</MobileLink><MobileLink to="/search">ค้นหา</MobileLink><MobileLink to="/developers">สำหรับนักพัฒนา</MobileLink>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-3 text-sm text-muted-foreground">
        วันนี้ มีอะไรเปลี่ยนไปในประเทศไทยที่อาจกระทบชีวิตคุณ
      </p>
      <DailyTicker />
      {/* FailureAlert renders nothing visible; it only fires browser notifications */}
      <FailureAlert />
    </header>
  );
}
