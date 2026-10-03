import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSourceConfig, runSourceNow, saveSourceConfig } from "@/lib/source-config.functions";

type Cfg = { enabled: boolean; schedule: string; daily_hour: number | null; fetch_mode: string; max_attempts: number; retry_delay_min: number | null; range_start: number | null; range_end: number | null; extra_hours: number[] };
const DEF: Cfg = { enabled: true, schedule: "default", daily_hour: 5, fetch_mode: "default", max_attempts: 3, retry_delay_min: null, range_start: 16, range_end: 8, extra_hours: [] };
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
const SCHED = [
  ["default", "ตามรอบเดิมของระบบ"], ["hourly", "ทุกชั่วโมง"], ["3h", "ทุก 3 ชั่วโมง"], ["daily", "วันละครั้ง"], ["hourly_range", "ทุกชั่วโมงในช่วงเวลา (นอกช่วงทุก 3 ชม.)"], ["manual", "ดึงด้วยมือเท่านั้น"],
] as const;
const MODES = [
  ["default", "ตามค่าเดิม"], ["auto", "อัตโนมัติ (ตรงก่อน แล้วค่อย Firecrawl)"], ["direct", "ดึงตรงอย่างเดียว"], ["firecrawl", "ผ่าน Firecrawl อย่างเดียว"],
] as const;
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }) : "—");
const sel = "border border-editorial-rule bg-background px-2 py-1.5";

/** Admin: per-source on/off, update schedule, request method, retries and a run-now button. */
export function SourceControl() {
  const list = useServerFn(listSourceConfig);
  const { data, isLoading, error } = useQuery({ queryKey: ["source-config"], queryFn: () => list() });
  return (
    <section className="mt-12">
      <h2 className="section-heading text-3xl">จัดการแหล่งข้อมูล (ผู้ดูแล)</h2>
      <p className="mt-2 text-sm text-muted-foreground">ตั้งค่าแต่ละแหล่งได้เอง มีผลกับทุกคนทั้งเว็บไซต์ แหล่งที่เลือก "ตามรอบเดิมของระบบ" จะทำงานเหมือนเดิม เวลาตัดและเผยแพร่สรุปข่าว 05:45/05:55 ไม่เปลี่ยน</p>
      {isLoading && <p className="mt-4 text-sm text-muted-foreground">กำลังโหลด…</p>}
      {error && <p className="mt-4 text-sm text-destructive">โหลดไม่สำเร็จ (ต้องเข้าสู่ระบบผู้ดูแล)</p>}
      <ul className="mt-6 divide-y divide-editorial-rule border-y-2 border-editorial-ink">
        {(data ?? []).map((s) => <Row key={s.source} source={s.source} config={s.config} run={s.run} />)}
      </ul>
    </section>
  );
}

function Row({ source, config, run }: { source: string; config: Cfg | null; run: { ok: boolean; ran_at: string; rows: number; error: string | null; sample: string | null } | null }) {
  const qc = useQueryClient();
  const save = useServerFn(saveSourceConfig);
  const runNow = useServerFn(runSourceNow);
  const [c, setC] = useState<Cfg>({ ...DEF, ...(config ?? {}) });
  const [busy, setBusy] = useState<"" | "save" | "run">("");
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = JSON.stringify({ ...DEF, ...(config ?? {}) }) !== JSON.stringify(c);
  const up = (p: Partial<Cfg>) => setC({ ...c, ...p });
  return (
    <li className="py-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={c.enabled} onChange={(e) => up({ enabled: e.target.checked })} className="accent-[var(--up)]" />
          {source}
        </label>
        <span className="ml-auto text-xs text-muted-foreground">
          {!run ? "ยังไม่เคยดึง" : run.ok ? `สำเร็จ ${run.rows} รายการ · ${dt(run.ran_at)}` : <span className="text-destructive">ล้มเหลว {dt(run.ran_at)}: {run.error}</span>}
        </span>
      </div>
      {run?.sample && <div className="mt-1 text-xs text-muted-foreground">{run.sample}</div>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select aria-label="ช่วงเวลาอัปเดต" className={sel} value={c.schedule} onChange={(e) => up({ schedule: e.target.value })}>
          {SCHED.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {c.schedule === "daily" && (
          <select aria-label="เวลา" className={sel} value={c.daily_hour ?? 5} onChange={(e) => up({ daily_hour: Number(e.target.value) })}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00 น.</option>)}
          </select>
        )}
        {c.schedule === "hourly_range" && (
          <>
            <select aria-label="เริ่มช่วง" className={sel} value={c.range_start ?? 16} onChange={(e) => up({ range_start: Number(e.target.value) })}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hh(h)}</option>)}
            </select>
            ถึง
            <select aria-label="สิ้นสุดช่วง" className={sel} value={c.range_end ?? 8} onChange={(e) => up({ range_end: Number(e.target.value) })}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hh(h)}</option>)}
            </select>
          </>
        )}
        <label className="flex items-center gap-1">รอบเพิ่ม
          <input aria-label="รอบเพิ่ม (ชั่วโมง คั่นด้วยจุลภาค)" placeholder="เช่น 17" className={`${sel} w-24`} defaultValue={c.extra_hours.join(",")}
            onBlur={(e) => up({ extra_hours: [...new Set(e.target.value.split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 23))].sort((a, b) => a - b) })} />
        </label>
        <select aria-label="วิธีส่งคำขอ" className={sel} value={c.fetch_mode} onChange={(e) => up({ fetch_mode: e.target.value })}>
          {MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="flex items-center gap-1">ลองใหม่
          <select aria-label="จำนวนครั้ง" className={sel} value={c.max_attempts} onChange={(e) => up({ max_attempts: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} ครั้ง</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">รอ
          <select aria-label="ระยะรอก่อนลองใหม่" className={sel} value={c.retry_delay_min ?? ""} onChange={(e) => up({ retry_delay_min: e.target.value ? Number(e.target.value) : null })}>
            <option value="">ตามค่าเดิม</option>
            {[5, 10, 15, 30, 60, 120].map((n) => <option key={n} value={n}>{n} นาที</option>)}
          </select>
        </label>
        <button type="button" disabled={!dirty || !!busy} className="border border-editorial-ink px-3 py-1.5 font-semibold disabled:opacity-40"
          onClick={async () => { setBusy("save"); setMsg(null); try { const r = await save({ data: { source, ...c, daily_hour: c.schedule === "daily" ? c.daily_hour ?? 5 : null, range_start: c.schedule === "hourly_range" ? c.range_start ?? 16 : null, range_end: c.schedule === "hourly_range" ? c.range_end ?? 8 : null } }); setMsg(r.ok ? "บันทึกแล้ว" : r.error); if (r.ok) qc.invalidateQueries({ queryKey: ["source-config"] }); } catch { setMsg("บันทึกไม่สำเร็จ"); } finally { setBusy(""); } }}>
          {busy === "save" ? "กำลังบันทึก…" : "บันทึก"}
        </button>
        <button type="button" disabled={!!busy} className="underline disabled:opacity-40"
          onClick={async () => { setBusy("run"); setMsg("กำลังดึง… อาจใช้เวลาถึง 2 นาที"); try { const r = await runNow({ data: { source } }); setMsg(r.ok ? (r.run?.ok ? `ดึงสำเร็จ ${r.run.rows} รายการ` : `ดึงไม่สำเร็จ: ${r.run?.error ?? "ไม่ทราบสาเหตุ"}`) : r.error); qc.invalidateQueries({ queryKey: ["source-config"] }); } catch { setMsg("ดึงไม่สำเร็จ"); } finally { setBusy(""); } }}>
          {busy === "run" ? "กำลังดึง…" : "ดึงตอนนี้"}
        </button>
      </div>
      {msg && <p className="mt-1 text-xs" role="status">{msg}</p>}
    </li>
  );
}
