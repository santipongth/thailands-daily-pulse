import { createServerFn } from "@tanstack/react-start";

export const refreshData = createServerFn({ method: "POST" }).handler(async () => {
  const { refreshIfStale } = await import("./ingest.server");
  try {
    return await refreshIfStale();
  } catch (e) {
    console.error("refresh failed", e);
    return { refreshed: false };
  }
});
