import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";
import { Masthead } from "@/components/masthead";
import { KINDS, KIND_TH, agencyOf, loadHistory, type Kind } from "@/lib/station-data";

export const Route = createFileRoute("/station/$kind/$id")({
  staticData: { sitemap: false },
  beforeLoad: ({ params }) => { if (!KINDS.includes(params.kind as Kind)) throw notFound(); },
  head: ({ params }) => ({
    meta: [
      { title: `${KIND_TH[params.kind as Kind] ?? "สถานี"} ${params.id} — แนวโน้มรายสถานี` },
      { name: "description", content: `ค่าล่าสุดและกราฟแนวโน้ม 24 ชม./7 วัน/30 วัน ของสถานี ${params.id} จากข้อมูลที่เก็บได้จริง` },
      { property: "og:title", content: `${KIND_TH[params.kind as Kind] ?? "สถานี"} ${params.id} — Thailand Daily Signals` },
      { property: "og:description", content: "แนวโน้มรายสถานีจากหน่วยงานจริง ช่วงไม่มีข้อมูลเว้นว่างไว้" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Station,
});

const RANGES = [[1, "24 ชม."], [7, "7 วัน"], [30, "30 วัน"]] as const;
const fmt = (ms: number, days: number) => new Date(ms).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", ...(days <= 1 ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short" }) });
const full = (ms: number) => new Date(ms).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });

function Station() {
  const { kind, id } = Route.useParams() as { kind: Kind; id: string };
  const [days, setDays] = useState<number>(kind === "rail" ? 30 : 7);
  const { data, isLoading } = useQuery({ queryKey: ["station", kind, id, days], queryFn: () => loadHistory(kind, id, days) });
  const a = agencyOf(kind);
  const pts = data?.points ?? [];
  const last = [...pts].reverse().find((p) => p.v != null);
  // Insert a null point where readings are > 3× the usual spacing apart, so missing data shows as a break.
  const series = pts.flatMap((p, i) => (i > 0 && kind !== "rail" && p.t - pts[i - 1]!.t > Math.max(4 * 3600e3, days * 864e5 / 40) ? [{ t: pts[i - 1]!.t + 1, v: null, v2: null }, p] : [p]));
  return (
    <div className="page-shell">
      <Masthead />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link to="/stations" search={{ kind }} className="text-sm underline">← {KIND_TH[kind]} ทั้งหมด</Link>
        <h1 className="section-heading mt-2 text-3xl">{data?.name ?? id}</h1>
        {data?.area && <p className="text-sm text-muted-foreground">{data.area}</p>}
        {isLoading ? <p className="mt-4 text-sm text-muted-foreground">กำลังโหลด…</p> : !data ? (
          <p className="mt-4 text-sm text-muted-foreground">ยังไม่มีข้อมูลของสถานีนี้ในช่วงที่เลือก</p>
        ) : (
          <>
            <div className="mt-4 grid gap-4 border-y-2 border-editorial-ink py-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">ค่าล่าสุด — {data.label}</p><p className="font-editorial text-3xl">{last?.v ?? "—"} <span className="text-base">{data.unit}</span></p>{last?.note && <p className="text-xs">{last.note}</p>}</div>
              <div><p className="text-xs text-muted-foreground">เวลาวัด</p><p>{last ? full(last.t) : "—"}</p><p className="text-xs text-muted-foreground">{pts.length} ค่าในช่วงนี้</p></div>
              <div><p className="text-xs text-muted-foreground">หน่วยงาน</p><a href={a.url} target="_blank" rel="noopener" className="underline">{a.agency} ↗</a>
                {data.lat != null && <p className="text-xs text-muted-foreground">พิกัด {data.lat.toFixed(4)}, {data.lng!.toFixed(4)}{data.approx ? " (ตำแหน่งโดยประมาณ)" : ""} · <Link to="/" search={{ layers: kind, pt: `${kind}:${id}` } as never} className="underline">ดูบนแผนที่</Link></p>}
              </div>
            </div>
            <div className="mt-6 flex items-baseline gap-3">
              <h2 className="font-editorial text-2xl">แนวโน้ม</h2>
              {RANGES.map(([d, l]) => <button key={d} type="button" onClick={() => setDays(d)} className={days === d ? "font-semibold underline" : "text-muted-foreground hover:underline"}>{l}</button>)}
            </div>
            <div className="mt-3 h-72 w-full">
              <ResponsiveContainer>
                {kind === "rail" ? (
                  <BarChart data={series}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="t" tickFormatter={(v) => fmt(v, days)} fontSize={11} /><YAxis allowDecimals={false} fontSize={11} width={30} /><Tooltip labelFormatter={(v) => fmt(Number(v), 30)} /><Bar dataKey="v" name={data.label} fill="var(--foreground)" /></BarChart>
                ) : (
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(v) => fmt(v, days)} fontSize={11} />
                    <YAxis fontSize={11} width={40} />
                    <Tooltip labelFormatter={(v) => full(Number(v))} />
                    <Line dataKey="v" name={`${data.label} (${data.unit})`} stroke="var(--foreground)" dot={pts.length < 60} connectNulls={false} isAnimationActive={false} />
                    {data.label2 && <Line dataKey="v2" name={`${data.label2} (${data.unit2})`} stroke="var(--muted-foreground)" strokeDasharray="4 3" dot={false} connectNulls={false} isAnimationActive={false} />}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">ใช้เฉพาะค่าที่เก็บได้จริง ช่วงที่ไม่มีข้อมูลเว้นเป็นช่องว่าง ไม่เติมค่าเอง · ข้อมูลรายสถานีเก็บย้อนหลัง 90 วัน</p>
            {data.posts && (
              <ul className="mt-6 divide-y divide-editorial-rule border-y border-editorial-ink">
                {!data.posts.length && <li className="py-3 text-sm text-muted-foreground">ไม่มีประกาศเหตุขัดข้องในช่วงนี้</li>}
                {data.posts.map((p) => <li key={p.url} className="py-3 text-sm"><span className="text-xs text-muted-foreground">{full(Date.parse(p.posted_at))}</span><a href={p.url} target="_blank" rel="noopener" className="block hover:underline">{p.text}</a></li>)}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
