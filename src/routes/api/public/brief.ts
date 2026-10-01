import { createFileRoute } from "@tanstack/react-router";

// pg_cron (Asia/Bangkok): 05:45 ?step=freeze records the data cutoff; 05:55 (+05:58 retry) ?step=publish
// publishes the edition. No fetching here — the 05:30 daily run collects data. Idempotent per day.
export const Route = createFileRoute("/api/public/brief")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const step = new URL(request.url).searchParams.get("step") === "freeze" ? "freeze" : "publish";
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const { refreshBrief, bangkokDate } = await import("@/lib/ingest.server");
        const date = bangkokDate();
        const { data: b } = await admin.from("daily_briefs").select("published_at").eq("brief_date", date).maybeSingle();
        if (b?.published_at) return Response.json({ ok: true, already: true });
        await admin.rpc("rank_signals", { _d: date });
        await refreshBrief(admin, date, step === "publish", step);
        return Response.json({ ok: true, step });
      },
    },
  },
});
