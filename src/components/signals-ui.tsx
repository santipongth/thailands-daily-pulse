import { Link } from "@tanstack/react-router";
import type { Family, Metric, News, Obs, Signal } from "@/lib/signals";
import { SignalExplain } from "@/components/signal-explain";
import { fmt } from "@/lib/signals";
import { CostSignalChart } from "@/components/cost-signal-chart";
import { RailSignalChart } from "@/components/rail-signal-chart";
import { MetricSignalChart } from "@/components/metric-signal-chart";

export function Sparkline({ values, className = "" }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const w = 120, h = 32;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(" ");
  const last = pts.split(" ").at(-1)!.split(",");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-8 w-28 ${className}`} aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="currentColor" />
    </svg>
  );
}

export function DataBadge({ demo }: { demo: boolean }) {
  return demo ? (
    <span className="rounded-sm border border-dashed border-muted-foreground/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">ข้อมูลตัวอย่าง</span>
  ) : (
    <span className="rounded-sm bg-live px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-live-foreground">ข้อมูลจริง</span>
  );
}

const sevLabel: Record<string, string> = { high: "สำคัญมาก", medium: "น่าจับตา", low: "เล็กน้อย" };

export function SignalCard({ s, family, metric, history, news }: { s: Signal; family: Family; metric: Metric; history: Obs[]; news: News[] }) {
  const up = (s.change_abs ?? 0) > 0;
  const tone = metric.kind === "release" || metric.kind === "events" ? "text-foreground" : up ? "text-up" : "text-down";
  return (
    <article className={`min-w-0 border-t-2 pt-4 ${s.severity === "high" ? "border-up" : "border-foreground"}`}>
    <Link to="/signals/$family" params={{ family: family.id }} className="group block transition-colors hover:bg-card">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">{family.emoji} {family.name_th}</span>
        <span className={s.severity === "high" ? "font-semibold text-up" : ""}>{sevLabel[s.severity]}</span>
      </div>
      <h3 className="mt-3 font-display text-2xl leading-snug break-words group-hover:underline">{s.title}</h3>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className={`font-display text-3xl tabular-nums ${tone}`}>
            {metric.kind === "release" || metric.kind === "events" ? fmt(s.new_value, metric.decimals) : `${up ? "▲" : "▼"} ${fmt(Math.abs(s.change_abs ?? 0), metric.decimals)}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {s.change_pct != null && metric.kind !== "release" && metric.kind !== "events" ? `${s.change_pct > 0 ? "+" : ""}${s.change_pct.toFixed(1)}% · ` : ""}
            {metric.unit}
          </div>
        </div>
        <Sparkline values={history.filter((o) => o.is_demo === s.is_demo).map((o) => Number(o.value))} className={tone} />
      </div>
    </Link>
      {family.id === "food" && <CostSignalChart s={s} metric={metric} history={history} />}
      {family.id === "rail" && <RailSignalChart s={s} />}
      {family.id !== "food" && family.id !== "rail" && <MetricSignalChart s={s} metric={metric} history={history} />}
      <div className="mt-4 border-t border-editorial-rule pt-3 text-xs leading-relaxed text-muted-foreground">
        ที่มา: {s.metric_id.startsWith("dit_") ? "กรมการค้าภายใน (ราคาขายปลีก กทม.)" : s.metric_id === "lpg" ? "สนพ. (ราคา LPG ปตท. ถัง 15 กก.)" : family.source_name}
        {s.is_demo && <span className="ml-2"><DataBadge demo /></span>}
      </div>
      <div className="mt-3"><SignalExplain s={s} family={family} metric={metric} history={history} news={news} /></div>
    </article>
  );
}

