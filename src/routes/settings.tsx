import { nextSlot, readLastResult } from "@/components/scheduled-refresh";
import {useEffect,useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Masthead } from "@/components/masthead";
import { useSensitivity } from "@/hooks/use-sensitivity";
import type { Sensitivity } from "@/lib/signals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSourcePrefs } from "@/hooks/use-source-prefs";
import { SOURCES } from "@/lib/sources";

export const Route = createFileRoute("/settings")({
  staticData: { sitemap: true },
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
        <SourceSettings />
      </main>
    </div>
  );
}

type Run = { source: string; ran_at: string; ok: boolean; rows: number; error: string | null; sample: string | null };

function NotifyToggle() {
  const [perm, setPerm] = useState("default");
  useEffect(() => { if (typeof Notification !== "undefined") setPerm(Notification.permission); }, []);
  if (perm === "unsupported") return null;
  return (
    <p className="mt-4 text-sm">
      <span className="font-semibold">แจ้งเตือนในเบราว์เซอร์</span> (เมื่อข้อมูลรัฐเปลี่ยน หรือแหล่งที่ติดตามดึงไม่ได้):{" "}
      {perm === "granted" ? <span className="text-primary">เปิดอยู่</span> : perm === "denied" ? <span className="text-muted-foreground">ถูกปิดในเบราว์เซอร์ — เปิดได้จากการตั้งค่าเว็บไซต์ของเบราว์เซอร์</span> : (
        <button type="button" className="underline" onClick={() => Notification.requestPermission().then(setPerm)}>เปิดการแจ้งเตือน</button>
      )}
    </p>
  );
}

function SourceSettings() {
  const [prefs, setPrefs] = useSourcePrefs();
  const { data: runs } = useQuery({
    queryKey: ["source-runs-settings"],
    queryFn: async () => ((await supabase.from("source_runs").select("source,ran_at,ok,rows,error,sample")).data ?? []) as Run[],
  });
  const byName = new Map((runs ?? []).map((r) => [r.source, r]));
  const toggle = (src: string) =>
    setPrefs({ ...prefs, disabled: prefs.disabled.includes(src) ? prefs.disabled.filter((x) => x !== src) : [...prefs.disabled, src] });
  return (
    <section className="mt-12">
      <h2 className="font-display text-3xl">หน่วยงานและเวลาอัปเดต</h2>
      <p className="mt-2 text-sm text-muted-foreground">เลือกหน่วยงานที่ต้องการให้สัญญาณแสดง และเลือกเวลาที่ต้องการให้อัปเดตข้อมูลรัฐเอง (ระบบยังเก็บข้อมูลให้ทุกคนทุกวัน 05:30 น. และตรวจทุกชั่วโมง) การตั้งค่าเก็บในเครื่องของคุณ</p>
      <UpdateTimes />
      <NotifyToggle />
      <ul className="mt-6 divide-y divide-border border-y-2 border-foreground">
        {SOURCES.filter((x) => x.metrics.length).map((x) => {
          const r = byName.get(x.source);
          return (
            <li key={x.source} className="flex gap-3 py-3">
              <input type="checkbox" checked={!prefs.disabled.includes(x.source)} onChange={() => toggle(x.source)} className="mt-1.5 accent-[var(--up)]" aria-label={x.source} />
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-semibold">{x.source} <span className="font-normal text-muted-foreground">· {x.kind === "crawler" ? "crawler" : x.kind === "catalog" ? "ศูนย์ข้อมูลภาครัฐ" : "API"}</span></div>
                {!r ? <div className="text-muted-foreground">ยังไม่เคยดึง</div> : r.ok ? (
                  <div className="text-muted-foreground">ดึงได้ {r.rows} รายการ · {new Date(r.ran_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}{r.sample ? ` · ${r.sample}` : ""}</div>
                ) : (
                  <div className="text-destructive">ล้มเหลว: {r.error} — <Link to="/failures" className="underline">ดูรายละเอียด</Link></div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function UpdateTimes() {
  const [prefs, setPrefs] = useSourcePrefs();
  const [draft, setDraft] = useState("12:00");
  const [last, setLast] = useState<{ key: string; text: string } | null>(null);
  useEffect(() => setLast(readLastResult()), [prefs.times.join(",")]);
  const add = () => { if (!prefs.times.includes(draft)) setPrefs({ ...prefs, times: [...prefs.times, draft].sort() }); };
  const [, setNow] = useState(0);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 15e3); return () => clearInterval(id); }, []);
  const next = nextSlot(prefs.times);
  const mins = (() => {
    if (!next || next.includes("พรุ่งนี้")) return null;
    const d = new Date(Date.now() + 7 * 3600e3);
    return Number(next.slice(0, 2)) * 60 + Number(next.slice(3, 5)) - (d.getUTCHours() * 60 + d.getUTCMinutes());
  })();
  return (
    <div className="mt-6 border-2 border-foreground p-4 text-sm">
      <div className="font-semibold">เวลาอัปเดตข้อมูลรัฐ (เวลาไทย)</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {prefs.times.length === 0 && <span className="text-muted-foreground">ยังไม่ได้เลือกเวลา</span>}
        {prefs.times.map((t) => (
          <span key={t} className="flex items-center gap-2 border-2 border-foreground px-2 py-0.5">
            {t}
            <button aria-label={`ลบเวลา ${t}`} onClick={() => setPrefs({ ...prefs, times: prefs.times.filter((x) => x !== t) })}>×</button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input type="time" value={draft} onChange={(e) => setDraft(e.target.value)} className="border-2 border-foreground bg-background px-2 py-1" aria-label="เลือกเวลา" />
        <button onClick={add} className="border-2 border-foreground px-3 py-1 font-semibold hover:bg-foreground hover:text-background">เพิ่มเวลา</button>
      </div>
      <p className="mt-3">รอบถัดไป: <strong>{next ?? "—"}</strong>{mins != null && <> (อีก {mins >= 60 ? `${Math.floor(mins / 60)} ชม. ` : ""}{mins % 60} นาที)</>}{last && <> · อัปเดตล่าสุด: {last.text}</>}</p>
      <p className="mt-1 text-xs text-muted-foreground">เมื่อถึงเวลาที่เลือก ระบบจะอัปเดตและแจ้งผลขณะเปิดเว็บไว้ หรือแจ้งทันทีที่คุณเปิดเว็บครั้งถัดไป (ไม่มีระบบบัญชี จึงทำงานบนเครื่องนี้เท่านั้น)</p>
    </div>
  );
}
