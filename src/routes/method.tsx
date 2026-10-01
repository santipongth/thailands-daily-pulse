import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { SEVERITY_WEIGHT, TRUST_FACTOR } from "@/lib/impact";

const methodQuery = queryOptions({
  queryKey: ["method"],
  queryFn: async () => {
    const [f, m] = await Promise.all([
      supabase.from("families").select("id,name_th,emoji,trust,reach,sort").order("sort"),
      supabase.from("metrics").select("id,family_id,name_th,unit,kind,threshold_abs,threshold_pct,min_pct,max_gap_days,vol_k,bands,sort").order("sort"),
    ]);
    if (f.error) throw f.error;
    if (m.error) throw m.error;
    return { families: f.data, metrics: m.data };
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
          </ul>
          <table className="mt-4 w-full text-sm">
            <thead><tr className="border-b-2 border-foreground text-left"><th className="py-1">กลุ่ม</th><th>ความน่าเชื่อถือ</th><th>ผลต่อครัวเรือน</th></tr></thead>
            <tbody>{data.families.map((f) => <tr key={f.id} className="border-b border-border"><td className="py-1">{f.emoji} {f.name_th}</td><td>{f.trust}</td><td>{n(f.reach)}</td></tr>)}</tbody>
          </table>
        </section>

        <section>
          <h2 className="font-display text-2xl">3. ผลต่อครัวเรือน</h2>
          <p className="mt-3 text-sm">คำนวณจากตัวอย่างครัวเรือนอ้างอิงคงที่ เช่น รถเก๋งเติม 50 ลิตร × Δ ราคาต่อลิตร, กระบะดีเซล 70 ลิตร, ทอง 1 บาท, หมู 2 กก./สัปดาห์, ไข่ 30 ฟอง/เดือน, งบเที่ยว 1,000 ดอลลาร์ และ PM2.5 เทียบมาตรฐานไทย 37.5 µg/m³</p>
        </section>

        <section>
          <h2 className="font-display text-2xl">4. เกณฑ์ของแต่ละตัวชี้วัด</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b-2 border-foreground text-left"><th className="py-1">ตัวชี้วัด</th><th>กลุ่ม</th><th>กฎ</th><th>เกณฑ์สัมบูรณ์</th><th>เกณฑ์ %</th><th>min %</th><th>vol_k</th><th>max gap</th><th>bands</th></tr></thead>
              <tbody>{data.metrics.map((m) => (
                <tr key={m.id} className="border-b border-border">
                  <td className="py-1">{m.name_th}</td><td>{fam[m.family_id]?.emoji}</td><td>{m.kind}</td>
                  <td>{n(m.threshold_abs)} {m.threshold_abs != null ? m.unit : ""}</td><td>{n(m.threshold_pct)}</td><td>{n(m.min_pct)}</td>
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
