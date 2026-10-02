import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Cut = { date: string; metric_id: string; title: string; received_at: string | null; reason: string };
export type Window = { from: string; to: string; first_received: string | null; last_received: string | null; received_inside: number; included: number; excluded: Cut[]; unverifiable: string[] };

export const hm = (s: string | null) => (s ? new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

/** Cut events (received after the 05:45 cutoff) from the last 30 brief editions. */
export function useCutEvents() {
  return useQuery({
    queryKey: ["cut-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("daily_briefs").select("brief_date,data_window").not("data_window", "is", null).order("brief_date", { ascending: false }).limit(30);
      if (error) throw error;
      return (data ?? []).map((b: any) => ({ date: b.brief_date as string, w: b.data_window as Window }));
    },
  });
}

export function CutEventsList() {
  const { data } = useCutEvents();
  if (!data?.length) return null;
  return (
    <section className="mt-8 border-t-2 border-foreground pt-4">
      <h2 className="font-display text-2xl">ตัดออกจาก Daily Brief</h2>
      <p className="text-sm text-muted-foreground">นับเฉพาะข้อมูลที่ได้รับ 00:00–05:45 น. ของวันนั้น ที่ได้รับหลังจากนั้นจะไม่อยู่ในฉบับ 06:00 แต่ไปอยู่ในอัปเดตด้านล่าง Brief</p>
      <div className="mt-3 space-y-3">
        {data.map(({ date, w }) => (
          <div key={date} className="text-sm">
            <p className="font-semibold">
              <Link to="/brief/$date" params={{ date }} className="underline">Brief {date}</Link> — เก็บจริง {hm(w.first_received)} ถึง {hm(w.last_received)} · ใช้ {w.included} · ตัด {w.excluded?.length ?? 0}
            </p>
            {(w.excluded ?? []).length === 0 ? <p className="text-muted-foreground">ไม่มีเหตุการณ์ถูกตัด</p> : (
              <ul className="ml-4 list-disc">
                {w.excluded.map((e) => (
                  <li key={e.metric_id}>
                    <Link to="/events/$id" params={{ id: `${e.metric_id}:${date}` }} className="underline">{e.title}</Link> — {e.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
