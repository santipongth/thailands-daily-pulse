import { createFileRoute } from "@tanstack/react-router";

// Called at 06:00 and 06:20 Bangkok by pg_cron. Forces a fresh fetch, then publishes the day's brief.
// Safe without a secret: lease-guarded, idempotent per day, and only reads public sources.
export const Route = createFileRoute("/api/public/brief")({
  server: {
    handlers: {
      POST: async () => {
        const { refreshIfStale } = await import("@/lib/ingest.server");
        return Response.json(await refreshIfStale(1, { force: true, publish: true }));
      },
    },
  },
});
