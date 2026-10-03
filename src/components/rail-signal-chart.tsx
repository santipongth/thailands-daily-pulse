import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Signal } from "@/lib/signals";
import { BLOCK_TH, bkkBlock, bkkDate, isServiceAlert } from "@/lib/rail";

/** Train signal: delay/suspension notices per 3-hour block on the signal day vs the 7-day average per block + the notices. */
export function RailSignalChart({ s }: { s: Signal }) {
  const line = s.metric_id === "rail_mrt" ? "MRT" : "BTS";
  const day = s.signal_date;
  const { data } = useQuery({
    queryKey: ["rail-signal", line, day],
    queryFn: async () => (await supabase.from("social_posts").select("text,posted_at,received_at,url,rail_status,rail_reason,rail_day").eq("source", `${line} (X)`)
      .gte("posted_at", new Date(Date.parse(day + "T00:00:00+07:00") - 7 * 86400e3).toISOString())
      .lt("posted_at", new Date(Date.parse(day + "T00:00:00+07:00") + 86400e3).toISOString()).order("posted_at")).data ?? [],
  });
  if (!data) return null;
  const alerts = data.filter((p) => isServiceAlert(p.text));
  const dayOf = (p: any) => p.rail_day ?? bkkDate(p.posted_at);
  const todays = alerts.filter((p: any) => dayOf(p) === day && (p.rail_status ?? "counted") === "counted");
  const past = alerts.filter((p: any) => dayOf(p) < day && (p.rail_status ?? "counted") === "counted");
  const skipped = data.filter((p: any) => bkkDate(p.posted_at) === day && p.rail_status && p.rail_status !== "counted");
  const rows = BLOCK_TH.map((k, b) => ({
    k, today: todays.filter((p) => bkkBlock(p.posted_at) === b).length,
    avg: +(past.filter((p) => bkkBlock(p.posted_at) === b).length / 7).toFixed(2),
  }));
  return (
    <div className="mt-3 border-t border-editorial-rule pt-2 text-xs">
      <div className="h-28"><ResponsiveContainer><BarChart data={rows}><XAxis dataKey="k" fontSize={9} /><YAxis hide allowDecimals={false} /><Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="today" name="วันนี้" fill="var(--map-5)" /><Bar dataKey="avg" name="เฉลี่ย 7 วันก่อน" fill="var(--map-2)" /></BarChart></ResponsiveContainer></div>
      <p className="mt-1 text-muted-foreground">นับเฉพาะประกาศ “ล่าช้า/ขัดข้อง/หยุดให้บริการ” จากบัญชีทางการ {line} (ประกาศเป็นรายสาย ไม่ใช่รายสถานี) · 1 ครั้ง = น่าจับตา, 3 ครั้งขึ้นไป = สำคัญมาก</p>
      <ul className="mt-1 space-y-1">{todays.slice(-3).reverse().map((p) => (
        <li key={p.url}><a href={p.url} target="_blank" rel="noreferrer" className="underline">{new Date(p.posted_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })} น.</a> {p.text.slice(0, 120)}</li>
      ))}</ul>
      {skipped.length > 0 && <><p className="mt-2 font-semibold">ไม่นับในสัญญาณ ({skipped.length})</p><ul className="space-y-1 text-muted-foreground">{skipped.map((p: any) => (
        <li key={p.url}><a href={p.url} target="_blank" rel="noreferrer" className="underline">{p.text.slice(0, 80)}</a> — {p.rail_reason}</li>))}</ul></>}
    </div>
  );
}
