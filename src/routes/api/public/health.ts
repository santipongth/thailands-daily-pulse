import { createFileRoute } from "@tanstack/react-router";

const H = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" };
const res = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: H });

/** Public uptime check: DB, queue backlog, latest brief, per-source freshness. No errors, paths or internals. */
export const Route = createFileRoute("/api/public/health")({ staticData: { sitemap: false }, server: { handlers: {
  GET: async ({ request }) => {
    const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const t0 = Date.now();
    const lim = await db.rpc("hit_rate_limit", { _bucket: `api:${ip}`, _limit: 120 });
    const dbMs = Date.now() - t0;
    if (lim.error) return res({ status: "down", checked_at: new Date().toISOString(), database: { ok: false } }, 503);
    if (lim.data === false) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...H, "Retry-After": "60" } });
    const nowIso = new Date().toISOString();
    const [q, oldest, brief, runs, br] = await Promise.all([
      db.from("ingest_jobs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]).lte("run_after", nowIso),
      db.from("ingest_jobs").select("run_after").eq("status", "queued").lte("run_after", nowIso).order("run_after").limit(1).maybeSingle(),
      db.from("daily_briefs").select("brief_date,published_at").not("published_at", "is", null).order("brief_date", { ascending: false }).limit(1).maybeSingle(),
      db.from("source_runs").select("source,ok,ran_at,last_ok_at"),
      db.from("source_breaker").select("source").gt("open_until", nowIso),
    ]);
    const paused = new Set((br.data ?? []).map((r) => r.source));
    const sources = (runs.data ?? []).map((r) => {
      const ageH = r.last_ok_at ? (Date.now() - Date.parse(r.last_ok_at)) / 3600e3 : null;
      return { source: r.source, state: paused.has(r.source) ? "paused" : ageH != null && ageH <= 24 ? "fresh" : "stale", last_ok_at: r.last_ok_at, last_run_ok: r.ok };
    });
    const bkk = new Date(Date.now() + 7 * 3600e3);
    const today = bkk.toISOString().slice(0, 10);
    const minutes = bkk.getUTCHours() * 60 + bkk.getUTCMinutes();
    const briefLate = minutes >= 390 && brief.data?.brief_date !== today;
    const backlog = q.count ?? 0;
    const oldestMin = oldest.data ? Math.round((Date.now() - Date.parse(oldest.data.run_after)) / 60e3) : 0;
    const stale = sources.filter((s) => s.state !== "fresh").length;
    const status = briefLate ? "down" : backlog > 30 || oldestMin > 90 || stale > 0 ? "degraded" : "ok";
    return res({
      status, checked_at: nowIso,
      database: { ok: true, latency_ms: dbMs },
      queue: { backlog, oldest_due_minutes: oldestMin },
      brief: { latest_date: brief.data?.brief_date ?? null, published_at: brief.data?.published_at ?? null, late: briefLate },
      sources: { fresh: sources.length - stale, stale: sources.filter((s) => s.state === "stale").length, paused: paused.size, items: sources },
    }, status === "down" ? 503 : 200);
  },
} } });
