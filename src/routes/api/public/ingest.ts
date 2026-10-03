import { createFileRoute } from "@tanstack/react-router";

// Called hourly by the scheduler. Safe without a secret: refreshIfStale is
// idempotent, only fetches when data is >3h old, and is guarded by a DB lease.
export const Route = createFileRoute("/api/public/ingest")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { refreshIfStale } = await import("@/lib/ingest.server");
        // mode=backfill: one-off history import; requires the scheduler secret.
        if (new URL(request.url).searchParams.get("mode") === "backfill") {
          const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
          const denied = await authenticateCronRequest(request);
          if (denied) return denied;
          const days = Math.min(60, Math.max(1, Number(new URL(request.url).searchParams.get("days") ?? 30)));
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { runBackfill } = await import("@/lib/backfill.server");
          const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
          return Response.json(await runBackfill(supabaseAdmin, days, today));
        }
        // mode=daily (05:30 Bangkok) forces a full run of every government source; lease-guarded and once per day.
        if (new URL(request.url).searchParams.get("mode") === "daily") {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
          const { data: l } = await supabaseAdmin.from("job_locks").select("locked_until").eq("name", "daily_run").maybeSingle();
          if (l && new Date(l.locked_until).toISOString().slice(0, 10) === today) return Response.json({ refreshed: false, reason: "already ran today" });
          const r = await refreshIfStale(3, { force: true, runKind: "daily" });
          if (r.refreshed) await supabaseAdmin.from("job_locks").upsert({ name: "daily_run", locked_until: new Date(Date.now() + 7 * 3600e3).toISOString() });
          return Response.json(r);
        }
        // mode=dams (hourly :20): dams-only forced collection; refreshDams holds a 10-min lease so repeat calls are no-ops.
        if (new URL(request.url).searchParams.get("mode") === "dams") {
          const { refreshDams } = await import("@/lib/ingest.server");
          return Response.json(await refreshDams());
        }
        // mode=social (every 30 min): FM91 posts + AI relevance check; lease-guarded, max 10 new posts/run.
        if (new URL(request.url).searchParams.get("mode") === "social") {
          // Same tick also runs sources an admin set to custom HH:MM times (≤30 min precision).
          const { runCustomDue } = await import("@/lib/ingest.server");
          const custom = await runCustomDue().catch((e) => ({ queued: 0, error: String(e).slice(0, 200) }));
          const { refreshSocial, FM91_SOURCE } = await import("@/lib/fm91.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: cfg } = await supabaseAdmin.from("source_config").select("enabled,schedule").eq("source", FM91_SOURCE).maybeSingle();
          // Admin turned it off or chose its own schedule (then the hourly queue runs it) → skip the 30-min default.
          if (cfg && (!cfg.enabled || cfg.schedule !== "default")) return Response.json({ fetched: 0, added: 0, skipped: cfg.enabled ? "admin schedule" : "disabled by admin", custom });
          return Response.json({ ...(await refreshSocial()), custom });
        }
        // mode=early (00:10/03:00/05:00 Bangkok): forced collection so overnight price changes land before the 05:45 cutoff.
        if (new URL(request.url).searchParams.get("mode") === "early") return Response.json(await refreshIfStale(3, { force: true, runKind: "daily" }));
        return Response.json(await refreshIfStale());
      },
    },
  },
});
