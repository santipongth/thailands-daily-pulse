import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const refreshData = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ maxAgeHours: z.number().min(1).max(24).default(3) }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { refreshIfStale } = await import("./ingest.server");
    try {
      return await refreshIfStale(data.maxAgeHours);
    } catch (e) {
      console.error("refresh failed", e);
      return { refreshed: false };
    }
  });
