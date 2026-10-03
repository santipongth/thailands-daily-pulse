import { fmt } from "@/lib/signals";

export type WeekSummary = { label: string; value: number | null; coverage: string };

/** A common comparison frame; missing readings remain missing, not zero. */
export function WeeklyComparison({ weeks, unit, decimals, note, children }: {
  weeks: [WeekSummary, WeekSummary]; unit: string; decimals: number; note: string; children?: React.ReactNode;
}) {
  const comparable = weeks.every((w) => w.value != null);
  return (
    <div className="mt-5 border-t border-editorial-rule pt-4 text-sm">
      <h4 className="font-semibold text-foreground">เปรียบเทียบรายสัปดาห์</h4>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note} · เป็นข้อมูลประกอบ ไม่ใช่เกณฑ์ตัดสินสัญญาณทุกหมวด</p>
      <p className="mt-2 text-xs text-muted-foreground">{weeks[0].label} <span className="inline-block h-2 w-2 bg-muted-foreground/50" /> · {weeks[1].label} <span className="inline-block h-2 w-2 bg-chart-1" /></p>
      {comparable ? (
        <div className="mt-4 flex h-28 items-end justify-center gap-8 border-b border-editorial-rule" role="img" aria-label={`${weeks[0].label} ${fmt(weeks[0].value ?? 0, decimals)} ${unit} เทียบ ${weeks[1].label} ${fmt(weeks[1].value ?? 0, decimals)} ${unit}`}>
          {weeks.map((w, i) => <div key={w.label} className="flex h-full w-20 items-end justify-center">
            <div className={i === 0 ? "w-14 bg-muted-foreground/50" : "w-14 bg-chart-1"} style={{ height: `${Math.max(3, Math.abs(w.value ?? 0) / Math.max(...weeks.map((x) => Math.abs(x.value ?? 0)), 1) * 100)}%` }} />
          </div>)}
        </div>
      ) : <p className="mt-3 border-l-2 border-editorial-rule pl-3 text-sm text-muted-foreground">ข้อมูลไม่พอสำหรับเทียบ</p>}
      <div className="mt-3 grid grid-cols-2 gap-4 border-t border-editorial-rule pt-3">
        {weeks.map((w) => <div key={w.label} className="min-w-0">
          <p className="text-xs text-muted-foreground">{w.label}</p>
          <p className="mt-1 font-display text-xl tabular-nums leading-tight">{w.value == null ? "—" : fmt(w.value, decimals)} <span className="font-editorial-body text-xs font-normal text-muted-foreground">{unit}</span></p>
          <p className="mt-1 text-xs text-muted-foreground">{w.coverage}</p>
        </div>)}
      </div>
      {children}
    </div>
  );
}