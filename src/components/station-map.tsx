// TMD 3-hour stations nearest Bangkok with their latest reading (no map tiles → SSR-safe).
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { tmdTime } from "@/lib/bkk-geo";
import { thaiDate } from "@/lib/signals";
import { TodayEmpty, TodayItem, TodayList, TodaySection, thTime } from "@/components/today-section";

const POS: Record<string, [number, number]> = {
  "48455": [13.727, 100.56], "48454": [13.705, 100.567], "48453": [13.667, 100.606], "48456": [13.917, 100.6], "48429": [13.686, 100.767],
};

type W = { station_id: string; name: string; obs_date: string; obs_time: string | null; temp: number | null; rain24: number | null; dist_km: number | null; received_at: string };

export function StationMap() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["station-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("weather_station_obs").select("station_id,name,obs_date,obs_time,temp,rain24,dist_km,received_at").eq("kind", "3h").order("obs_date", { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      return data as W[];
    },
  });
  const latest = [...new Map((data ?? []).map((w) => [w.station_id, w])).values()].filter((w) => POS[w.station_id]).reverse();
  return (
    <TodaySection id="stations-h" title="สถานีตรวจอากาศใกล้กรุงเทพฯ"
      note="กรมอุตุนิยมวิทยา รายงานทุก 3 ชม. · อุณหภูมิ = สูงสุดของวัน ณ รายงานล่าสุด · ข้อมูลประกอบ ไม่นับเป็นสัญญาณ"
      action={<Link to="/stations" className="underline">ดูทุกสถานี →</Link>}>
      {isLoading ? <TodayEmpty>กำลังโหลด…</TodayEmpty>
        : isError ? <TodayEmpty>อ่านข้อมูลไม่ได้</TodayEmpty>
        : !latest.length ? <TodayEmpty>ไม่มีข้อมูลล่าสุด — รอรอบดึงกรมอุตุฯ ราย 3 ชม.</TodayEmpty> : (
          <TodayList>
            {latest.map((w) => (
              <TodayItem key={w.station_id} label={`${w.name}${w.dist_km != null ? ` · ${w.dist_km} กม.` : ""}`}
                meta={<><span>รายงาน {thaiDate(w.obs_date, { day: "numeric", month: "short" })}{tmdTime(w.obs_time) ? ` ${tmdTime(w.obs_time)} น.` : ""}</span><span>รับ {thTime(w.received_at)}</span></>}>
                <p><span className="font-editorial text-xl tabular-nums">{w.temp ?? "—"}°C</span> <span className="text-muted-foreground">· ฝน 24 ชม. {w.rain24 ?? "—"} มม.</span></p>
              </TodayItem>
            ))}
          </TodayList>
        )}
    </TodaySection>
  );
}
