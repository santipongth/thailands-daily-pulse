import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Masthead } from "@/components/masthead";
import { loadMapData, isStale } from "@/lib/bkk-map-data";
import { KINDS, KIND_TH, type Kind } from "@/lib/station-data";

export const Route = createFileRoute("/stations")({
  staticData: { sitemap: true },
  validateSearch: (s) => z.object({ kind: z.enum(["pm25", "weather", "road", "water", "rail"]).optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "ข้อมูลรายสถานี กรุงเทพฯ — Thailand Daily Signals" },
      { name: "description", content: "ค่าล่าสุดและกราฟแนวโน้มของทุกสถานี: PM2.5 สถานีอุตุฯ น้ำท่วมถนน ระดับน้ำคลอง และรถไฟฟ้า BTS/MRT" },
      { property: "og:title", content: "ข้อมูลรายสถานี กรุงเทพฯ — Thailand Daily Signals" },
      { property: "og:description", content: "ค่าล่าสุดและแนวโน้มรายสถานีจากหน่วยงานจริง" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stations,
});

const t = (iso: string | null) => (iso ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

function Stations() {
  const { kind = "pm25" } = Route.useSearch();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["bkk-map"], queryFn: loadMapData, refetchInterval: 10 * 60e3 });
  const rows = (data?.pts ?? []).filter((p) => p.layer === kind && (!q || `${p.name} ${p.area ?? ""} ${p.district ?? ""}`.includes(q))).sort((a, b) => b.severity - a.severity);
  return (
    <div className="page-shell">
      <Masthead />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="section-heading text-4xl">ข้อมูลรายสถานี</h1>
        <p className="mt-2 text-sm text-muted-foreground">ค่าล่าสุดของทุกสถานีในกรุงเทพฯ และปริมณฑล เรียงจากค่าที่น่ากังวลที่สุด กดชื่อสถานีเพื่อดูกราฟแนวโน้ม</p>
        <div className="mt-6 flex flex-wrap gap-2 border-b-2 border-editorial-ink pb-2">
          {KINDS.map((k: Kind) => (
            <Link key={k} to="/stations" search={{ kind: k }} className={`px-3 py-1.5 text-sm ${k === kind ? "bg-foreground text-background font-semibold" : "border border-editorial-rule hover:bg-accent"}`}>{KIND_TH[k]}</Link>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ เขต ถนน คลอง" aria-label="ค้นหาสถานี" className="ml-auto border border-editorial-rule bg-background px-2 py-1.5 text-sm" />
        </div>
        {isLoading && <p className="mt-4 text-sm text-muted-foreground">กำลังโหลด…</p>}
        {!isLoading && !rows.length && <p className="mt-4 text-sm text-muted-foreground">ยังไม่มีสถานีในหมวดนี้จากรอบล่าสุด</p>}
        <ul className="divide-y divide-editorial-rule">
          {rows.map((p) => (
            <li key={p.key} className={`flex flex-wrap items-baseline gap-x-3 py-3 ${isStale(p.at) ? "opacity-60" : ""}`}>
              <span className={`bkk-dot map-b${p.band}`} aria-hidden />
              <Link to="/station/$kind/$id" params={{ kind, id: p.key.slice(kind.length + 1).replace(" (X)", "") }} className="font-semibold hover:underline">{p.name}</Link>
              <span className="text-xs text-muted-foreground">{p.district ?? p.area ?? ""}</span>
              <span className="ml-auto text-sm">{p.label}</span>
              <span className="w-full text-xs text-muted-foreground sm:w-auto">อัปเดต {t(p.at)}</span>
            </li>
          ))}
        </ul>
        {data?.updated[kind] && <p className="mt-3 text-xs text-muted-foreground">รอบข้อมูลล่าสุด {t(data.updated[kind]!)}</p>}
      </main>
    </div>
  );
}
