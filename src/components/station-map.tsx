// TMD 3-hour stations nearest Bangkok with their latest reading (no map tiles → SSR-safe).
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { tmdTime } from "@/lib/bkk-geo";
import { thaiDate } from "@/lib/signals";
import { TodayEmpty, TodaySection } from "@/components/today-section";

const POS: Record<string, [number, number]> = {
  "48455": [13.727, 100.56], "48454": [13.705, 100.567], "48453": [13.667, 100.606], "48456": [13.917, 100.6], "48429": [13.686, 100.767],
};

type W = { station_id: string; name: string; obs_date: string; obs_time: string | null; temp: number | null; rain24: number | null; dist_km: number | null; received_at: string };

export function StationMap() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["station-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("weather_station_obs").select("station_id,name,obs_date,obs_time,temp,rain24,dist_km,received_at").eq("kind", "3h").order("received_at", { ascending: false }).limit(60);
      if (error) throw new Error(error.message);
      return data as W[];
    },
  });
  const first = new Map<string, W>();
  for (const w of data ?? []) if (!first.has(w.station_id)) first.set(w.station_id, w); // newest per station
  const latest = [...first.values()]
    .filter((w) => POS[w.station_id])
    .sort((a, b) => (b.temp ?? -Infinity) - (a.temp ?? -Infinity));
  return (
    <TodaySection id="stations-h" title="สถานีตรวจอากาศใกล้กรุงเทพฯ"
      note="กรมอุตุนิยมวิทยา รายงานทุก 3 ชม. · อุณหภูมิ = สูงสุดของวัน ณ รายงานล่าสุด · ข้อมูลประกอบ ไม่นับเป็นสัญญาณ"
      action={<Link to="/stations" className="underline">ดูทุกสถานี →</Link>}>
      {isLoading ? <TodayEmpty>กำลังโหลด…</TodayEmpty>
        : isError ? <TodayEmpty>อ่านข้อมูลไม่ได้</TodayEmpty>
        : !latest.length ? <TodayEmpty>ไม่มีข้อมูลล่าสุด — รอรอบดึงกรมอุตุฯ ราย 3 ชม.</TodayEmpty> : (
          <div>
            <ReportStatus rows={latest} />
            <div className="hidden grid-cols-[1fr_auto_auto] gap-x-6 border-b border-editorial-rule pb-2 text-xs uppercase tracking-wider text-muted-foreground sm:grid">
              <span>สถานี</span>
              <span className="w-20 text-right">อุณหภูมิ</span>
              <span className="w-20 text-right">ฝน 24 ชม.</span>
            </div>
            <ul>
              {latest.map((w, i) => {
                const rain = w.rain24 ?? 0;
                return (
                  <li key={w.station_id} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-6 border-b border-editorial-rule py-3 last:border-b-0">
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">
                        {w.name}
                        {i === 0 && <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wider text-editorial-red">ร้อนสุด</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {w.dist_km != null && <>{w.dist_km} กม. · </>}
                        รายงาน {thaiDate(w.obs_date, { day: "numeric", month: "short" })}{tmdTime(w.obs_time) ? ` ${tmdTime(w.obs_time)} น.` : ""}
                      </p>
                    </div>
                    <p className="w-20 text-right font-editorial text-2xl tabular-nums leading-none">{w.temp ?? "—"}<span className="text-sm">°C</span></p>
                    <p className={`w-20 text-right tabular-nums ${rain > 0 ? "font-bold text-editorial-red" : "text-muted-foreground"}`}>
                      {w.rain24 ?? "—"} <span className="text-xs font-normal">มม.</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
    </TodaySection>
  );
}

/** "รายงานรอบ 01:00 น. · รอบถัดไป ~04:00 น." + grey "ข้อมูลล่าช้า" when older than 4h. */
function ReportStatus({ rows }: { rows: W[] }) {
  const at = Math.max(...rows.map((w) => {
    const m = String(w.obs_time ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
    return m ? Date.parse(`${m[3]}-${m[1]}-${m[2]}T${m[4]}:${m[5]}:00+07:00`) : 0;
  }));
  if (!at) return null;
  const hm = (ms: number) => new Date(ms).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
  const late = Date.now() - at > 4 * 3600e3;
  return (
    <p className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>รายงานรอบ <b className="text-foreground">{hm(at)} น.</b> · รอบถัดไปของกรมอุตุฯ ~{hm(at + 3 * 3600e3)} น. (ขึ้นเว็บช้ากว่าราว 1 ชม.)</span>
      {late && <span className="border border-editorial-rule bg-muted px-1.5 py-0.5 font-semibold">ข้อมูลล่าช้า</span>}
    </p>
  );
}
