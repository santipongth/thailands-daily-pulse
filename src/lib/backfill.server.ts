// Server-only: honest backfill from sources that publish history. Others are never invented.
// Rows keep their real data date; received_at = now; raw responses archived as evidence; run_kind "backfill".
import { withEvidence } from "./evidence.server";

async function json(url: string) {
  const r = await fetch(url, { headers: { "user-agent": "ThailandDailySignals/1.0" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

/** Daily mean of hourly pm2_5 per Bangkok date. */
function dailyMean(h: any): Record<string, number> {
  const acc: Record<string, number[]> = {};
  (h?.hourly?.time ?? []).forEach((t: string, i: number) => {
    const v = Number(h.hourly.pm2_5[i]);
    if (Number.isFinite(v)) (acc[t.slice(0, 10)] ??= []).push(v);
  });
  return Object.fromEntries(Object.entries(acc).filter(([, a]) => a.length >= 12).map(([d, a]) => [d, +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(1)]));
}

export const BACKFILL_SOURCES: string[] = []; // current sources (TMD 3h, GISTDA) publish no history
export const NO_HISTORY_NOTE = "แหล่งอื่น (น้ำมัน ทอง ระดับน้ำ ราคาอาหาร เว็บหน่วยงานรัฐ ฯลฯ) ไม่เปิดข้อมูลย้อนหลัง — ไม่สร้างค่าย้อนหลังให้";

export async function runBackfill(admin: any, days: number, today: string) {
  if (!BACKFILL_SOURCES.length) return { ok: false, inserted: 0, error: "ไม่มีแหล่งที่เปิดข้อมูลย้อนหลัง" } as any;
  const source = BACKFILL_SOURCES[0]!;
  const { data: job } = await admin.from("ingest_jobs").insert({ batch_id: crypto.randomUUID(), source, job_type: "backfill", run_kind: "backfill", status: "running", attempts: 1, started_at: new Date().toISOString() }).select("id").single();
  const rows: { metric_id: string; observed_on: string; value: number }[] = [];
  let error: string | null = null;
  try {
    await withEvidence(admin, job.id, source, async () => {
      const q = `hourly=pm2_5&timezone=Asia/Bangkok&past_days=${days}&forecast_days=1`;
      const [b, c, w] = await Promise.all([
        json(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=13.75&longitude=100.5&${q}`),
        json(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=18.79&longitude=98.98&${q}`),
        json(`https://api.open-meteo.com/v1/forecast?latitude=13.75&longitude=100.5&daily=temperature_2m_max&timezone=Asia/Bangkok&past_days=${days}&forecast_days=1`),
      ]);
      for (const [m, src] of [["pm25_bkk", b], ["pm25_cnx", c]] as const)
        for (const [d, v] of Object.entries(dailyMean(src))) if (d < today) rows.push({ metric_id: m, observed_on: d, value: v });
      (w?.daily?.time ?? []).forEach((d: string, i: number) => {
        const v = Number(w.daily.temperature_2m_max[i]);
        if (d < today && Number.isFinite(v)) rows.push({ metric_id: "tmax_bkk", observed_on: d, value: v });
      });
    });
  } catch (e) { error = String((e as Error).message ?? e).slice(0, 300); }

  // Never overwrite a real value; real history replaces illustrative demo rows.
  let inserted = 0;
  if (rows.length) {
    const { data: ex } = await admin.from("observations").select("metric_id,observed_on,is_demo").in("metric_id", [...new Set(rows.map((r) => r.metric_id))]).gte("observed_on", rows.map((r) => r.observed_on).sort()[0]);
    const has = new Set((ex ?? []).filter((e: any) => !e.is_demo).map((e: any) => `${e.metric_id}|${e.observed_on}`));
    const { data: ev } = await admin.from("raw_evidence").select("id").eq("job_id", job.id).order("id", { ascending: false }).limit(1).maybeSingle();
    const now = new Date().toISOString();
    const add = rows.filter((r) => !has.has(`${r.metric_id}|${r.observed_on}`)).map((r) => ({ ...r, period_start: r.observed_on, period_end: r.observed_on, effective_from: r.observed_on, is_demo: false, received_at: now, evidence_id: ev?.id ?? null }));
    if (add.length) { const { error: e } = await admin.from("observations").upsert(add, { onConflict: "metric_id,observed_on" }); if (e) error = e.message; else inserted = add.length; }
  }
  await admin.from("ingest_jobs").update({ status: error ? "failed" : "done", rows: inserted, error, finished_at: new Date().toISOString() }).eq("id", job.id);

  // Replay detection oldest → newest so events enter the register; archive briefs stay unpublished (ฉบับย้อนหลัง).
  const { refreshBrief } = await import("./ingest.server");
  const dates = [...new Set(rows.map((r) => r.observed_on))].sort();
  for (const d of dates) {
    await admin.rpc("detect_signals", { _d: d });
    await admin.rpc("rank_signals", { _d: d });
    await refreshBrief(admin, d, false).catch((e: any) => console.error("brief", d, e));
  }
  return { source, fetched: rows.length, inserted, days: dates.length, error, note: NO_HISTORY_NOTE };
}
