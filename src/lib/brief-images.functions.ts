import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Signed URLs (24h) for a brief's AI illustrations; bucket is private. */
export const getBriefImages = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("brief_images").select("slot,family_id,storage_path").eq("brief_date", data.date);
    if (!rows?.length) return [] as { slot: string; family_id: string | null; url: string }[];
    const { data: signed } = await supabaseAdmin.storage.from("brief-images").createSignedUrls(rows.map((r) => r.storage_path), 86400);
    return rows.map((r, i) => ({ slot: r.slot, family_id: r.family_id, url: signed?.[i]?.signedUrl ?? "" })).filter((r) => r.url);
  });
