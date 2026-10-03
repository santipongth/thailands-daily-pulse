// Daily Brief: TMD forecast vs previous day + daily line charts of every real metric (last 14 days up to the brief date).
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { shiftDate } from "@/lib/signals";

const FC = ["fc_tmax_bkk", "fc_tmin_bkk"];
const fmt = (v: number | undefined, d = 1) => (v == null ? "—" : Number(v).toLocaleString("th-TH", { maximumFractionDigits: d }));

function useTrend(date: string) {
  return useQuery({
    queryKey: ["brief-trends", date],
    queryFn: async () => {
      const [{ data: m }, { data: o }] = await Promise.all([
        supabase.from("metrics").select("id,name_th,unit,decimals,family_id,sort").order("sort"),
        supabase.from("observations").select("metric_id,observed_on,value").eq("is_demo", false).lte("observed_on", date).gte("observed_on", shiftDate(date, -13)).order("observed_on"),
      ]);
      return { m: m ?? [], o: o ?? [] };
    },
  });
}

export function ForecastCompare({ date }: { date: string }) {
  const { data } = useTrend(date);
  if (!data) return null;
  return (
    <section className="mt-10">
      <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">พยากรณ์อากาศ กทม. (กรมอุตุฯ) วันนี้เทียบวันก่อนหน้า</h2>
      <div className="overflow-x-auto"><table className="mt-2 min-w-[620px] w-full text-sm">
        <thead><tr className="text-left"><th>รายการ</th><th>ก่อนหน้า</th><th>วันนี้</th><th>เปลี่ยน</th></tr></thead>
        <tbody>
          {FC.map((id) => {
            const m = data.m.find((x) => x.id === id);
            if (!m) return null;
            const os = data.o.filter((x) => x.metric_id === id);
            const t = os.find((x) => x.observed_on === date);
            const p = [...os].reverse().find((x) => x.observed_on < date);
            const d = t && p ? Number(t.value) - Number(p.value) : null;
            return (
              <tr key={id} className="border-t border-border">
                <td className="py-1 pr-2">{m.name_th}</td>
                <td>{p ? `${fmt(p.value)} ${m.unit}` : "—"}{p ? <span className="text-xs text-muted-foreground"> ({p.observed_on})</span> : null}</td>
                <td>{t ? `${fmt(t.value)} ${m.unit}` : "ยังไม่มีพยากรณ์ของวันนี้"}</td>
                <td className="font-semibold">{d === null ? (t ? "ค่าแรก ยังไม่มีวันก่อนหน้า" : "—") : d === 0 ? "ไม่เปลี่ยน" : `${d > 0 ? "+" : ""}${fmt(d)}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </section>
  );
}

export function DailyTrends({ date }: { date: string }) {
  const { data } = useTrend(date);
  if (!data) return null;
  const ms = data.m.filter((m) => data.o.some((o) => o.metric_id === m.id));
  return (
    <section className="mt-10">
      <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">กราฟรายวัน 14 วันล่าสุด</h2>
      <p className="mt-1 text-xs text-muted-foreground">ข้อมูลจริงเท่านั้น หนึ่งจุดต่อวัน — เห็นการเปลี่ยนแปลงตั้งแต่วันแรกที่เก็บได้</p>
      {!ms.length ? <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีข้อมูลจริงในช่วงนี้</p> : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ms.map((m) => {
            const pts = data.o.filter((o) => o.metric_id === m.id).map((o) => ({ d: o.observed_on.slice(5), v: Number(o.value) }));
            const last = pts[pts.length - 1], prev = pts[pts.length - 2];
            return (
              <div key={m.id} className="border border-border p-2">
                <div className="text-sm font-semibold">{m.name_th}</div>
                <div className="text-xs text-muted-foreground">{last ? `${fmt(last.v, m.decimals)} ${m.unit}` : "—"}{prev && last ? ` · ก่อนหน้า ${fmt(prev.v, m.decimals)}` : " · จุดแรก"}</div>
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pts}>
                      <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                      <YAxis hide domain={["auto", "auto"]} />
                      <Tooltip formatter={(v) => fmt(Number(v), m.decimals)} />
                      <Line type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
