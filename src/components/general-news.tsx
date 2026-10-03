// "ข่าวทั่วไปล่าสุด" on Today: latest general-news RSS items (context only, never signals).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TodayEmpty, TodayItem, TodayList, TodaySection, thTime } from "@/components/today-section";

export function GeneralNews({ limit = 8 }: { limit?: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["general-news", limit],
    queryFn: async () => {
      const [n, r] = await Promise.all([
        supabase.from("news_items").select("id,source,title,link,published_at").eq("kind", "general").order("published_at", { ascending: false }).limit(limit),
        supabase.from("source_runs").select("ran_at,ok").eq("source", "ข่าวทั่วไป RSS").maybeSingle(),
      ]);
      if (n.error) throw new Error(n.error.message);
      return { items: n.data ?? [], run: r.data };
    },
    refetchInterval: 10 * 60e3,
  });
  return (
    <TodaySection id="news-h" title="ข่าวทั่วไปล่าสุด" note={`หัวข้อข่าวจาก RSS สำนักข่าว · อัปเดต ${thTime(data?.run?.ran_at)} · เป็นบริบท ไม่นับเป็นสัญญาณ`}>
      {isLoading ? <TodayEmpty>กำลังโหลด…</TodayEmpty>
        : isError ? <TodayEmpty>อ่านข้อมูลไม่ได้</TodayEmpty>
        : !data?.items.length ? <TodayEmpty>ไม่มีข้อมูลล่าสุด</TodayEmpty> : (
          <TodayList>
            {data.items.map((n) => (
              <TodayItem key={n.id} label={n.source}
                meta={<><span>{thTime(n.published_at)}</span><a href={n.link} target="_blank" rel="noopener" className="underline hover:text-foreground">อ่านข่าวต้นทาง</a></>}>
                <p className="font-medium">{n.title}</p>
              </TodayItem>
            ))}
          </TodayList>
        )}
    </TodaySection>
  );
}
