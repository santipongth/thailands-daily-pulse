import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Masthead } from "@/components/masthead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { listCustom, previewSignalRule, saveSignalRule } from "@/lib/custom.functions";

export const Route = createFileRoute("/_admin/custom-signals")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "สัญญาณของฉัน — Thailand Daily Signals" },
      { name: "description", content: "ผู้ดูแลกำหนดเกณฑ์สัญญาณใหม่พร้อมวันที่มีผล และดูตัวอย่างย้อนหลังจากข้อมูลจริง" },
      { property: "og:title", content: "สัญญาณของฉัน" },
      { property: "og:description", content: "เกณฑ์สัญญาณพร้อมวันที่มีผล" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const KIND: Record<string, string> = { delta: "ค่าเปลี่ยน (จำนวน และ/หรือ %)", level: "ข้ามระดับ", release: "ประกาศค่าใหม่" };
const num = (s: string) => (s.trim() === "" ? null : Number(s));

function Page() {
  const list = useServerFn(listCustom);
  const preview = useServerFn(previewSignalRule);
  const save = useServerFn(saveSignalRule);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["custom-list"], queryFn: () => list() });
  const [f, setF] = useState({ metric_id: "", kind: "delta", abs: "", pct: "", bands: "", from: "", note: "" });
  const [pv, setPv] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setPv(null); setMsg(null); };
  const metric = q.data?.metrics.find((m) => m.id === f.metric_id);
  const rule = { metric_id: f.metric_id, kind: f.kind as "delta", threshold_abs: f.kind === "delta" ? num(f.abs) : null, threshold_pct: f.kind === "delta" ? num(f.pct) : null,
    bands: f.kind === "level" ? f.bands.split(/[,\s]+/).filter(Boolean).map(Number).filter(Number.isFinite).sort((a, b) => a - b) : null };
  const from = f.from || q.data?.today || "";
  const history = (q.data?.rules ?? []).filter((r) => !f.metric_id || r.metric_id === f.metric_id);
  const names = new Map(q.data?.metrics.map((m) => [m.id, m.name_th]));
  const fail = (e: any) => setMsg(String(e?.message ?? e).replace(/^.*?"message":\s*"([^"]+)".*$/s, "$1"));

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="page-shell max-w-3xl space-y-8">
        <header>
          <h1 className="font-editorial text-4xl">สัญญาณของฉัน</h1>
          <p className="mt-2 text-muted-foreground">ตั้งเกณฑ์สัญญาณให้ตัวชี้วัดใดก็ได้ (รวมแหล่งที่เพิ่มเองใน <Link to="/custom-sources" className="underline">แหล่งข้อมูลของฉัน</Link>) เกณฑ์ใช้ตั้งแต่วันที่มีผลเป็นต้นไป ไม่ย้อนตัดสินวันก่อนหน้า และ Brief ที่เผยแพร่แล้วไม่เปลี่ยน ผู้อ่านตั้งเกณฑ์เองไม่ได้</p>
        </header>

        <section className="space-y-4">
          <h2 className="border-b border-border pb-1 text-xl font-bold text-primary">เกณฑ์ใหม่</h2>
          <div className="space-y-1"><Label htmlFor="metric">ตัวชี้วัด</Label>
            <select id="metric" value={f.metric_id} onChange={set("metric_id")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— เลือก —</option>
              {q.data?.metrics.map((m) => <option key={m.id} value={m.id}>{m.name_th} ({m.unit || "—"}) · {m.id}</option>)}
            </select>
            {metric && <p className="text-xs text-muted-foreground">เกณฑ์เดิมในระบบ: {metric.kind} · {metric.threshold_abs ?? "—"} {metric.unit} · {metric.threshold_pct ?? "—"}% · ระดับ {metric.bands?.join(", ") || "—"}</p>}
          </div>
          <div className="space-y-1"><Label htmlFor="kind">ชนิดเกณฑ์</Label>
            <select id="kind" value={f.kind} onChange={set("kind")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          {f.kind === "delta" && <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="abs">เปลี่ยนอย่างน้อย ({metric?.unit || "หน่วย"})</Label><Input id="abs" inputMode="decimal" value={f.abs} onChange={set("abs")} /></div>
            <div className="space-y-1"><Label htmlFor="pct">หรือเปลี่ยนอย่างน้อย (%)</Label><Input id="pct" inputMode="decimal" value={f.pct} onChange={set("pct")} /></div>
          </div>}
          {f.kind === "level" && <div className="space-y-1"><Label htmlFor="bands">ระดับ (คั่นด้วยจุลภาค)</Label><Input id="bands" value={f.bands} onChange={set("bands")} /><p className="text-xs text-muted-foreground">เช่น 37.5, 75 — ข้าม 1 ระดับ = น่าจับตา, ถึงระดับ 2 = สำคัญมาก</p></div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="from">วันที่มีผล</Label><Input id="from" type="date" min={q.data?.today} value={from} onChange={set("from")} /></div>
            <div className="space-y-1"><Label htmlFor="note">ที่มาของเกณฑ์</Label><Input id="note" value={f.note} onChange={set("note")} placeholder="เช่น ประกาศกรมควบคุมมลพิษ" /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!f.metric_id} onClick={() => preview({ data: rule }).then(setPv).catch(fail)}>ดูตัวอย่างย้อนหลัง</Button>
            <Button disabled={!f.metric_id} onClick={() => save({ data: { rule, effective_from: from, note: f.note || null } })
              .then((r) => { setMsg(r.ok ? `บันทึกแล้ว — มีผลตั้งแต่ ${from}` : r.error); if (r.ok) qc.invalidateQueries({ queryKey: ["custom-list"] }); }).catch(fail)}>บันทึกเกณฑ์</Button>
          </div>
          {msg && <p className="font-semibold">{msg}</p>}
          {pv && <div className="rounded border border-border bg-muted p-3 text-sm">
            <p>จากข้อมูลจริง {pv.readings} วันล่าสุด จะเกิดสัญญาณ <b>{pv.hits.length}</b> ครั้ง <span className="text-xs text-muted-foreground">(ตัวอย่างอย่างง่าย ไม่รวมตัวกรองความผันผวนและความน่าเชื่อถือของระบบจริง)</span></p>
            <ul className="mt-2 space-y-0.5">{pv.hits.map((h: any) => <li key={h.date}>{h.date}: {h.prev} → {h.cur} · {h.why}</li>)}</ul>
          </div>}
        </section>

        <section className="space-y-2">
          <h2 className="border-b border-border pb-1 text-xl font-bold text-primary">ประวัติเกณฑ์{metric ? ` — ${metric.name_th}` : ""}</h2>
          {!history.length && <p className="text-sm text-muted-foreground">ยังไม่มี — ตัวชี้วัดใช้เกณฑ์เดิมในระบบ</p>}
          {history.map((r) => (
            <div key={r.id} className="border-b border-border py-2 text-sm">
              <b>มีผล {r.effective_from}</b> · {names.get(r.metric_id) ?? r.metric_id} · {KIND[r.kind]} · {r.kind === "delta" ? `${r.threshold_abs ?? "—"} / ${r.threshold_pct ?? "—"}%` : r.kind === "level" ? `ระดับ ${r.bands?.join(", ")}` : ""}{r.note ? ` · ${r.note}` : ""}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
