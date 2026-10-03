import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getSystemHealth, requeueFailedJobs, cleanupOldJobs } from "@/lib/admin.functions";
import { retrySources } from "@/lib/signals.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADMIN_LINKS } from "./route";

export const Route = createFileRoute("/_admin/admin")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "ภาพรวมระบบ (ผู้ดูแล) — Thailand Daily Signals" },
    { name: "description", content: "สุขภาพระบบ งานที่ล้ม และเครื่องมือผู้ดูแล" },
    { name: "robots", content: "noindex" },
    { property: "og:title", content: "ภาพรวมระบบ — Thailand Daily Signals" },
    { property: "og:description", content: "สุขภาพระบบสำหรับผู้ดูแล" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminHome,
});

const t = (iso: string | null) => (iso ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }) : "—");

function AdminHome() {
  const health = useServerFn(getSystemHealth);
  const requeue = useServerFn(requeueFailedJobs);
  const cleanup = useServerFn(cleanupOldJobs);
  const retry = useServerFn(retrySources);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-health"], queryFn: () => health() });
  const act = async (label: string, fn: () => Promise<unknown>) => {
    try { const r = await fn(); toast.success(`${label}: ${JSON.stringify(r)}`); qc.invalidateQueries({ queryKey: ["admin-health"] }); }
    catch { toast.error(`${label} ไม่สำเร็จ`); }
  };
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 font-editorial-body">
      <h1 className="font-editorial text-4xl">ภาพรวมระบบ</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => act("ดึงข้อมูลใหม่ทุกแหล่ง", () => retry())}>ดึงข้อมูลใหม่ทุกแหล่ง</Button>
        <Button variant="outline" onClick={() => act("ส่งงานที่ล้ม (24 ชม.) เข้าคิวใหม่", () => requeue())}>ส่งงานที่ล้มเข้าคิวใหม่</Button>
        <Button variant="outline" onClick={() => act("ล้างประวัติเก่ากว่า 30 วัน", () => cleanup())}>ล้างประวัติเก่ากว่า 30 วัน</Button>
      </div>
      {isLoading && <p className="mt-6">กำลังโหลด…</p>}
      {error && <p className="mt-6 text-editorial-red">โหลดไม่สำเร็จ</p>}
      {data && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="border border-border p-4">
            <h2 className="font-editorial text-2xl">แหล่งที่ล้มติดกัน (2 วันล่าสุด)</h2>
            {data.failing.length === 0 ? <p className="mt-2 text-sm">ไม่มี — ทุกแหล่งดึงสำเร็จในรอบล่าสุด</p> : (
              <ul className="mt-2 space-y-2 text-sm">{data.failing.map((f) => (
                <li key={f.source} className="border-b border-border pb-2"><b>{f.source}</b> — ล้ม {f.fails} รอบติด (สำเร็จล่าสุด {t(f.last_ok)})<br /><span className="text-muted-foreground">{f.last_error?.slice(0, 160)}</span></li>
              ))}</ul>
            )}
          </section>
          <section className="border border-border p-4">
            <h2 className="font-editorial text-2xl">Daily Brief 7 วันล่าสุด</h2>
            <ul className="mt-2 space-y-1 text-sm">{data.briefs.map((b) => (
              <li key={b.brief_date}><Link to="/brief/$date" params={{ date: b.brief_date }} className="underline">{b.brief_date}</Link> — {b.published_at ? `ออก ${t(b.published_at)}` : <span className="text-editorial-red">ยังไม่ออก</span>}</li>
            ))}</ul>
            <p className="mt-3 text-sm">งานรอในคิว: {data.queued}</p>
          </section>
          <section className="border border-border p-4 lg:col-span-2">
            <h2 className="font-editorial text-2xl">งานที่ล้มถาวร ({data.failedJobs.length})</h2>
            <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm">
              <thead><tr><th>เวลา</th><th>แหล่ง</th><th>ครั้ง</th><th>เหตุผล</th></tr></thead>
              <tbody>{data.failedJobs.map((j) => (<tr key={j.id} className="border-t border-border align-top"><td className="whitespace-nowrap pr-2">{t(j.created_at)}</td><td className="pr-2">{j.source}</td><td>{j.attempts}</td><td className="text-muted-foreground">{j.error?.slice(0, 140)}</td></tr>))}</tbody>
            </table></div>
          </section>
          <section className="border border-border p-4">
            <h2 className="font-editorial text-2xl">หน้าผู้ดูแล</h2>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">{ADMIN_LINKS.slice(1).map(([to, label]) => <li key={to}><Link to={to} className="underline">{label}</Link></li>)}</ul>
          </section>
          <ChangePassword />
        </div>
      )}
    </main>
  );
}

function ChangePassword() {
  const [cur, setCur] = useState(""); const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false);
  return (
    <section className="border border-border p-4">
      <h2 className="font-editorial text-2xl">เปลี่ยนรหัสผ่าน</h2>
      <form className="mt-2 space-y-2" onSubmit={async (e) => {
        e.preventDefault(); if (pw.length < 10) { toast.error("รหัสผ่านใหม่อย่างน้อย 10 ตัวอักษร"); return; }
        setBusy(true); const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as never); setBusy(false);
        if (error) toast.error(`เปลี่ยนไม่สำเร็จ: ${error.message}`); else { toast.success("เปลี่ยนรหัสผ่านแล้ว"); setCur(""); setPw(""); }
      }}>
        <Input type="password" placeholder="รหัสผ่านปัจจุบัน" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        <Input type="password" placeholder="รหัสผ่านใหม่ (อย่างน้อย 10 ตัว)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <Button type="submit" disabled={busy}>บันทึก</Button>
      </form>
    </section>
  );
}
