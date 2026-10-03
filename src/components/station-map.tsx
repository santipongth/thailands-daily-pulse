// Table of TMD 3-hour stations nearest Bangkok with their latest reading (no map tiles → SSR-safe).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const POS: Record<string, [number, number]> = {
  "48455": [13.727, 100.56], "48454": [13.705, 100.567], "48453": [13.667, 100.606], "48456": [13.917, 100.6], "48429": [13.686, 100.767],
};

type W = { station_id: string; name: string; obs_date: string; obs_time: string | null; temp: number | null; rain24: number | null; dist_km: number | null; received_at: string };

export function StationMap() {
  const { data } = useQuery({
    queryKey: ["station-map"],
    queryFn: async () => (await supabase.from("weather_station_obs").select("station_id,name,obs_date,obs_time,temp,rain24,dist_km,received_at").eq("kind", "3h").order("obs_date", { ascending: false }).limit(50)).data as W[] | null,
  });
  const latest = [...new Map((data ?? []).map((w) => [w.station_id, w])).values()].filter((w) => POS[w.station_id]).reverse();
  return (
    <section className="mt-8">
      <h2 className="border-b-2 border-foreground pb-1 font-display text-xl">สถานีตรวจอากาศใกล้กรุงเทพฯ (ค่าล่าสุด)</h2>
      {!latest.length ? <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีค่าสถานี — รอรอบดึงกรมอุตุฯ ราย 3 ชม.</p> : (
        <div className="mt-2 grid gap-4 ">
          <div className="overflow-x-auto"><table className="min-w-[520px] text-sm">
            <thead><tr className="text-left"><th>สถานี</th><th>°C</th><th>ฝน 24 ชม.</th><th>เวลา</th></tr></thead>
            <tbody>
              {latest.map((w) => (
                <tr key={w.station_id} className="border-t border-border">
                  <td className="py-1 pr-2">{w.name} <span className="text-xs text-muted-foreground">{w.dist_km} กม.</span></td>
                  <td>{w.temp ?? "—"}</td><td>{w.rain24 ?? "—"} มม.</td>
                  <td className="text-xs">{w.obs_date} {w.obs_time?.slice(-5) ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
      <p className="mt-1 text-xs text-muted-foreground">ที่มา: กรมอุตุนิยมวิทยา ตรวจอากาศราย 3 ชม. · อุณหภูมิ = สูงสุดของวัน ณ รายงานล่าสุด</p>
    </section>
  );
}
