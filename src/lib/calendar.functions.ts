import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin-middleware";
import { KAPOOK_URL_RE } from "./kapook";

/** Change the holiday page link (e.g. next year's Kapook page) and re-read it immediately. Only calendar.kapook.com/<year>/holiday links are accepted. */
export const setHolidayUrl = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ url: z.string().trim().regex(KAPOOK_URL_RE) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin.from("app_settings").select("updated_at").eq("key", "holiday_url").maybeSingle();
    if (cur && Date.now() - Date.parse(cur.updated_at) < 60e3) return { ok: false as const, error: "เพิ่งเปลี่ยนลิงก์ไป กรุณารอ 1 นาที" };
    await supabaseAdmin.from("app_settings").upsert({ key: "holiday_url", value: data.url, updated_at: new Date().toISOString() });
    await supabaseAdmin.from("source_registry").update({ url: data.url }).eq("source", "Kapook ปฏิทินวันหยุด");
    const { parseKapook } = await import("./kapook");
    try {
      const res = await fetch(data.url, { headers: { "user-agent": "Mozilla/5.0 ThailandDailySignals" }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) return { ok: false as const, error: `บันทึกลิงก์แล้ว แต่เปิดหน้าไม่ได้ (${res.status})` };
      const rows = parseKapook(await res.text());
      if (!rows.length) return { ok: false as const, error: "บันทึกลิงก์แล้ว แต่ไม่พบรายการวันหยุดในหน้า" };
      await supabaseAdmin.from("holidays").upsert(rows.map((r) => ({ ...r, source: "kapook", source_url: data.url, delete_hash: "" })), { onConflict: "holiday_date,name" });
      return { ok: true as const, count: rows.length };
    } catch (e) {
      return { ok: false as const, error: `บันทึกลิงก์แล้ว แต่ดึงไม่สำเร็จ: ${(e as Error).message}` };
    }
  });
