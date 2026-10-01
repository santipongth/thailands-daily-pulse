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

/** Manual retry from the failures page; at most once per 10 minutes for everyone. */
export const retrySources = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: l } = await supabaseAdmin.from("job_locks").select("locked_until").eq("name", "manual_retry").maybeSingle();
  if (l && new Date(l.locked_until) > new Date()) return { refreshed: false, wait_until: l.locked_until as string };
  await supabaseAdmin.from("job_locks").upsert({ name: "manual_retry", locked_until: new Date(Date.now() + 10 * 60e3).toISOString() });
  const { refreshIfStale } = await import("./ingest.server");
  try { return await refreshIfStale(3, { force: true, runKind: "manual" }); } catch (e) { console.error(e); return { refreshed: false }; }
});

/** Short-lived link to an archived raw evidence file (public data; bucket stays private). */
export const evidenceUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => ({ id: Number(d.id) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("raw_evidence").select("storage_path").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("not found");
    const { data: s, error } = await supabaseAdmin.storage.from("evidence").createSignedUrl(row.storage_path, 600);
    if (error) throw error;
    return { url: s.signedUrl };
  });
