import type React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { EVIDENCE_FACTOR, SEVERITY_WEIGHT, TRUST_FACTOR } from "@/lib/impact";

const methodQuery = queryOptions({
  queryKey: ["method"],
  queryFn: async () => {
    const [f, m] = await Promise.all([
      supabase.from("families").select("id,name_th,emoji,trust,reach,sort").order("sort"),
      supabase.from("metrics").select("id,family_id,name_th,unit,kind,threshold_abs,threshold_pct,min_pct,max_gap_days,vol_k,bands,sort").order("sort"),
    ]);
    if (f.error) throw f.error;
    if (m.error) throw m.error;
    const sg = await supabase.from("signals").select("*").eq("is_demo", false).not("checks", "is", null).order("signal_date", { ascending: false }).order("score", { ascending: false }).limit(20);
    const sample = (sg.data ?? []).find((x: any) => x.checks?.rule === "delta") ?? sg.data?.[0] ?? null;
    return { families: f.data, metrics: m.data, sample: sample as any };
  },
});

export const Route = createFileRoute("/method")({
  loader: ({ context }) => context.queryClient.ensureQueryData(methodQuery),
  head: () => ({
    meta: [
      { title: "วิธีคำนวณสัญญาณ — Thailand Daily Signals" },
      { name: "description", content: "สูตรตรวจจับ จัดอันดับ และคำนวณผลกระทบที่ตรวจสอบได้ พร้อมค่าเกณฑ์จริงของทุกตัวชี้วัด" },
      { property: "og:title", content: "วิธีคำนวณสัญญาณ — Thailand Daily Signals" },
      { property: "og:description", content: "ตัวเลขมาจากโค้ดและสถิติ ไม่ใช่ AI — ดูสูตรและเกณฑ์ทั้งหมด" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Method,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดไม่สำเร็จ: {(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-8">ไม่พบหน้า</div>,
});

const n = (v: unknown) => (v == null ? "—" : String(v));

function Method() {
  const { data } = useSuspenseQuery(methodQuery);
  const fam = Object.fromEntries(data.families.map((f) => [f.id, f]));
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        <header>
          <h1 className="font-display text-4xl">วิธีคำนวณสัญญาณ</h1>
          <p className="mt-2 text-muted-foreground">ตัวเลขทุกตัว (การเปลี่ยนแปลง, %, ผลต่อครัวเรือน, อันดับ) คำนวณโดยระบบจากสูตรด้านล่าง AI ใช้เรียบเรียงภาษาบทนำเท่านั้น และถ้าข้อความของ AI มีตัวเลขที่ไม่อยู่ในข้อเท็จจริงที่คำนวณไว้ ระบบจะทิ้งข้อความนั้นและใช้ข้อความแม่แบบแทน</p>
        </header>

        <section>
          <h2 className="font-display text-2xl">1. ตรวจจับการเปลี่ยนแปลง</h2>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm">
            <li><b>delta</b>: ratio = max(|Δ| ÷ เกณฑ์สัมบูรณ์, |Δ%| ÷ เกณฑ์ %) ÷ ตัวคูณความน่าเชื่อถือ (แหล่งระดับกลางต้องแรงขึ้น 1.5 เท่า) ต้อง ≥ 1</li>
            <li>|Δ%| ต้องไม่ต่ำกว่า min % ของตัวชี้วัด</li>
            <li>ความผันผวนปกติ: เมื่อมีข้อมูล ≥ 10 จุด z = |Δ| ÷ SD ของการเปลี่ยนรายวัน 30 ครั้งล่าสุด ต้อง ≥ vol_k</li>
            <li>ข้อมูลที่ห่างจากค่าก่อนหน้าเกิน max gap วัน จะไม่ถูกเทียบ</li>
            <li>ความรุนแรง: ratio ≥ 3 สูง, ≥ 1.5 กลาง, ≥ 1 ต่ำ · <b>level</b>: ข้ามระดับเกณฑ์ (bands) · <b>release</b>: มีประกาศรอบใหม่</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl">2. จัดอันดับ</h2>
          <p className="mt-3 border-2 border-foreground p-4 font-mono text-sm">คะแนน = น้ำหนักความรุนแรง × ตัวคูณความแรง × ความน่าเชื่อถือแหล่ง × ผลต่อครัวเรือน</p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm">
            <li>น้ำหนักความรุนแรง: สูง {SEVERITY_WEIGHT.high} · กลาง {SEVERITY_WEIGHT.medium} · ต่ำ {SEVERITY_WEIGHT.low}</li>
            <li>ตัวคูณความแรง = z ÷ vol_k จำกัดช่วง 1–2 (ไม่มีข้อมูลพอ = 1)</li>
            <li>ความน่าเชื่อถือแหล่ง: สูง {TRUST_FACTOR.high} · กลาง {TRUST_FACTOR.medium} · ต่ำ {TRUST_FACTOR.low}</li>
            <li>หลักฐานไฟล์ดิบ: {EVIDENCE_FACTOR.changed} เมื่อไฟล์ต้นฉบับของแหล่งในวันนั้นเปลี่ยนจากไฟล์ก่อนหน้า (SHA-256 ต่างกัน) · {EVIDENCE_FACTOR.unchanged} เมื่อไฟล์เหมือนเดิมหรือไม่มีไฟล์</li>
            <li>ข่าวหนังสือพิมพ์ไม่สร้างและไม่เพิ่มคะแนนสัญญาณ · วันที่มีข้อมูลจริง สัญญาณตัวอย่างได้คะแนน 0</li>
          </ul>
          <table className="mt-4 w-full text-sm">
            <thead><tr className="border-b-2 border-foreground text-left"><th className="py-1">กลุ่ม</th><th>ความน่าเชื่อถือ</th><th>ผลต่อครัวเรือน</th></tr></thead>
            <tbody>{data.families.map((f) => <tr key={f.id} className="border-b border-border"><td className="py-1">{f.emoji} {f.name_th}</td><td>{f.trust}</td><td>{n(f.reach)}</td></tr>)}</tbody>
          </table>
        </section>

        <section>
          <h2 className="font-display text-2xl">3. ผลต่อครัวเรือน</h2>
          <p className="mt-3 text-sm">ตะกร้าค่าใช้จ่ายรายวัน: (ราคาล่าสุด − ราคาก่อน) × ปริมาณต่อวัน (หมู 0.3 กก., อกไก่ 0.3 กก., ไข่ 4 ฟอง, ข้าว 0.5 กก., ผักบุ้ง 0.25 กก., น้ำมันปาล์ม 0.05 ขวด, แก๊สโซฮอล์ 95 3 ลิตร) และ × 30 เป็นรายเดือน · ต่อสัญญาณคำนวณจากตัวอย่างครัวเรือนอ้างอิงคงที่ เช่น รถเก๋งเติม 50 ลิตร × Δ ราคาต่อลิตร, กระบะดีเซล 70 ลิตร, ทอง 1 บาท, หมู 2 กก./สัปดาห์, ไข่ 30 ฟอง/เดือน, งบเที่ยว 1,000 ดอลลาร์ และ PM2.5 เทียบมาตรฐานไทย 37.5 µg/m³</p>
        </section>


        <section>
          <h2 className="font-display text-2xl">ตัวอย่างการคำนวณจากข้อมูลจริง</h2>
          {!data.sample ? <p className="mt-3 text-sm text-muted-foreground">ยังไม่มีสัญญาณจากข้อมูลจริงให้ยกตัวอย่าง</p> : (() => {
            const s = data.sample; const c = s.checks ?? {}; const k = c.score ?? {};
            const m = data.metrics.find((x) => x.id === s.metric_id); const u = m?.unit ?? "";
            const st = (t: string, v: React.ReactNode) => <li className="grid grid-cols-[14rem_1fr] gap-2 border-b border-border py-1"><span className="text-muted-foreground">{t}</span><span className="tabular-nums">{v}</span></li>;
            return (
              <div className="mt-3">
                <p className="font-semibold">{fam[s.family_id]?.emoji} {s.title} <span className="text-sm font-normal text-muted-foreground">({s.signal_date})</span></p>
                <ol className="mt-2 text-sm">
                  {st("1. ค่าก่อนหน้า", `${n(s.prev_value)} ${u} (${n(c.compared_with)}, ห่าง ${n(c.gap_days)} วัน ≤ ${n(c.max_gap_days)})`)}
                  {st("2. ค่าวันนี้", `${n(s.new_value)} ${u}`)}
                  {st("3. Δ และ Δ%", `${n(s.change_abs != null ? Number(s.change_abs).toFixed(2) : null)} ${u} · ${s.change_pct != null ? Number(s.change_pct).toFixed(2) + "%" : "—"}`)}
                  {c.rule === "delta" && st("4. เทียบเกณฑ์", `max(|Δ| ÷ ${n(c.threshold_abs)}, |Δ%| ÷ ${n(c.threshold_pct)}) ÷ ตัวคูณแหล่ง ${n(c.trust_multiplier)} = ratio ${n(c.ratio)} (ต้อง ≥ 1)`)}
                  {c.rule === "delta" && st("5. ความผันผวนปกติ", c.z != null ? `z = |Δ| ÷ SD ${n(c.sd)} = ${n(c.z)} ≥ vol_k ${n(c.vol_k)} (จาก ${n(c.vol_points)} จุด)` : "ข้อมูลยังไม่ถึง 10 จุด จึงข้ามขั้นนี้")}
                  {c.rule === "level" && st("4. ข้ามระดับ", `bands: ${(c.bands ?? []).join(", ")}`)}
                  {c.rule === "release" && st("4. ประกาศใหม่", "มีค่ารอบใหม่จากแหล่งทางการ")}
                  {st("6. ความรุนแรง", `${s.severity} (ratio ≥ 3 สูง, ≥ 1.5 กลาง, ≥ 1 ต่ำ)`)}
                  {st("7. คะแนนจัดอันดับ", `${n(k.severity_weight)} × ${n(k.z_factor)} × ${n(k.trust_factor)} × ${n(k.reach)} × ${n(k.evidence_factor ?? 1)} = ${n(k.total ?? s.score)}`)}
                </ol>
              </div>
            );
          })()}
          <div className="mt-6 border-l-4 border-muted-foreground pl-4 text-sm">
            <p className="font-semibold">ตัวอย่างที่ไม่กลายเป็นสัญญาณ</p>
            <p className="mt-1">ราคาไข่ไก่ 3.92 → 3.95 บาท: Δ = 0.03, ถ้าเกณฑ์สัมบูรณ์ 0.2 บาท → 0.03 ÷ 0.2 = 0.15 และแหล่งความน่าเชื่อถือกลาง ÷ 1.5 = 0.10 &lt; 1 → <b>ไม่ผ่าน ไม่มีสัญญาณ</b> (No change → no signal) · ตัวเลขชุดนี้เป็นตัวอย่างสาธิตสูตร</p>
          </div>
        </section>
        <section>
          <h2 className="font-display text-2xl">4. เกณฑ์ของแต่ละตัวชี้วัด</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b-2 border-foreground text-left"><th className="py-1">ตัวชี้วัด</th><th>กลุ่ม</th><th>กฎ</th><th>เกณฑ์สัมบูรณ์</th><th>ความน่าเชื่อถือ</th><th>เกณฑ์ %</th><th>min %</th><th>vol_k</th><th>max gap</th><th>bands</th></tr></thead>
              <tbody>{data.metrics.map((m) => (
                <tr key={m.id} className="border-b border-border">
                  <td className="py-1">{m.name_th}</td><td>{fam[m.family_id]?.emoji}</td><td>{m.kind}</td>
                  <td>{n(m.threshold_abs)} {m.threshold_abs != null ? m.unit : ""}</td><td>{fam[m.family_id]?.trust}</td><td>{n(m.threshold_pct)}</td><td>{n(m.min_pct)}</td>
                  <td>{n(m.vol_k)}</td><td>{m.max_gap_days} วัน</td><td>{m.bands?.join(", ") ?? "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
