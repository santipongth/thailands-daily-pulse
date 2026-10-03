import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Masthead } from "@/components/masthead";

export const Route = createFileRoute("/search")({
  staticData: { sitemap: true },
  validateSearch: z.object({ q: z.string().optional(), tab: z.enum(["all", "signals", "updates"]).optional() }),
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
const POPULAR = ["ดีเซล", "ทอง", "ฝน", "PM2.5", "แผ่นดินไหว", "รถไฟฟ้า"];
const SEV: Record<string, [string, string]> = {
  high: ["สำคัญมาก", "bg-editorial-red text-editorial-paper"],
  medium: ["น่าจับตา", "border border-editorial-red text-editorial-red"],
  low: ["เล็กน้อย", "border border-editorial-rule text-muted-foreground"],
};
const thDay = (d: string) => new Date(`${d}T00:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit" });
const thMonth = (d: string) => new Date(`${d}T00:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", month: "long", year: "numeric" });
const num = (v: number | null) => (v === null ? "—" : Number(v).toLocaleString("th-TH", { maximumFractionDigits: 2 }));

function Mark({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return <>{parts.map((p, i) => (p.toLowerCase() === term.toLowerCase() ? <mark key={i} className="bg-accent px-0.5 text-foreground">{p}</mark> : <Fragment key={i}>{p}</Fragment>))}</>;
}

type Item = { key: string; date: string; kind: "signal" | "update"; node: React.ReactNode };

function SearchPage() {
  const { q = "", tab = "all" } = Route.useSearch();
  const nav = Route.useNavigate();
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);
  useEffect(() => { const id = setTimeout(() => { if (text !== q) void nav({ search: (s) => ({ ...s, q: text || undefined }), replace: true }); }, 350); return () => clearTimeout(id); }, [text, q, nav]);
  const term = clean(q);
  const { data, isFetching } = useQuery({
    queryKey: ["search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const [sig, upd, fam] = await Promise.all([
        supabase.from("signals").select("id,family_id,signal_date,severity,title,prev_value,new_value,change_pct").eq("is_demo", false).ilike("title", `%${term}%`).order("signal_date", { ascending: false }).limit(50),
        supabase.from("brief_updates").select("id,brief_date,title,body").or(`title.ilike.%${term}%,body.ilike.%${term}%`).order("brief_date", { ascending: false }).limit(30),
        supabase.from("families").select("id,name_th"),
      ]);
      return { signals: sig.data ?? [], updates: upd.data ?? [], fam: new Map((fam.data ?? []).map((f) => [f.id, f.name_th])) };
    },
  });

  const items: Item[] = [];
  if (data) {
    if (tab !== "updates") for (const s of data.signals) {
      const [label, cls] = SEV[s.severity] ?? SEV["low"]!;
      const pct = s.change_pct === null ? null : Number(s.change_pct);
      items.push({ key: `s${s.id}`, date: s.signal_date, kind: "signal", node: (
        <article className="grid gap-1 py-4 sm:grid-cols-[6rem_1fr_auto] sm:gap-5">
          <Link to="/day/$date" params={{ date: s.signal_date }} className="text-xs text-muted-foreground hover:underline sm:pt-1">{thDay(s.signal_date)}</Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`px-1.5 py-0.5 font-semibold ${cls}`}>{label}</span>
              <span className="uppercase tracking-wider text-muted-foreground">{data.fam.get(s.family_id) ?? s.family_id}</span>
            </div>
            <Link to="/signals/$family" params={{ family: s.family_id }} className="mt-1 block font-editorial text-xl leading-snug hover:underline"><Mark text={s.title} term={term} /></Link>
          </div>
          <div className="text-sm tabular-nums sm:text-right">
            <div className="text-muted-foreground">{num(s.prev_value)} → <b className="text-foreground">{num(s.new_value)}</b></div>
            {pct !== null && <div className={pct > 0 ? "font-semibold text-editorial-red" : "font-semibold text-foreground"}>{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</div>}
          </div>
        </article>
      ) });
    }
    if (tab !== "signals") for (const u of data.updates) items.push({ key: `u${u.id}`, date: u.brief_date, kind: "update", node: (
      <article className="grid gap-1 py-4 sm:grid-cols-[6rem_1fr_auto] sm:gap-5">
        <span className="text-xs text-muted-foreground sm:pt-1">{thDay(u.brief_date)}</span>
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">อัปเดตหลัง Brief</span>
          <Link to="/brief/$date" params={{ date: u.brief_date }} className="mt-1 block font-editorial text-xl leading-snug hover:underline"><Mark text={u.title} term={term} /></Link>
          {u.body && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground"><Mark text={u.body} term={term} /></p>}
        </div>
        <span />
      </article>
    ) });
    items.sort((a, b) => b.date.localeCompare(a.date));
  }
  const months: [string, Item[]][] = [];
  for (const it of items) { const m = it.date.slice(0, 7); const last = months[months.length - 1]; if (last && last[0] === m) last[1].push(it); else months.push([m, [it]]); }
  const tabs: [typeof tab, string, number][] = [["all", "ทั้งหมด", (data?.signals.length ?? 0) + (data?.updates.length ?? 0)], ["signals", "สัญญาณ", data?.signals.length ?? 0], ["updates", "อัปเดตหลัง Brief", data?.updates.length ?? 0]];

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="page-shell">
        <div className="border-b-2 border-editorial-ink pb-6">
          <h1 className="font-editorial text-4xl sm:text-5xl">ค้นหาสัญญาณย้อนหลัง</h1>
          <p className="mt-2 text-sm text-muted-foreground">ค้นทุกการเปลี่ยนแปลงที่ระบบตรวจพบ และอัปเดตที่ออกหลัง Daily Brief</p>
          <div className="mt-5 flex items-center gap-3 border-2 border-editorial-ink bg-background px-4 py-3 focus-within:border-editorial-red">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์คำค้น เช่น ดีเซล ทอง ฝน" aria-label="คำค้น"
              className="min-w-0 flex-1 bg-transparent font-editorial text-2xl outline-none placeholder:text-muted-foreground/60" />
            {text && <button type="button" aria-label="ล้างคำค้น" onClick={() => setText("")} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">คำค้นยอดนิยม:</span>
            {POPULAR.map((p) => (
              <button key={p} type="button" onClick={() => setText(p)} className={`border px-2.5 py-1 ${clean(text) === p ? "border-editorial-ink bg-foreground text-background" : "border-editorial-rule hover:border-editorial-ink"}`}>{p}</button>
            ))}
          </div>
        </div>

        {term.length < 2 ? <p className="mt-8 text-muted-foreground">พิมพ์อย่างน้อย 2 ตัวอักษร หรือกดคำค้นยอดนิยมด้านบน</p>
          : isFetching && !data ? <p className="mt-8 text-muted-foreground">กำลังค้นหา…</p>
          : data && (
          <>
            <div className="mt-6 flex flex-wrap gap-1 border-b border-editorial-rule" role="tablist">
              {tabs.map(([k, l, n]) => (
                <Link key={k} to="/search" search={{ q, tab: k === "all" ? undefined : k }} replace role="tab" aria-selected={tab === k}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === k ? "border-editorial-red font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {l} <span className="tabular-nums text-muted-foreground">({n})</span>
                </Link>
              ))}
            </div>
            {!items.length ? (
              <div className="mt-8 border-l-4 border-editorial-red pl-4">
                <p className="font-editorial text-2xl">ไม่พบผลสำหรับ “{term}”</p>
                <p className="mt-1 text-sm text-muted-foreground">ลองคำที่สั้นลง หรือคำอื่น เช่น {POPULAR.slice(0, 3).join(", ")} · ถ้าตัวเลขยังนิ่ง อาจไม่มีสัญญาณ ดูได้ที่ <Link to="/unchanged" className="underline">ข้อมูลที่ยังไม่เปลี่ยน</Link></p>
              </div>
            ) : months.map(([m, list]) => (
              <section key={m} className="mt-8">
                <h2 className="font-editorial text-lg text-editorial-red">{thMonth(`${m}-01`)} <span className="font-editorial-body text-xs text-muted-foreground">({list.length})</span></h2>
                <div className="divide-y divide-editorial-rule border-t border-editorial-ink">{list.map((it) => <Fragment key={it.key}>{it.node}</Fragment>)}</div>
              </section>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
