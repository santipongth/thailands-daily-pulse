import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin-middleware";

export const FETCH_MODE_KEYS = ["longdo_mode", "thaiwater_mode"] as const;
export const FETCH_MODES = ["auto", "direct", "firecrawl"] as const;

/** Change how Longdo/ThaiWater are requested (site-wide). Only these two keys are writable; rate-limited to once per 30s. */
export const setFetchMode = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ key: z.enum(FETCH_MODE_KEYS), mode: z.enum(FETCH_MODES) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin.from("app_settings").select("updated_at").eq("key", data.key).maybeSingle();
    if (cur && Date.now() - Date.parse(cur.updated_at) < 30e3) return { ok: false as const, error: "เพิ่งเปลี่ยนไป กรุณารอ 30 วินาที" };
    await supabaseAdmin.from("app_settings").upsert({ key: data.key, value: data.mode, updated_at: new Date().toISOString() });
    return { ok: true as const };
  });
