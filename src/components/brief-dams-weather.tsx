// Fixed Daily Brief boxes: dams around Bangkok and weather stations near Bangkok, each today vs the day before.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shiftDate } from "@/lib/signals";
import { makeReasonOf, type Run } from "@/lib/missing-reason";

const DAMS = ["cp_dam_q", "dam_pasak_pct", "dam_pasak_out", "dam_khundan_pct"];
const fmt = (v: number | null | undefined, d = 2) => (v == null ? "—" : Number(v).toLocaleString("th-TH", { maximumFractionDigits: d }));
const delta = (a: number | null | undefined, b: number | null | undefined, d = 2) => {
  if (a == null || b == null) return "—";
  const x = Number(b) - Number(a);
  return x === 0 ? "ไม่เปลี่ยน" : `${x > 0 ? "+" : ""}${fmt(x, d)}`;
};

export function DamsBox({ date, cutoff }: { date: string; cutoff: string | null }) {
  const { data } = useQuery({
    queryKey: ["brief-dams", date],
    queryFn: async () => {
      const [{ data: m }, { data: o }, { data: r }] = await Promise.all([
        supabase.from("metrics").select("id,name_th,unit,decimals,family_id").in("id", DAMS),
        supabase.from("observations").select("metric_id,observed_on,value,received_at").in("metric_id", DAMS).eq("is_demo", false).lte("observed_on", date).gte("observed_on", shiftDate(date, -14)).order("observed_on", { ascending: false }),
        supabase.from("source_runs").select("source,ran_at,ok,error"),
      ]);
      return { m: m ?? [], o: o ?? [], runs: (r ?? []) as Run[] };
    },
  });
  if (!data) return null;
  const cut = cutoff ? Date.parse(cutoff) : Infinity;
  const reasonOf = makeReasonOf(data.runs, []);
  return (
    <section className="mt-10">
      <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">เขื่อนรอบกรุงเทพ วันนี้เทียบเมื่อวาน</h2>
      <table className="mt-2 w-full text-sm">
        <thead><tr className="text-left"><th>เขื่อน</th><th>ก่อนหน้า</th><th>วันนี้</th><th>เปลี่ยน / เหตุผล</th></tr></thead>
        <tbody>
          {DAMS.map((id) => {
            const m = data.m.find((x) => x.id === id);
            if (!m) return null;
            const os = data.o.filter((x) => x.metric_id === id);
            const t = os.find((x) => x.observed_on === date);
            const inTime = t && Date.parse(t.received_at) <= cut;
            const p = os.find((x) => x.observed_on < date);
            const note = !t ? reasonOf(m) : !inTime ? `ได้รับหลังเวลาตัด 05:45 — เข้าฉบับถัดไป` : p ? delta(p.value, t.value, m.decimals) : "ค่าแรก ยังไม่มีวันก่อนหน้า";
            return (
              <tr key={id} className="border-t border-border align-top">
                <td className="py-1 pr-2">{m.name_th}</td>
                <td className="pr-2">{p ? `${fmt(p.value, m.decimals)} ${m.unit}` : "—"}{p && p.observed_on !== shiftDate(date, -1) ? <span className="text-xs text-muted-foreground"> ({p.observed_on})</span> : null}</td>
                <td className="pr-2">{t ? `${fmt(t.value, m.decimals)} ${m.unit}` : "—"}</td>
                <td className={t && inTime ? "font-semibold" : "text-muted-foreground"}>{note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

type W = { station_id: string; name: string; kind: string; obs_date: string; obs_time: string | null; temp: number | null; tmin: number | null; rain24: number | null; rain_pct: number | null; descr: string | null; dist_km: number | null };

export function StationCompare({ date }: { date: string }) {
  const prev = shiftDate(date, -1);
  const { data } = useQuery({
    queryKey: ["brief-stations", date],
    queryFn: async () => (await supabase.from("weather_station_obs").select("*").in("obs_date", [date, prev])).data as W[] | null,
  });
  if (!data) return null;
  const st = [...new Map(data.filter((w) => w.kind === "3h").map((w) => [w.station_id, w])).values()].sort((a, b) => Number(a.dist_km) - Number(b.dist_km));
  const pv = [...new Map(data.filter((w) => w.kind === "7d").map((w) => [w.station_id, w])).values()];
  const get = (id: string, d: string, k: string) => data.find((w) => w.station_id === id && w.obs_date === d && w.kind === k);
  return (
    <section className="mt-10">
      <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">สถานีอากาศใกล้กรุงเทพ วันนี้เทียบเมื่อวาน</h2>
      <p className="mt-1 text-xs text-muted-foreground">กรมอุตุฯ ตรวจอากาศราย 3 ชม. — อุณหภูมิ = สูงสุดที่บันทึกได้ของวัน ณ รายงานล่าสุด, ฝน = ฝนสะสม 24 ชม. ของรายงานล่าสุด</p>
      {!st.length ? <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีค่าสถานีของ 2 วันนี้ — เริ่มเก็บ 3 ต.ค. 2569</p> : (
        <table className="mt-2 w-full text-sm">
          <thead><tr className="text-left"><th>สถานี</th><th>°C เมื่อวาน → วันนี้</th><th>ฝน มม. เมื่อวาน → วันนี้</th></tr></thead>
          <tbody>
            {st.map((s) => {
              const a = get(s.station_id, prev, "3h"), b = get(s.station_id, date, "3h");
              return (
                <tr key={s.station_id} className="border-t border-border">
                  <td className="py-1 pr-2">{s.name} <span className="text-xs text-muted-foreground">{fmt(s.dist_km, 0)} กม.</span></td>
                  <td>{fmt(a?.temp, 1)} → {fmt(b?.temp, 1)} <span className="text-xs">({a && b ? delta(a.temp, b.temp, 1) : !a ? "ไม่มีค่าเมื่อวาน" : "ยังไม่มีค่าวันนี้"})</span></td>
                  <td>{fmt(a?.rain24, 1)} → {fmt(b?.rain24, 1)} <span className="text-xs">({a && b ? delta(a.rain24, b.rain24, 1) : !a ? "ไม่มีค่าเมื่อวาน" : "ยังไม่มีค่าวันนี้"})</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {pv.length ? (
        <>
          <h3 className="mt-4 font-display">พยากรณ์ 7 วัน (แถวของวัน) กทม.และปริมณฑล</h3>
          <table className="mt-1 w-full text-sm">
            <thead><tr className="text-left"><th>จังหวัด</th><th>สูง/ต่ำ เมื่อวาน</th><th>สูง/ต่ำ วันนี้</th><th>ฝน % วันนี้</th></tr></thead>
            <tbody>
              {pv.map((p) => {
                const a = get(p.station_id, prev, "7d"), b = get(p.station_id, date, "7d");
                return (
                  <tr key={p.station_id} className="border-t border-border">
                    <td className="py-1 pr-2">{p.name}</td>
                    <td>{a ? `${fmt(a.temp, 0)}/${fmt(a.tmin, 0)}` : "ไม่มีค่าเมื่อวาน"}</td>
                    <td>{b ? `${fmt(b.temp, 0)}/${fmt(b.tmin, 0)}` : "ยังไม่มีค่าวันนี้"}{a && b ? <span className="text-xs"> (สูงสุด {delta(a.temp, b.temp, 0)})</span> : null}</td>
                    <td>{b ? `${fmt(b.rain_pct, 0)}% ${b.descr ?? ""}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
