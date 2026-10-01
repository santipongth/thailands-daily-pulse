import { createFileRoute } from "@tanstack/react-router";

// Called hourly by the scheduler. Safe without a secret: refreshIfStale is
// idempotent, only fetches when data is >3h old, and is guarded by a DB lease.
export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      POST: async () => {
        const { refreshIfStale } = await import("@/lib/ingest.server");
        return Response.json(await refreshIfStale());
      },
    },
  },
});
