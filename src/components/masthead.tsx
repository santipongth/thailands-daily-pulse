import { Link } from "@tanstack/react-router";

export function Masthead() {
  return (
    <header className="border-b-4 border-double border-foreground">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 pb-3 pt-6">
        <Link to="/" search={{}} className="font-display text-3xl font-bold leading-none sm:text-5xl">
          Thailand Daily Signals
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link to="/" search={{}} className="hover:underline" activeOptions={{ exact: true }} activeProps={{ className: "font-semibold underline" }}>วันนี้</Link>
          <Link to="/data" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ข้อมูลดิบ</Link>
          <Link to="/failures" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ดึงไม่ได้</Link>
          <Link to="/sources" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>แหล่งข้อมูล</Link>
          <Link to="/settings" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>ตั้งค่า</Link>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-3 text-sm text-muted-foreground">
        วันนี้ มีอะไรเปลี่ยนไปในประเทศไทยที่อาจกระทบชีวิตคุณ — อะไรไม่เปลี่ยน เราก็เงียบ
      </p>
    </header>
  );
}
