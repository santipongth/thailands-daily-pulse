import { supabase } from "@/integrations/supabase/client";

export const upcomingQuery = (from: string) => ({
  queryKey: ["calendar", from],
  queryFn: async () => {
    const [h, t] = await Promise.all([
      supabase.from("holidays").select("id,holiday_date,name,kind,note,created_at").gte("holiday_date", from).order("holiday_date").limit(100),
      supabase.from("tax_deadlines").select("id,due_date,channel,items,fetched_at").gte("due_date", from).order("due_date").limit(50),
    ]);
    return { holidays: h.data ?? [], tax: t.data ?? [] };
  },
});

