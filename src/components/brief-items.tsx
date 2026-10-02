import { Link } from "@tanstack/react-router";
import { impactFor, type ImpactCalc } from "@/lib/impact";

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
  impact_calc?: Partial<ImpactCalc> | null;
  impact_inputs?: { metric_id: string; prev_value: number | null; new_value: number } | null;
};

/** Raw file behind each compared value: evidence id per side (null = no archived file). */
export type ValueEvidence = Record<string, { cur: number | null; prev: number | null }>;

/** Renders the 4 answers per item: what changed, importance, household impact, what to do. */
export function BriefItems({ items, valueEvidence }: { items: BriefItem[]; valueEvidence?: ValueEvidence }) {
  if (!items.length) return <p className="text-muted-foreground">วันนี้ไม่มีการเปลี่ยนแปลงอย่างมีนัยสำคัญจากข้อมูลจริง</p>;
  return (
    <ol className="space-y-5">
      {items.map((i, n) => {
        // Recompute from stored inputs so older editions also show the full steps.
        const calc = i.impact_calc?.steps ? (i.impact_calc as ImpactCalc) : i.impact_inputs ? impactFor(i.impact_inputs) : null;
        const ev = valueEvidence?.[i.metric_id];
        return (
          <li key={i.metric_id + n} className="border-l-4 border-up pl-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{i.family}</p>
            <dl className="mt-1 grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
              <dt className="font-semibold">อะไรเปลี่ยน</dt>
              <dd className="font-display text-lg leading-snug">{i.what}</dd>
              <dt className="font-semibold">สำคัญแค่ไหน</dt>
              <dd><span className="font-semibold">{i.importance}</span> — {i.why}</dd>
              {(calc || i.impact) && (
                <>
                  <dt className="font-semibold">กระทบครัวเรือน</dt>
                  <dd>
                    {calc ? (
                      <div className="rounded border border-border bg-muted/40 p-2">
                        <p className="font-semibold">
                          {calc.period === "daily"
                            ? `${(calc.per_day ?? 0) >= 0 ? "จ่ายเพิ่ม" : "ประหยัด"} ${Math.abs(calc.per_day ?? 0)} บาท/วัน · ≈ ${Math.abs(calc.per_month ?? 0)} บาท/เดือน`
                            : `${(calc.per_once ?? 0) >= 0 ? "จ่ายเพิ่ม" : "ประหยัด"} ${Math.abs(calc.per_once ?? 0)} บาท ต่อครั้ง`}
                        </p>
                        <ul className="mt-1 font-mono text-xs text-muted-foreground">
                          {calc.steps.map((st) => <li key={st}>{st}</li>)}
                        </ul>
                        <p className="mt-1 text-xs text-muted-foreground">ปริมาณการใช้เป็นสมมติฐานคงที่ของระบบ — ราคามาจากข้อมูลจริงเท่านั้น</p>
                      </div>
                    ) : i.impact}
                  </dd>
                </>
              )}
              {i.advice && (
                <>
                  <dt className="font-semibold">ควรทำอะไร</dt>
                  <dd>{i.advice.text} <a href={i.advice.url} target="_blank" rel="noreferrer" className="text-xs underline">— {i.advice.source}</a></dd>
                </>
              )}
              {i.data_date && (<>
                <dt className="font-semibold">ข้อมูลวันที่</dt>
                <dd>{i.data_date}{i.compared_with ? ` เทียบกับ ${i.compared_with}` : ""}{i.quality && i.quality !== "verified" ? " · ตรวจสอบหลักฐานต้นทางไม่ได้" : ""}</dd>
                {ev && (<>
                  <dt className="font-semibold">ไฟล์ดิบ</dt>
                  <dd className="text-xs">
                    ค่าวันนี้: {ev.cur ? <Link to="/evidence" className="underline">ไฟล์ #{ev.cur}</Link> : <span className="text-destructive">ไม่มีไฟล์ดิบ</span>}
                    {" · "}ค่าที่ใช้เทียบ: {ev.prev ? <Link to="/evidence" className="underline">ไฟล์ #{ev.prev}</Link> : <span className="text-destructive">ไม่มีไฟล์ดิบ (เก็บก่อนเริ่มระบบเก็บไฟล์)</span>}
                  </dd>
                </>)}
                <dt className="font-semibold">เลือกเพราะ</dt>
                <dd className="text-xs">
                  กฎ {i.rule ?? "—"}{i.score ? ` · คะแนน ${i.score.total} = ความรุนแรง ${i.score.severity_weight} × ความแรง ${Number(i.score.z_factor ?? 1).toFixed(2)} × แหล่ง ${i.score.trust_factor} × ครัวเรือน ${i.score.reach} × ไฟล์ดิบ ${i.score.evidence_factor ?? "—"}` : ""}
                  {i.event_id && <> · <Link to="/events/$id" params={{ id: i.event_id }} className="underline">หลักฐานและกฎ (รุ่น {i.version})</Link></>}
                </dd>
              </>)}
            </dl>
          </li>
        );
      })}
    </ol>
  );
}
