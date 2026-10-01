import { useEffect, useState } from "react";
import type { Family, Metric, News, Obs, Signal } from "@/lib/signals";
import { fmt, thaiDate } from "@/lib/signals";
import { isOfficial, CATALOG_METRIC_AGENCY } from "@/lib/sources";
import { supabase } from "@/integrations/supabase/client";

type GovChange = { id: number; kind: string; reason_th: string; before_text: string | null; after_text: string | null; gov_datasets: { url: string; title: string } | null };

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

const TRUST: Record<string, string> = { high: "สูง (แหล่งทางการโดยตรง)", medium: "กลาง (ผู้รวบรวม/ค่าประมาณ — ต้องเปลี่ยนมากกว่าปกติ 1.5 เท่า)", low: "ต่ำ (ข้อมูลตัวอย่าง)" };

function checkLines(c: any, m: Metric): string[] {
  const out: string[] = [];
  if (c.rule === "delta") {
    const t = [c.threshold_abs != null ? `${c.threshold_abs} ${m.unit}` : null, c.threshold_pct != null ? `${c.threshold_pct}%` : null].filter(Boolean).join(" หรือ ");
    out.push(`ขนาดการเปลี่ยนแปลง: ${c.ratio} เท่าของเกณฑ์ (${t})`);
    if (c.min_pct != null) out.push(`เปลี่ยนอย่างน้อย ${c.min_pct}% ตามเกณฑ์ขั้นต่ำ`);
  }
  if (c.rule === "level") out.push(`ข้ามระดับเกณฑ์ ${(c.bands ?? []).join(", ")} ${m.unit}`);
  if (c.rule === "release") out.push("เป็นตัวเลขรอบใหม่ที่เพิ่งประกาศ");
  if (c.rule === "catalog") out.push(`ชุดข้อมูลทางการเปลี่ยนจริง ${c.datasets} ชุด (ใหม่ หรือแถว/ผลรวมเปลี่ยน ≥ ${c.min_pct}%) — การอัปโหลดซ้ำโดยตัวเลขไม่เปลี่ยนไม่นับ`);
  if (c.compared_with) out.push(`เทียบกับข้อมูลวันที่ ${thaiDate(c.compared_with)}${c.gap_days != null ? ` (ห่าง ${c.gap_days} วัน, ไม่เกิน ${c.max_gap_days} วัน)` : ""}`);
  if (c.trust) out.push(`ความน่าเชื่อถือของแหล่ง: ${TRUST[c.trust] ?? c.trust}`);
  if (c.capped) out.push("เป็นข้อมูลตัวอย่าง จึงจำกัดความรุนแรงไม่เกินระดับกลาง");
  return out;
}

export function SignalExplain({ s, family, metric, history, news }: { s: Signal; family: Family; metric: Metric; history: Obs[]; news: News[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const catAgency = CATALOG_METRIC_AGENCY[metric.id];
  const [gov, setGov] = useState<GovChange[]>([]);
  useEffect(() => {
    if (!open || !catAgency) return;
    supabase.from("gov_changes").select("id,kind,reason_th,before_text,after_text,gov_datasets(url,title)").eq("agency", catAgency).eq("change_date", s.signal_date)
      .then(({ data }) => setGov((data ?? []) as unknown as GovChange[]));
  }, [open, catAgency, s.signal_date]);
  const prevObs = [...history].reverse().find((o) => o.observed_on < s.signal_date);
  const fam = news.filter((n) => n.family_id === family.id && (family.id !== "gov" || (n.agency != null && metric.name_th.includes(n.agency))));
  const official = fam.filter((n) => isOfficial(n.source) && n.published_at >= "2001").slice(0, 5);
  const related = fam.filter((n) => !isOfficial(n.source)).slice(0, 3);
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
                <dd className="mt-1 text-muted-foreground">
                  {catAgency ? `เทียบชุดข้อมูลทางการของ ${catAgency} กับสแนปช็อตวันก่อน พบการเปลี่ยนแปลงจริง ${gov.length || s.new_value} ชุด (ชุดที่ไม่เปลี่ยนจะไม่ถูกแจ้ง)` : explainReason(s, metric)}
                  {gov.length > 0 && (
                    <ul className="mt-3 space-y-3">
                      {gov.map((g) => (
                        <li key={g.id} className="border-l-2 border-up pl-3 text-foreground">
                          <p>{g.reason_th}</p>
                          {(g.before_text || g.after_text) && <p className="text-xs text-muted-foreground">ก่อน: {g.before_text ?? "—"} → หลัง: {g.after_text ?? "—"}</p>}
                          {g.gov_datasets && <a href={g.gov_datasets.url} target="_blank" rel="noreferrer" className="text-xs underline">เปิดชุดข้อมูลต้นทาง</a>}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              {s.checks?.score && (
                <div>
                  <dt className="font-semibold">คะแนนจัดอันดับ {Number(s.checks.score.total).toFixed(2)}</dt>
                  <dd className="mt-1 text-muted-foreground">
                    ความรุนแรง {s.checks.score.severity_weight} × ความแรงเทียบความผันผวน {Number(s.checks.score.z_factor).toFixed(2)} × ความน่าเชื่อถือแหล่ง {s.checks.score.trust_factor} × ผลต่อครัวเรือน {s.checks.score.reach} × หลักฐานไฟล์ดิบ {s.checks.score.evidence_factor ?? "—"}
                    <span className="block text-xs">ตัวเลขคำนวณโดยระบบ — AI ใช้เรียบเรียงภาษาเท่านั้น · <a href="/method" className="underline">ดูสูตร</a></span>
                  </dd>
                </div>
              )}
              {s.checks && (
                <div>
                  <dt className="font-semibold">เกณฑ์ที่ผ่าน</dt>
                  <dd className="mt-1">
                    <ul className="space-y-1 text-muted-foreground">
                      {checkLines(s.checks, metric).map((l) => <li key={l}>✓ {l}</li>)}
                    </ul>
                  </dd>
                </div>
              )}
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
                <dt className="font-semibold">หลักฐานจากหน่วยงานรัฐ</dt>
                <dd className="mt-1">
                  {!s.is_demo && <p className="text-muted-foreground">สัญญาณนี้ตัดจากตัวเลขที่ดึงจากแหล่งโดยตรง ไม่ได้มาจากข่าว</p>}
                  {official.length > 0 && (
                    <ul className="mt-2 space-y-2">
                      {official.map((n) => (
                        <li key={n.id}>
                          <a href={n.link} target="_blank" rel="noreferrer" className="underline">{n.title}</a>
                          <span className="block text-xs text-muted-foreground">{n.source} · พบครั้งแรก {new Date(n.published_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.is_demo && official.length === 0 && <p className="text-muted-foreground">ยังไม่มีข้อมูลจากหน่วยงานรัฐโดยตรงสำหรับเรื่องนี้</p>}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">ข่าวหนังสือพิมพ์ประกอบ</dt>
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
