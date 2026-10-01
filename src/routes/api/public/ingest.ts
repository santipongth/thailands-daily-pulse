import { createFileRoute } from "@tanstack/react-router";

// Called hourly by the scheduler. Safe without a secret: refreshIfStale is
// idempotent, only fetches when data is >3h old, and is guarded by a DB lease.
export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { refreshIfStale } = await import("@/lib/ingest.server");
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
        return Response.json(await refreshIfStale());
      },
    },
  },
});
