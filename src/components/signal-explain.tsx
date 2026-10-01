import { useEffect, useState } from "react";
import type { Family, Metric, News, Obs, Signal } from "@/lib/signals";
import { fmt, thaiDate } from "@/lib/signals";

export function explainReason(s: Signal, m: Metric): string {
  const v = (x: number) => `${fmt(x, m.decimals)} ${m.unit}`.trim();
  if (m.kind === "release") {
    return s.prev_value != null
      ? `มีการประกาศตัวเลขรอบใหม่ ${v(s.new_value)} (รอบก่อน ${v(s.prev_value)}) ระบบแสดงเฉพาะวันที่ประกาศ วันอื่นจะเงียบ`
      : `มีการประกาศตัวเลขรอบใหม่ ${v(s.new_value)}`;
  }
  if (m.kind === "level" && m.bands?.length) {
    const crossed = m.bands.filter((b) => (s.prev_value ?? 0) < b !== s.new_value < b);
    return `ค่าเปลี่ยนจาก ${v(s.prev_value ?? 0)} เป็น ${v(s.new_value)} และ${s.new_value > (s.prev_value ?? 0) ? "ข้าม" : "ลดลงต่ำกว่า"}เกณฑ์ ${crossed.map((b) => v(b)).join(", ")} ระบบแจ้งเมื่อข้ามระดับเท่านั้น ไม่แจ้งทุกครั้งที่ตัวเลขขยับ`;
  }
  const rules: string[] = [];
  if (m.threshold_abs != null) rules.push(`${fmt(m.threshold_abs, m.decimals)} ${m.unit}`.trim());
  if (m.threshold_pct != null) rules.push(`${m.threshold_pct}%`);
  const ch = Math.abs(s.change_abs ?? 0);
  return `เปลี่ยน ${fmt(ch, m.decimals)} ${m.unit}${s.change_pct != null ? ` (${s.change_pct > 0 ? "+" : ""}${s.change_pct.toFixed(1)}%)` : ""} จากค่าก่อนหน้า ซึ่งเกินเกณฑ์ที่ตั้งไว้ (${rules.join(" หรือ ")}) จึงถือเป็นสัญญาณ`;
}

export function SignalExplain({ s, family, metric, history, news }: { s: Signal; family: Family; metric: Metric; history: Obs[]; news: News[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const prevObs = [...history].reverse().find((o) => o.observed_on < s.signal_date);
  const related = news.filter((n) => n.family_id === family.id).slice(0, 3);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs underline underline-offset-2 hover:text-up">
        ทำไมถึงเปลี่ยน?
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="ที่มาของสัญญาณ" className="max-h-[85vh] w-full max-w-lg overflow-y-auto border-2 border-foreground bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{family.emoji} {family.name_th}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="ปิด" className="text-lg leading-none">×</button>
            </div>
            <h3 className="mt-2 font-display text-xl">{s.title}</h3>

            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-semibold">เหตุผลที่ขึ้นเป็นสัญญาณ</dt>
                <dd className="mt-1 text-muted-foreground">{explainReason(s, metric)}</dd>
              </div>
              <div>
                <dt className="font-semibold">วันที่ข้อมูลเปลี่ยน</dt>
                <dd className="mt-1 text-muted-foreground">
                  {thaiDate(s.signal_date)}
                  {prevObs && ` · เทียบกับข้อมูลวันที่ ${thaiDate(prevObs.observed_on)}`}
                  <br />ตรวจพบเมื่อ {new Date(s.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">แหล่งข้อมูล</dt>
                <dd className="mt-1 text-muted-foreground">
                  {family.source_url ? <a href={family.source_url} target="_blank" rel="noreferrer" className="underline">{family.source_name}</a> : family.source_name}
                  {" · "}{s.is_demo ? "ข้อมูลตัวอย่าง (ยังไม่ได้เชื่อมแหล่งจริง)" : "ข้อมูลจริง ดึงอัตโนมัติ"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">ข่าวที่เกี่ยวข้อง</dt>
                <dd className="mt-1">
                  {related.length === 0 ? (
                    <span className="text-muted-foreground">ยังไม่พบข่าวที่เกี่ยวข้องใน 3 วันที่ผ่านมา</span>
                  ) : (
                    <ul className="space-y-2">
                      {related.map((n) => (
                        <li key={n.id}>
                          <a href={n.link} target="_blank" rel="noreferrer" className="underline">{n.title}</a>
                          <span className="block text-xs text-muted-foreground">{n.source} · {new Date(n.published_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">ข่าวจับคู่ด้วยคำสำคัญ อาจไม่ใช่สาเหตุโดยตรงของตัวเลข</p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </>
  );
}
