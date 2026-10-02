import { createFileRoute } from "@tanstack/react-router";

// pg_cron (Asia/Bangkok): 05:45 ?step=freeze records the data cutoff; 05:55 (+05:58 retry) ?step=publish
// publishes the edition. No fetching here — the 05:30 daily run collects data. Idempotent per day.
export const Route = createFileRoute("/api/public/brief")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const step = url.searchParams.get("step") === "freeze" ? "freeze" : "publish";
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const { refreshBrief, bangkokDate } = await import("@/lib/ingest.server");
        // rerun=1: rebuild an edition with the 05:45 window for a given date (new edition number); scheduler secret required.
        if (url.searchParams.get("rerun") === "1") {
          const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
          const denied = await authenticateCronRequest(request);
          if (denied) return denied;
          const d = url.searchParams.get("date") ?? bangkokDate();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Response("bad date", { status: 400 });
          await admin.rpc("detect_signals", { _d: d });
          await admin.rpc("rank_signals", { _d: d });
          await refreshBrief(admin, d, true, "publish", true);
          const { data } = await admin.from("daily_briefs").select("edition,data_window").eq("brief_date", d).maybeSingle();
          return Response.json({ ok: true, date: d, ...data });
        }
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
