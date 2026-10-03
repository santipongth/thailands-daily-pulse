// "ข่าวทั่วไปล่าสุด" on Today: latest general-news RSS items (context only, never signals).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const t = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function GeneralNews({ limit = 8 }: { limit?: number }) {
  const { data } = useQuery({
    queryKey: ["general-news", limit],
    queryFn: async () => {
      const [n, r] = await Promise.all([
        supabase.from("news_items").select("id,source,title,link,published_at").eq("kind", "general").order("published_at", { ascending: false }).limit(limit),
        supabase.from("source_runs").select("ran_at,ok").eq("source", "ข่าวทั่วไป RSS").maybeSingle(),
      ]);
      return { items: n.data ?? [], run: r.data };
    },
    refetchInterval: 10 * 60e3,
  });
  return (
    <section className="border-t border-editorial-ink pt-5">
      <div className="flex flex-wrap items-baseline gap-3 border-b border-editorial-rule pb-3">
        <h2 className="font-editorial text-2xl leading-snug text-editorial-red">ข่าวทั่วไปล่าสุด</h2>
        <span className="text-xs text-muted-foreground">อัปเดต {data?.run ? t(data.run.ran_at) : "—"} · บริบทเท่านั้น ไม่ใช่สัญญาณ</span>
      </div>
      {!data?.items.length ? <p className="mt-3 text-sm text-muted-foreground">ยังไม่มีข่าวในรอบล่าสุด</p> : (
        <ul className="divide-y divide-editorial-rule">
          {data.items.map((n) => (
            <li key={n.id} className="py-3">
              <a href={n.link} target="_blank" rel="noopener" className="font-semibold leading-snug hover:underline">{n.title}</a>
              <div className="mt-0.5 text-xs text-muted-foreground">{n.source} · {t(n.published_at)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
