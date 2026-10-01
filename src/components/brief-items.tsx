import { Link } from "@tanstack/react-router";
export type BriefItem = {
  metric_id: string;
  family: string;
  what: string;
  importance: string;
  why: string;
  impact: string | null;
  advice: { text: string; source: string; url: string } | null;
  source: string | null;
  source_url: string | null;
  event_id?: string;
  version?: number;
  data_date?: string;
  compared_with?: string | null;
  score?: { severity_weight?: number; z_factor?: number; trust_factor?: number; reach?: number; evidence_factor?: number; total?: number } | null;
  rule?: string | null;
  evidence_ids?: number[];
  quality?: string;
  impact_calc?: { per_day: number; per_month: number; formula: string } | null;
};

/** Renders the 4 answers per item: what changed, importance, household impact, what to do. */
export function BriefItems({ items }: { items: BriefItem[] }) {
  if (!items.length) return <p className="text-muted-foreground">วันนี้ไม่มีการเปลี่ยนแปลงอย่างมีนัยสำคัญจากข้อมูลจริง</p>;
  return (
    <ol className="space-y-5">
      {items.map((i, n) => (
        <li key={i.metric_id + n} className="border-l-4 border-up pl-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{i.family}</p>
          <dl className="mt-1 grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="font-semibold">อะไรเปลี่ยน</dt>
            <dd className="font-display text-lg leading-snug">{i.what}</dd>
            <dt className="font-semibold">สำคัญแค่ไหน</dt>
            <dd><span className="font-semibold">{i.importance}</span> — {i.why}</dd>
            {i.impact && (<><dt className="font-semibold">กระทบครัวเรือน</dt><dd>{i.impact}{i.impact_calc && <span className="block font-mono text-xs text-muted-foreground">สูตร: {i.impact_calc.formula}</span>}</dd></>)}
            {i.advice && (
              <>
                <dt className="font-semibold">ควรทำอะไร</dt>
                <dd>{i.advice.text} <a href={i.advice.url} target="_blank" rel="noreferrer" className="text-xs underline">— {i.advice.source}</a></dd>
              </>
            )}
            {i.data_date && (<>
            <dt className="font-semibold">ข้อมูลวันที่</dt>
            <dd>{i.data_date ?? "—"}{i.compared_with ? ` เทียบกับ ${i.compared_with}` : ""}{i.quality && i.quality !== "verified" ? " · ตรวจสอบหลักฐานต้นทางไม่ได้" : ""}</dd>
            <dt className="font-semibold">เลือกเพราะ</dt>
            <dd className="text-xs">
              กฎ {i.rule ?? "—"}{i.score ? ` · คะแนน ${i.score.total} = ความรุนแรง ${i.score.severity_weight} × ความแรง ${Number(i.score.z_factor ?? 1).toFixed(2)} × แหล่ง ${i.score.trust_factor} × ครัวเรือน ${i.score.reach} × ไฟล์ดิบ ${i.score.evidence_factor ?? "—"}` : ""}
              {i.event_id && <> · <Link to="/events/$id" params={{ id: i.event_id }} className="underline">หลักฐานและกฎ (รุ่น {i.version})</Link></>}
            </dd>
            </>)}
          </dl>
        </li>
      ))}
    </ol>
  );
}
