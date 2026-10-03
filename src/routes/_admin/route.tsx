import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Admin-only area: signed-in user with the admin role (role checked in the database, not on the device). */
export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/admin/login", search: { next: location.pathname } });
    const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
    if (!ok) throw redirect({ to: "/admin/login", search: { next: location.pathname } });
    return { user: data.user };
  },
  component: AdminLayout,
});

export const ADMIN_LINKS = [
  ["/admin", "ภาพรวมระบบ"], ["/agencies", "หน่วยงาน"], ["/events", "เหตุการณ์"], ["/impact", "สูตรผลกระทบ"], ["/calendar", "วันหยุด/ภาษี"],
  ["/data", "ข้อมูลดิบ"], ["/evidence", "ไฟล์ดิบ"], ["/method", "วิธีคำนวณ"], ["/sources", "แหล่งข้อมูล"], ["/tracking", "ติดตามข้อมูล"], ["/settings", "ตั้งค่า"],
] as const;

function AdminLayout() {
  const router = useRouter();
  return (
    <>
      <div className="border-b border-border bg-muted/40 font-editorial-body">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm">
          <span className="font-semibold text-editorial-red">ผู้ดูแลระบบ</span>
          {ADMIN_LINKS.map(([to, label]) => (
            <Link key={to} to={to} className="hover:underline" activeOptions={{ exact: to === "/admin" }} activeProps={{ className: "font-semibold underline" }}>{label}</Link>
          ))}
          <button type="button" className="ml-auto underline" onClick={async () => { await supabase.auth.signOut(); await router.navigate({ to: "/" }); }}>ออกจากระบบ</button>
        </div>
      </div>
      <Outlet />
    </>
  );
}
