import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Username "admin" maps to the admin account email; any full email also works. */
export const ADMIN_EMAIL = "admin@thailanddailysignals.app";

export const Route = createFileRoute("/admin/login")({
  staticData: { sitemap: false },
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => ({ meta: [
    { title: "เข้าสู่ระบบผู้ดูแล — Thailand Daily Signals" },
    { name: "description", content: "หน้าเข้าสู่ระบบสำหรับผู้ดูแล Thailand Daily Signals" },
    { name: "robots", content: "noindex" },
    { property: "og:title", content: "เข้าสู่ระบบผู้ดูแล — Thailand Daily Signals" },
    { property: "og:description", content: "หน้าเข้าสู่ระบบสำหรับผู้ดูแล" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Login,
});

function Login() {
  const { next } = Route.useSearch();
  const nav = useNavigate();
  const [user, setUser] = useState("admin");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const email = user.includes("@") ? user.trim() : user.trim().toLowerCase() === "admin" ? ADMIN_EMAIL : "";
    const { error } = email ? await supabase.auth.signInWithPassword({ email, password: pw }) : { error: new Error("x") };
    setBusy(false);
    if (error) { setErr("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"); return; }
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
    window.location.href = safe;
    void nav;
  };
  return (
    <main className="mx-auto max-w-sm px-4 py-16 font-editorial-body">
      <h1 className="font-editorial text-4xl">เข้าสู่ระบบผู้ดูแล</h1>
      <p className="mt-2 text-sm text-muted-foreground">สำหรับผู้ดูแลระบบเท่านั้น ผู้อ่านทั่วไปไม่ต้องเข้าสู่ระบบ</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block text-sm">ชื่อผู้ใช้<Input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" className="mt-1" /></label>
        <label className="block text-sm">รหัสผ่าน<Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" className="mt-1" /></label>
        {err && <p className="text-sm text-editorial-red" role="alert">{err}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</Button>
      </form>
    </main>
  );
}
