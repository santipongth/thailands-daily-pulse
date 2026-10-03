// Table of TMD 3-hour stations nearest Bangkok with their latest reading (no map tiles → SSR-safe).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tmdTime } from "@/lib/bkk-geo";
import { EditorialDataSection } from "@/components/editorial-data-section";

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
    <EditorialDataSection eyebrow="กรมอุตุนิยมวิทยา · รอบล่าสุด" title="สถานีตรวจอากาศใกล้กรุงเทพฯ">
      {!latest.length ? <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีค่าสถานี — รอรอบดึงกรมอุตุฯ ราย 3 ชม.</p> : (
        <div className="mt-2 grid gap-4 ">
          <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b border-editorial-ink text-left text-muted-foreground"><th className="py-2">สถานี</th><th>°C</th><th>ฝน 24 ชม.</th><th>รายงานรอบ</th><th>รับเมื่อ</th></tr></thead>
            <tbody>
              {latest.map((w) => (
                 <tr key={w.station_id} className="border-b border-editorial-rule">
                   <td className="py-2 pr-2 font-medium">{w.name} <span className="text-xs font-normal text-muted-foreground">{w.dist_km} กม.</span></td>
                  <td>{w.temp ?? "—"}</td><td>{w.rain24 ?? "—"} มม.</td>
                  <td className="text-xs">{w.obs_date} {tmdTime(w.obs_time) ? `${tmdTime(w.obs_time)} น.` : ""}</td>
                  <td className="text-xs text-muted-foreground">{new Date(w.received_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })} น.</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
      <p className="mt-1 text-xs text-muted-foreground">ที่มา: กรมอุตุนิยมวิทยา ตรวจอากาศราย 3 ชม. · รายงานทุก 3 ชม. (01, 04, 07, 10, 13, 16, 19, 22 น.) · อุณหภูมิ = สูงสุดของวัน ณ รายงานล่าสุด</p>
    </EditorialDataSection>
  );
}
