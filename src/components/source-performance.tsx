import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { saveSourceConfig, sourcePerformance } from "@/lib/source-config.functions";
import { CAUSE_TH, type Cause, type Perf } from "@/lib/perf";

const SCHED_TH: Record<string, string> = { hourly: "ทุกชั่วโมง", "3h": "ทุก 3 ชั่วโมง", daily: "วันละครั้ง", manual: "ด้วยมือ" };
const MODE_TH: Record<string, string> = { auto: "อัตโนมัติ (ตรงก่อน แล้ว Firecrawl)", direct: "ตรง", firecrawl: "Firecrawl" };

/** Admin: per-source performance over 7/30 days with a confirm-to-apply recommendation. */
export function SourcePerformance() {
  const [days, setDays] = useState<7 | 30>(7);
  const perf = useServerFn(sourcePerformance);
  const { data, isLoading, error } = useQuery({ queryKey: ["source-perf", days], queryFn: () => perf({ data: { days } }) });
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="section-heading text-2xl">ประสิทธิภาพแต่ละแหล่ง</h2>
        {([7, 30] as const).map((d) => (
          <button key={d} type="button" onClick={() => setDays(d)} className={days === d ? "font-semibold underline" : "text-muted-foreground hover:underline"}>{d} วัน</button>
        ))}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">อัตราสำเร็จ สาเหตุที่ล้มเหลว และช่วงเวลา (เวลาไทย) ที่ดึงได้/ล้มเหลว คำแนะนำคิดจากกฎตายตัว จะไม่เปลี่ยนค่าจนกว่าคุณกด "ใช้ค่านี้"</p>
      {isLoading && <p className="mt-3 text-sm text-muted-foreground">กำลังวิเคราะห์…</p>}
      {error && <p className="mt-3 text-sm text-destructive">โหลดไม่สำเร็จ (ต้องเข้าสู่ระบบผู้ดูแล)</p>}
      <ul className="mt-4 divide-y divide-editorial-rule border-y-2 border-editorial-ink">
        {(data ?? []).map((p) => <PerfRow key={p.source} p={p} />)}
      </ul>
    </section>
  );
}

type Day = { day: string; runs: number; ok: number; files_changed: number; median_data_age_min: number | null };

function PerfRow({ p }: { p: Perf & { config: any; trend: Day[]; dataAgeMin: number | null } }) {
  const qc = useQueryClient();
  const save = useServerFn(saveSourceConfig);
  const [msg, setMsg] = useState<string | null>(null);
  const pct = Math.round(p.rate * 100);
  const causes = Object.entries(p.causes) as [Cause, number][];
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-semibold">{p.source}</span>
        <span className={pct >= 90 ? "text-primary" : pct >= 60 ? "" : "font-semibold text-destructive"}>สำเร็จ {pct}% ({p.ok}/{p.runs} รอบ)</span>
        <span className="text-xs text-muted-foreground">{p.runsPerDay.toFixed(1)} รอบ/วัน · ไฟล์ใหม่ {p.filesChangedPerDay === null ? "—" : p.filesChangedPerDay.toFixed(1)} ครั้ง/วัน</span>
        {p.dataAgeMin != null && <span className="text-xs text-muted-foreground" title="เวลาที่ข้อมูลของต้นทางเก่าอยู่ตอนดึง (มัธยฐาน)">ข้อมูลอายุตอนดึง ~{p.dataAgeMin < 120 ? `${p.dataAgeMin} นาที` : `${(p.dataAgeMin / 60).toFixed(1)} ชม.`}</span>}
      </div>
      {p.trend.length > 1 && (
        <div className="mt-2 flex items-end gap-1" aria-label="อัตราสำเร็จรายวัน">
          <span className="mr-1 text-[10px] text-muted-foreground">รายวัน</span>
          {p.trend.map((d) => {
            const r = d.runs ? d.ok / d.runs : 0;
            return <div key={d.day} title={`${d.day}: สำเร็จ ${d.ok}/${d.runs} · ไฟล์ใหม่ ${d.files_changed}${d.median_data_age_min != null ? ` · อายุข้อมูล ${d.median_data_age_min} นาที` : ""}`}
              className={`w-3 ${r >= 0.9 ? "bg-primary" : r >= 0.6 ? "bg-accent" : "bg-destructive"}`} style={{ height: `${Math.max(4, r * 24)}px` }} />;
          })}
        </div>
      )}
      {causes.length > 0 && <div className="mt-1 text-xs text-muted-foreground">ล้มเหลวเพราะ: {causes.map(([c, n]) => `${CAUSE_TH[c]} ${n}`).join(" · ")}</div>}
      <div className="mt-2 flex gap-px" aria-label="ผลแยกตามชั่วโมง">
        {p.byHour.map((h, i) => {
          const n = h.ok + h.fail;
          const cls = !n ? "bg-muted" : h.fail === 0 ? "bg-primary" : h.ok === 0 ? "bg-destructive" : "bg-accent";
          return <div key={i} title={`${String(i).padStart(2, "0")}:00 น. — สำเร็จ ${h.ok} ล้มเหลว ${h.fail}`} className={`h-4 flex-1 ${cls}`} />;
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
      {p.rec && (
        <div className="mt-2 border-l-2 border-editorial-red pl-3">
          <div className="font-semibold">คำแนะนำ</div>
          <ul className="list-disc pl-5 text-xs">{p.rec.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          <div className="mt-1 text-xs text-muted-foreground">
            {[p.rec.schedule && `รอบ: ${SCHED_TH[p.rec.schedule]}${p.rec.schedule === "daily" ? ` ${String(p.rec.daily_hour ?? 5).padStart(2, "0")}:00 น.` : ""}`, p.rec.fetch_mode && `วิธีส่งคำขอ: ${MODE_TH[p.rec.fetch_mode]}`, p.rec.retry_delay_min && `รอก่อนลองใหม่ ${p.rec.retry_delay_min} นาที`, p.rec.max_attempts && `ลอง ${p.rec.max_attempts} ครั้ง`].filter(Boolean).join(" · ")}
          </div>
          <button type="button" className="mt-1 border border-editorial-ink px-3 py-1 text-xs font-semibold" onClick={async () => {
            const cfg = p.config;
            try {
              const r = await save({ data: {
                source: p.source, enabled: cfg?.enabled ?? true,
                schedule: (p.rec!.schedule ?? cfg?.schedule ?? "default") as any,
                daily_hour: (p.rec!.schedule ?? cfg?.schedule) === "daily" ? p.rec!.daily_hour ?? cfg?.daily_hour ?? 5 : null,
                fetch_mode: (p.rec!.fetch_mode ?? cfg?.fetch_mode ?? "default") as any,
                max_attempts: p.rec!.max_attempts ?? cfg?.max_attempts ?? 3,
                retry_delay_min: p.rec!.retry_delay_min ?? cfg?.retry_delay_min ?? null,
              } });
              setMsg(r.ok ? "ใช้ค่าแล้ว — ดู/แก้ได้ที่หน้าตั้งค่า" : r.error);
              qc.invalidateQueries({ queryKey: ["source-perf"] }); qc.invalidateQueries({ queryKey: ["source-config"] });
            } catch { setMsg("บันทึกไม่สำเร็จ"); }
          }}>ใช้ค่านี้</button>
          {msg && <span className="ml-2 text-xs" role="status">{msg}</span>}
        </div>
      )}
    </li>
  );
}
