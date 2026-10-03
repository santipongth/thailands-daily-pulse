import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { USAGE, impactFor } from "@/lib/impact";
import { useCutEvents, CutEventsList } from "@/components/cut-events";

export const Route = createFileRoute("/_admin/impact")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "ติดตามสูตรผลกระทบต่อครัวเรือน — Thailand Daily Signals" },
      { name: "description", content: "ตัวเลขการใช้ที่อ้างอิงหน่วยงานรัฐ ราคาเมื่อวานกับวันนี้ และผลต่อค่าใช้จ่ายรายวัน/เดือน พร้อมแก้ตัวเลขการใช้ของคุณเอง" },
      { property: "og:title", content: "ติดตามสูตรผลกระทบต่อครัวเรือน" },
      { property: "og:description", content: "ดูตัวเลขที่ใช้คำนวณ ผลลัพธ์ และลองใส่ตัวเลขการใช้ของคุณเอง" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImpactPage,
});

const KEY = "tds-usage-overrides";
const ids = Object.keys(USAGE);
const fmt = (n: number | null) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`);

function ImpactPage() {
  const [over, setOver] = useState<Record<string, number>>({});
  useEffect(() => { try { setOver(JSON.parse(localStorage.getItem(KEY) ?? "{}")); } catch { /* ignore */ } }, []);
  const save = (o: Record<string, number>) => { setOver(o); localStorage.setItem(KEY, JSON.stringify(o)); };

  const { data: cuts } = useCutEvents();
  const cutOf = (id: string) => (cuts ?? []).flatMap((c) => (c.w.excluded ?? []).filter((e) => e.metric_id === id).map((e) => ({ ...e, date: c.date })))[0];
  const { data: obs } = useQuery({
    queryKey: ["impact-obs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("observations").select("metric_id,observed_on,value").in("metric_id", ids).eq("is_demo", false).order("observed_on", { ascending: false }).limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="page-shell">
        <h1 className="font-editorial text-4xl sm:text-5xl">ติดตามสูตรผลกระทบ</h1>
        <p className="mt-2 text-muted-foreground">สูตร: (ราคาวันนี้ − ราคาก่อนหน้า) × ตัวเลขการใช้ = บาท/วัน แล้ว × 30 = บาท/เดือน (ทอง/เงินตรา = ต่อครั้ง). Daily Brief ใช้ตัวเลขทางการเสมอ — ตัวเลขที่คุณแก้เก็บเฉพาะเครื่องนี้</p>
        <button className="mt-3 border border-foreground px-3 py-1 text-sm" onClick={() => save({})}>คืนค่าทางการทั้งหมด</button>
        <div className="mt-6 space-y-4">
          {ids.map((id) => {
            const u = USAGE[id]!;
            const rows = (obs ?? []).filter((o) => o.metric_id === id);
            const cur = rows[0], prev = rows[1];
            const mine = over[id];
            const c = cur ? impactFor({ metric_id: id, prev_value: prev ? Number(prev.value) : null, new_value: Number(cur.value) }, mine) : null;
            return (
              <section key={id} className="border-t-2 border-editorial-ink bg-editorial-surface p-4 shadow-[var(--shadow-editorial)]">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
                  <h2 className="min-w-0 font-editorial text-xl">{u.label}</h2>
                  <span className={`text-xs ${u.official ? "" : "text-muted-foreground"}`}>{u.official ? "ตัวเลขอ้างอิงหน่วยงานรัฐ" : "ตัวเลขตัวอย่าง"}</span>
                </div>
                {(() => { const c = cutOf(id); return c ? <p className="text-sm font-semibold">ไม่อยู่ใน Brief วันที่ {c.date} — {c.reason}</p> : null; })()}
                <p className="text-sm text-muted-foreground">ที่มา: {u.url ? <a href={u.url} target="_blank" rel="noreferrer" className="underline">{u.source}</a> : u.source} · วิธีแปลง: {u.method}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <label htmlFor={`q-${id}`}>การใช้ ({u.unit}{u.period === "daily" ? "/วัน" : "/ครั้ง"}):</label>
                  <input id={`q-${id}`} type="number" step="any" min="0" className="w-28 border border-input bg-background px-2 py-1"
                    value={mine ?? u.qty}
                    onChange={(e) => { const v = e.target.value === "" ? NaN : Number(e.target.value); const o = { ...over }; if (isNaN(v) || v === u.qty) delete o[id]; else o[id] = v; save(o); }} />
                  {mine != null && <span className="text-xs">(ทางการ {u.qty})</span>}
                </div>
                {!cur ? <p className="mt-2 text-sm">ยังไม่มีข้อมูลราคาจริง</p> : !c ? <p className="mt-2 text-sm">ราคา {Number(cur.value)} ({cur.observed_on}) — ยังไม่มีค่าก่อนหน้าให้เทียบ</p> : (
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <ol className="space-y-0.5">{c.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                    <dl className="grid grid-cols-2 gap-1">
                      <dt>ก่อนหน้า ({prev!.observed_on})</dt><dd>{c.prev}</dd>
                      <dt>ล่าสุด ({cur.observed_on})</dt><dd>{c.cur}</dd>
                      <dt>ส่วนต่าง</dt><dd>{fmt(c.change)}</dd>
                      {c.period === "daily" ? <><dt>บาท/วัน</dt><dd className="font-semibold">{fmt(c.per_day)}</dd><dt>บาท/เดือน</dt><dd className="font-semibold">{fmt(c.per_month)}</dd></>
                        : <><dt>บาท/ครั้ง</dt><dd className="font-semibold">{fmt(c.per_once)}</dd></>}
                    </dl>
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <CutEventsList />
      </main>
    </div>
  );
}
