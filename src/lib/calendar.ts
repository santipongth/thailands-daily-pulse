import { supabase } from "@/integrations/supabase/client";

export const upcomingQuery = (from: string) => ({
  queryKey: ["calendar", from],
  queryFn: async () => {
    const [h, t, u] = await Promise.all([
      supabase.from("holidays").select("id,holiday_date,name,kind,note,created_at,is_gov,is_bank,source_url").gte("holiday_date", from).order("holiday_date").limit(100),
      supabase.from("tax_deadlines").select("id,due_date,channel,items,fetched_at").gte("due_date", from).order("due_date").limit(50),
      supabase.from("app_settings").select("value,updated_at").eq("key", "holiday_url").maybeSingle(),
    ]);
    return { holidays: h.data ?? [], tax: t.data ?? [], holidayUrl: u.data?.value ?? null, holidayUrlAt: u.data?.updated_at ?? null };
  },
});

