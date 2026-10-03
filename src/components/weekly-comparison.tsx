import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
      {comparable ? (
        <div className="mt-3 h-36 w-full" role="img" aria-label={`${weeks[0].label} ${fmt(weeks[0].value ?? 0, decimals)} ${unit} เทียบ ${weeks[1].label} ${fmt(weeks[1].value ?? 0, decimals)} ${unit}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks.map((w) => ({ name: w.label, value: w.value }))} margin={{ top: 5, right: 8, bottom: 3, left: 8 }}>
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip formatter={(value: number) => `${fmt(value, decimals)} ${unit}`} />
              <Bar dataKey="value" name={note} fill="var(--chart-1)" maxBarSize={82} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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