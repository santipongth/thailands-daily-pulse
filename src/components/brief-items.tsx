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
            {i.impact && (<><dt className="font-semibold">กระทบครัวเรือน</dt><dd>{i.impact}</dd></>)}
            {i.advice && (
              <>
                <dt className="font-semibold">ควรทำอะไร</dt>
                <dd>{i.advice.text} <a href={i.advice.url} target="_blank" rel="noreferrer" className="text-xs underline">— {i.advice.source}</a></dd>
              </>
            )}
          </dl>
        </li>
      ))}
    </ol>
  );
}
