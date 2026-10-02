import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sha = async (s: string) => {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
};

/** Anyone may add a holiday (user's choice). Validated, capped at 30 additions/hour site-wide; returns a delete token for the adder's device. */
export const addHoliday = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      holiday_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      name: z.string().trim().min(2).max(120),
      kind: z.enum(["ราชการ", "พิเศษ"]),
      note: z.string().trim().max(300).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const y = Number(data.holiday_date.slice(0, 4));
    const now = new Date().getUTCFullYear();
    if (y < now - 1 || y > now + 2) return { ok: false as const, error: "วันที่ต้องอยู่ในช่วงปีที่แล้วถึงอีก 2 ปีข้างหน้า" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("holidays").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 3600e3).toISOString());
    if ((count ?? 0) >= 30) return { ok: false as const, error: "มีการเพิ่มวันหยุดจำนวนมากในชั่วโมงนี้ กรุณาลองใหม่ภายหลัง" };
    const { count: dup } = await supabaseAdmin.from("holidays").select("id", { count: "exact", head: true }).eq("holiday_date", data.holiday_date).eq("name", data.name);
    if (dup) return { ok: false as const, error: "มีวันหยุดนี้อยู่แล้ว" };
    const token = crypto.randomUUID();
    const { data: row, error } = await supabaseAdmin.from("holidays").insert({ ...data, note: data.note || null, delete_hash: await sha(token) }).select("id").single();
    if (error) { console.error(error); return { ok: false as const, error: "บันทึกไม่สำเร็จ" }; }
    return { ok: true as const, id: row.id as number, token };
  });

/** Only the device holding the token returned on add can delete that holiday. */
export const deleteHoliday = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.number().int().positive(), token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("holidays").select("delete_hash").eq("id", data.id).maybeSingle();
    if (!row || row.delete_hash !== (await sha(data.token))) return { ok: false };
    await supabaseAdmin.from("holidays").delete().eq("id", data.id);
    return { ok: true };
  });
