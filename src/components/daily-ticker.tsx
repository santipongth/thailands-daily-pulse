import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bkkToday, fmt, type Family, type Metric, type Signal } from "@/lib/signals";

type TickerSignal = Signal & {
  family: Family;
  metric: Metric;
};

async function getTickerSignals(): Promise<{ signals: TickerSignal[]; updatedAt: string | null }> {
  const date = bkkToday();
  const [{ data: signals, error: signalError }, { data: families, error: familyError }, { data: metrics, error: metricError }, { data: latest, error: latestError }] = await Promise.all([
    supabase.from("signals").select("*").eq("signal_date", date).order("score", { ascending: false }).limit(8),
    supabase.from("families").select("*").order("sort"),
    supabase.from("metrics").select("id,family_id,name_th,unit,kind,decimals,sort,threshold_abs,threshold_pct,bands").order("sort"),
    supabase.from("observations").select("received_at").eq("is_demo", false).order("received_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const error = signalError ?? familyError ?? metricError ?? latestError;
  if (error) throw new Error(error.message);

  const familyById = new Map((families ?? []).map((family) => [family.id, family as Family]));
  const metricById = new Map((metrics ?? []).map((metric) => [metric.id, metric as Metric]));
  const joined = (signals ?? []).flatMap((signal) => {
    const family = familyById.get(signal.family_id);
    const metric = metricById.get(signal.metric_id);
    return family && metric ? [{ ...(signal as Signal), family, metric }] : [];
  });

  return { signals: joined, updatedAt: latest?.received_at ?? null };
}

function changeText(signal: TickerSignal) {
  const { metric } = signal;
  if (metric.kind === "release") return "ประกาศใหม่";
  const change = signal.change_abs ?? 0;
  const direction = change > 0 ? "+" : change < 0 ? "−" : "";
  return `${direction}${fmt(Math.abs(change), metric.decimals)} ${metric.unit}`;
}

function TickerItems({ signals, duplicate = false }: { signals: TickerSignal[]; duplicate?: boolean }) {
  return (
    <div className="flex shrink-0 items-stretch" aria-hidden={duplicate || undefined}>
      {signals.map((signal) => {
        const up = (signal.change_abs ?? 0) > 0;
        const tone = signal.metric.kind === "release" ? "text-ticker-accent" : up ? "text-ticker-up" : "text-ticker-down";
        return (
          <Link
            key={signal.id}
            to="/signals/$family"
            params={{ family: signal.family_id }}
            className="group flex min-w-max items-center gap-3 border-r border-ticker-grid px-5 py-2.5 outline-none transition-colors hover:bg-ticker-hover focus-visible:bg-ticker-hover"
            tabIndex={duplicate ? -1 : undefined}
          >
            <span className="text-[11px] text-ticker-muted">{signal.family.emoji} {signal.family.name_th}</span>
            <span className="font-semibold tabular-nums text-ticker-foreground">
              {fmt(signal.new_value, signal.metric.decimals)} <span className="font-normal text-ticker-muted">{signal.metric.unit}</span>
            </span>
            <span className={`text-xs font-semibold tabular-nums ${tone}`}>{changeText(signal)}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function DailyTicker() {
  const { data, isError } = useQuery({
    queryKey: ["daily-ticker", bkkToday()],
    queryFn: getTickerSignals,
    staleTime: 5 * 60 * 1000,
  });
  const signals = data?.signals ?? [];
  const time = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <section className="ticker-grid border-y border-ticker-grid bg-ticker text-ticker-foreground" aria-label="ตัวเลขสำคัญประจำวัน">
      <div className="flex min-h-10 overflow-hidden">
        <div className="relative z-10 flex shrink-0 items-center gap-2 border-r border-ticker-grid bg-ticker px-4 text-[11px] sm:px-5">
          <span className="ticker-live-dot h-2 w-2 rounded-full bg-ticker-live" aria-hidden />
          <span className="font-semibold">วันนี้</span>
          <span className="hidden text-ticker-muted sm:inline">อัปเดต {time} น.</span>
        </div>
        <div className="ticker-viewport min-w-0 flex-1 overflow-hidden">
          {isError ? (
            <p className="px-5 py-2.5 text-xs text-ticker-muted">ยังอ่านตัวเลขล่าสุดไม่ได้</p>
          ) : signals.length === 0 ? (
            <p className="px-5 py-2.5 text-xs text-ticker-muted">ยังไม่มีการเปลี่ยนแปลงเกินเกณฑ์</p>
          ) : (
            <div className="ticker-track flex w-max">
              <TickerItems signals={signals} />
              <TickerItems signals={signals} duplicate />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}