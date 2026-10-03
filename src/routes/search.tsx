import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Masthead } from "@/components/masthead";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/search")({
  staticData: { sitemap: true },
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({ meta: [
    { title: "ค้นหาสัญญาณย้อนหลัง — Thailand Daily Signals" },
    { name: "description", content: "ค้นหาสัญญาณการเปลี่ยนแปลงและอัปเดต Daily Brief ย้อนหลัง เช่น น้ำมัน ทอง ฝน แผ่นดินไหว" },
    { property: "og:title", content: "ค้นหาสัญญาณย้อนหลัง — Thailand Daily Signals" },
    { property: "og:description", content: "ค้นหาการเปลี่ยนแปลงที่ระบบตรวจพบย้อนหลังทั้งหมด" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: SearchPage,
});

const clean = (s: string) => s.replace(/[%,()*\\]/g, " ").trim().slice(0, 60);

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const nav = Route.useNavigate();
  const [text, setText] = useState(q);
  useEffect(() => { const id = setTimeout(() => { if (text !== q) void nav({ search: { q: text || undefined }, replace: true }); }, 350); return () => clearTimeout(id); }, [text, q, nav]);
  const term = clean(q);
  const { data, isFetching } = useQuery({
    queryKey: ["search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const [sig, upd] = await Promise.all([
        supabase.from("signals").select("id,family_id,signal_date,severity,title,is_demo").eq("is_demo", false).ilike("title", `%${term}%`).order("signal_date", { ascending: false }).limit(50),
        supabase.from("brief_updates").select("id,brief_date,title,body").or(`title.ilike.%${term}%,body.ilike.%${term}%`).order("brief_date", { ascending: false }).limit(30),
      ]);
      return { signals: sig.data ?? [], updates: upd.data ?? [] };
    },
  });
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="page-shell">
        <h1 className="font-editorial text-4xl sm:text-5xl">ค้นหาสัญญาณย้อนหลัง</h1>
        <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="เช่น ดีเซล, ทอง, ฝน, แผ่นดินไหว" className="mt-4 max-w-xl" aria-label="คำค้น" />
        {term.length < 2 ? <p className="mt-4 text-sm text-muted-foreground">พิมพ์อย่างน้อย 2 ตัวอักษร</p> : isFetching && !data ? <p className="mt-4">กำลังค้นหา…</p> : data && (
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="section-heading text-2xl">สัญญาณ ({data.signals.length})</h2>
              {data.signals.length === 0 ? <p className="mt-2 text-sm">ไม่พบสัญญาณที่ตรงกับ “{term}”</p> : (
                <ul className="mt-2 divide-y divide-editorial-rule">{data.signals.map((s) => (
                  <li key={s.id} className="py-3"><Link to="/signals/$family" params={{ family: s.family_id }} className="hover:underline">{s.title}</Link>
                    <div className="text-xs text-muted-foreground"><Link to="/day/$date" params={{ date: s.signal_date }} className="underline">{s.signal_date}</Link> · ระดับ {s.severity}</div></li>
                ))}</ul>
              )}
            </section>
            <section>
              <h2 className="section-heading text-2xl">อัปเดตหลัง Brief ออก ({data.updates.length})</h2>
              {data.updates.length === 0 ? <p className="mt-2 text-sm">ไม่พบอัปเดตที่ตรงกับ “{term}”</p> : (
                <ul className="mt-2 divide-y divide-editorial-rule">{data.updates.map((u) => (
                  <li key={u.id} className="py-3"><Link to="/brief/$date" params={{ date: u.brief_date }} className="hover:underline">{u.title}</Link>
                    <div className="text-xs text-muted-foreground">Brief {u.brief_date}</div></li>
                ))}</ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
