import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Signal } from "@/lib/signals";
import { BLOCK_TH, bkkBlock, bkkDate, isServiceAlert } from "@/lib/rail";
import { WeeklyComparison } from "@/components/weekly-comparison";
import { shiftDate } from "@/lib/signals";

/** Train signal: delay/suspension notices per 3-hour block on the signal day vs the 7-day average per block + the notices. */
const tm = (iso: string) => (iso ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " น." : "—");

export function RailSignalChart({ s }: { s: Signal }) {
  const line = s.metric_id === "rail_mrt" ? "MRT" : "BTS";
  const day = s.signal_date;
  const { data, isPending, isError } = useQuery({
    queryKey: ["rail-signal", line, day],
    queryFn: async () => (await supabase.from("social_posts").select("text,posted_at,received_at,url,rail_status,rail_reason,rail_day").eq("source", `${line} (X)`)
      .gte("posted_at", new Date(Date.parse(day + "T00:00:00+07:00") - 15 * 86400e3).toISOString())
      .lt("posted_at", new Date(Date.parse(day + "T00:00:00+07:00") + 86400e3).toISOString()).order("posted_at")).data ?? [],
  });
  if (isPending) return <p className="mt-5 border-t border-editorial-rule pt-4 text-xs text-muted-foreground">กำลังโหลดข้อมูลรายสัปดาห์…</p>;
  if (isError) return <p className="mt-5 border-t border-editorial-rule pt-4 text-xs text-muted-foreground">ข้อมูลไม่พอสำหรับเทียบ · โหลดประกาศย้อนหลังไม่ได้</p>;
  const alerts = data.filter((p) => isServiceAlert(p.text));
  const dayOf = (p: any) => p.rail_day ?? bkkDate(p.posted_at);
  const todays = alerts.filter((p: any) => dayOf(p) === day && (p.rail_status ?? "counted") === "counted");
  const past = alerts.filter((p: any) => dayOf(p) < day && (p.rail_status ?? "counted") === "counted");
  const previousStart = shiftDate(day, -13), latestStart = shiftDate(day, -6);
  const previousCount = past.filter((p: any) => dayOf(p) >= previousStart && dayOf(p) < latestStart).length;
  const latestCount = [...past, ...todays].filter((p: any) => dayOf(p) >= latestStart && dayOf(p) <= day).length;
  const coveredDays = (from: string, to: string) => new Set(data.filter((p: any) => dayOf(p) >= from && dayOf(p) <= to).map(dayOf)).size;
  const prevDays = coveredDays(previousStart, shiftDate(latestStart, -1));
  const curDays = coveredDays(latestStart, day);
  const skipped = data.filter((p: any) => bkkDate(p.posted_at) === day && p.rail_status && p.rail_status !== "counted");
  const rows = BLOCK_TH.map((k, b) => ({
    k, today: todays.filter((p) => bkkBlock(p.posted_at) === b).length,
    avg: +(past.filter((p) => bkkBlock(p.posted_at) === b).length / 7).toFixed(2),
  }));
  return (
    <WeeklyComparison weeks={[
      { label: "7 วันก่อนหน้า", value: prevDays === 7 ? previousCount : null, coverage: `พบโพสต์ ${prevDays} วันจาก 7 วัน` },
      { label: "7 วันล่าสุด", value: curDays === 7 ? latestCount : null, coverage: `พบโพสต์ ${curDays} วันจาก 7 วัน` },
    ]} unit="ประกาศ" decimals={0} note="จำนวนประกาศผิดปกติที่นับเป็นสัญญาณในแต่ละช่วง · เทียบจำนวนได้เมื่อมีโพสต์ครบทุกวันเท่านั้น; วันที่ไม่มีโพสต์ไม่ยืนยันว่าไม่มีเหตุ">
      <div className="mt-4 border-t border-editorial-rule pt-3 text-xs">
      <p className="mb-2 text-muted-foreground">วันนี้เทียบค่าเฉลี่ย 7 วันก่อน แยกทุก 3 ชั่วโมง</p>
      <div className="grid grid-cols-8 gap-1 border-b border-editorial-rule pt-2 text-center">
        {rows.map((r) => <div key={r.k} className="min-w-0" title={`${r.k}: วันนี้ ${r.today} ประกาศ; เฉลี่ย 7 วันก่อน ${r.avg} ประกาศ`}>
          <div className="flex h-16 items-end justify-center gap-0.5"><span className="w-2 bg-chart-1" style={{ height: `${Math.max(r.today ? 4 : 0, r.today / Math.max(1, ...rows.map((x) => x.today), ...rows.map((x) => x.avg)) * 100)}%` }} /><span className="w-2 bg-muted-foreground/50" style={{ height: `${Math.max(r.avg ? 4 : 0, r.avg / Math.max(1, ...rows.map((x) => x.today), ...rows.map((x) => x.avg)) * 100)}%` }} /></div>
          <p className="mt-1 truncate text-[10px] text-muted-foreground">{r.k}</p>
        </div>)}
      </div>
      <p className="mt-1 text-muted-foreground">■ วันนี้ · ▧ เฉลี่ย 7 วันก่อน (ดูจำนวนแต่ละช่วงโดยแตะ/ชี้กราฟ)</p>
      <p className="mt-1 text-muted-foreground">นับเฉพาะประกาศ “ล่าช้า/ขัดข้อง/หยุดให้บริการ” จากบัญชีทางการ {line} (ประกาศเป็นรายสาย ไม่ใช่รายสถานี) · 1 ครั้ง = น่าจับตา, 3 ครั้งขึ้นไป = สำคัญมาก</p>
      <ul className="mt-1 space-y-1">{[...todays].reverse().map((p: any) => (
        <li key={p.url} className="border-t border-editorial-rule pt-1"><span className="text-muted-foreground">ประกาศ {tm(p.posted_at)} · ได้รับ {tm(p.received_at)} · </span><a href={p.url} target="_blank" rel="noreferrer" className="underline">ดูโพสต์ต้นฉบับ</a>
          <p className="whitespace-pre-line text-foreground">{p.text}</p></li>
      ))}</ul>
      {skipped.length > 0 && <><p className="mt-2 font-semibold">ไม่นับในสัญญาณ ({skipped.length})</p><ul className="space-y-1 text-muted-foreground">{skipped.map((p: any) => (
        <li key={p.url}><a href={p.url} target="_blank" rel="noreferrer" className="underline">ประกาศ {tm(p.posted_at)}</a> — {p.rail_reason}<p className="whitespace-pre-line">{p.text}</p></li>))}</ul></>}
      </div>
    </WeeklyComparison>
  );
}
