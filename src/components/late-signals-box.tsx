import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Row = { metric_id: string; signal_date: string; severity: string; title: string; checks: any };
const day = (d?: string | null) => (d ? new Date(`${d}T00:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "แหล่งไม่ระบุ");
const time = (t?: string | null) => (t ? new Date(t).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

/** Admin: every signal created from late-arriving data in the last 30 days — none are hidden. */
export function LateSignalsBox() {
  const since = new Date(Date.now() - 30 * 86400e3 + 7 * 3600e3).toISOString().slice(0, 10);
  const { data, isLoading } = useQuery({
    queryKey: ["late-signals", since],
    queryFn: async () => {
      const { data, error } = await supabase.from("signals").select("metric_id,signal_date,severity,title,checks")
        .eq("is_demo", false).eq("checks->>arrival_rule", "late_above_threshold").gte("signal_date", since).order("signal_date", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  return (
    <section className="mt-10 border-t-2 border-editorial-ink pt-4">
      <h2 className="section-heading text-2xl">สัญญาณที่มาช้า (30 วัน)</h2>
      <p className="mt-1 text-xs text-muted-foreground">ข้อมูลที่เกินเกณฑ์แต่มาถึงหลังวันข้อมูล จะแสดงในวันที่มาถึง พร้อมวันข้อมูล วันมีผล และเวลาที่ได้รับ ไม่ถูกตัดทิ้ง</p>
      {isLoading ? <p className="mt-3 text-sm text-muted-foreground">กำลังโหลด…</p>
        : !data?.length ? <p className="mt-3 text-sm text-muted-foreground">ยังไม่มีสัญญาณที่มาช้าใน 30 วัน</p>
        : (
          <ul className="mt-3 divide-y divide-editorial-rule text-sm">
            {data.map((s) => (
              <li key={`${s.metric_id}:${s.signal_date}`} className="py-2">
                <div className="font-semibold">{s.title} <span className="text-xs font-normal text-muted-foreground">· {s.severity === "high" ? "สำคัญมาก" : "น่าจับตา"}</span></div>
                <div className="text-xs text-muted-foreground">
                  ข้อมูลวันที่ {day(s.checks?.data_date)} · มีผล {day(s.checks?.effective_from)} · ได้รับ {time(s.checks?.received_at)} · แสดงวันที่ {day(s.signal_date)}
                  {" · "}ช้า {s.checks?.arrival_lag_days ?? "?"} วัน (ยอมรับได้ถึง {s.checks?.late_window_days ?? "?"} วัน)
                </div>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
