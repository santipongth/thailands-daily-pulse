import { createFileRoute, Link } from "@tanstack/react-router";
import { Masthead } from "@/components/masthead";
import { useSensitivity } from "@/hooks/use-sensitivity";
import type { Sensitivity } from "@/lib/signals";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "ตั้งค่าความไวของสัญญาณ — Thailand Daily Signals" },
      { name: "description", content: "เลือกว่าอยากเห็นเฉพาะเรื่องใหญ่ หรือทุกการเปลี่ยนแปลงที่เกินเกณฑ์" },
      { property: "og:title", content: "ตั้งค่าความไวของสัญญาณ — Thailand Daily Signals" },
      { property: "og:description", content: "ควบคุมว่าอะไรควรขึ้นเป็นสัญญาณสำหรับคุณ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

const OPTIONS: { v: Sensitivity; label: string; desc: string }[] = [
  { v: "low", label: "ต่ำสุด", desc: "แสดงเฉพาะเรื่องสำคัญมาก เช่น เปลี่ยนแรงเกิน 3 เท่าของเกณฑ์ หรือ PM2.5 ข้ามระดับอันตราย" },
  { v: "medium", label: "ปานกลาง", desc: "แสดงเรื่องสำคัญมากและเรื่องน่าจับตา (ค่าเริ่มต้น)" },
  { v: "high", label: "สูง", desc: "แสดงทุกการเปลี่ยนแปลงที่เกินเกณฑ์ รวมถึงเรื่องเล็กน้อย" },
];

function Settings() {
  const [sens, setSens] = useSensitivity();
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link to="/" className="text-sm hover:underline">← กลับหน้าวันนี้</Link>
        <h1 className="mt-4 font-display text-4xl">ความไวของสัญญาณ</h1>
        <p className="mt-2 text-muted-foreground">เลือกว่าอยากให้หน้าแรกแจ้งเรื่องแค่ไหน การตั้งค่านี้เก็บไว้ในเครื่องของคุณ</p>
        <fieldset className="mt-8 space-y-3">
          <legend className="sr-only">ระดับความไว</legend>
          {OPTIONS.map((o) => (
            <label key={o.v} className={`flex cursor-pointer gap-4 border-2 p-4 transition-colors ${sens === o.v ? "border-foreground bg-card" : "border-border hover:border-foreground/50"}`}>
              <input type="radio" name="sens" value={o.v} checked={sens === o.v} onChange={() => setSens(o.v)} className="mt-1.5 accent-[var(--up)]" />
              <span>
                <span className="font-display text-xl">{o.label}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{o.desc}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="mt-6 text-sm text-muted-foreground">ตัวเลขที่ประกาศเป็นรอบ เช่น เงินเฟ้อ GDP หวย จะแสดงเสมอในวันที่ประกาศ</p>
      </main>
    </div>
  );
}
