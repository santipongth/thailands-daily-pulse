import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SocialPost = { post_id: string; posted_at: string; received_at: string; text: string; url: string; area: string | null; summary: string | null };

const t = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Bangkok-relevant FM91 posts. With from/to: posts received inside that window (brief), plus later ones split out. */
export function SocialFeed({ from, to, limit = 8 }: { from?: string; to?: string | null; limit?: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["social-feed", from ?? "", to ?? "", limit],
    queryFn: async () => {
      let q = supabase.from("social_posts").select("post_id,posted_at,received_at,text,url,area,summary").eq("is_bkk", true).order("posted_at", { ascending: false }).limit(from ? 60 : limit);
      if (from) q = q.gte("posted_at", from);
      const [{ data, error }, { data: run }] = await Promise.all([q, supabase.from("source_runs").select("ran_at,ok,error").eq("source", "FM91 Trafficpro (X)").maybeSingle()]);
      if (error) throw new Error(error.message);
      return { posts: (data ?? []) as SocialPost[], run };
    },
    staleTime: 5 * 60e3,
  });
  const posts = data?.posts ?? [];
  const inWin = to ? posts.filter((p) => p.received_at <= to) : posts;
  const late = to ? posts.filter((p) => p.received_at > to) : [];

  return (
    <section className="rounded-lg border border-border bg-card p-5" aria-labelledby="social-h">
      <h2 id="social-h" className="text-lg font-semibold">ความเคลื่อนไหวจาก Social Media</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        โพสต์จาก FM91 Trafficpro (X) ที่ AI คัดว่าเกี่ยวกับกรุงเทพฯ และปริมณฑล · จาก Social Media — ยังไม่ยืนยันจากหน่วยงานรัฐ ไม่นับเป็นสัญญาณ
      </p>
      {isLoading ? <p className="mt-4 text-sm text-muted-foreground">กำลังโหลด…</p>
        : isError ? <p className="mt-4 text-sm text-muted-foreground">อ่านโพสต์ไม่ได้</p>
        : inWin.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            ไม่มีโพสต์ที่เกี่ยวกับกรุงเทพฯ {to ? "ก่อนเวลาตัด" : "ล่าสุด"}
            {data?.run && !data.run.ok ? ` — ดึงล่าสุด ${t(data.run.ran_at)} ไม่สำเร็จ: ${data.run.error}` : ""}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {inWin.slice(0, limit).map((p) => <Item key={p.post_id} p={p} />)}
          </ul>
        )}
      {late.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground">มาหลังเวลาตัด ({late.length}) — ไม่นับใน Brief</p>
          <ul className="divide-y divide-border">{late.slice(0, 5).map((p) => <Item key={p.post_id} p={p} />)}</ul>
        </div>
      )}
    </section>
  );
}

function Item({ p }: { p: SocialPost }) {
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{t(p.posted_at)} น.</span>
        {p.area && <span className="rounded bg-muted px-1.5 py-0.5">{p.area}</span>}
        <a href={p.url} target="_blank" rel="noreferrer" className="underline hover:text-foreground">ดูโพสต์</a>
      </div>
      <p className="mt-1">{p.summary ?? p.text}</p>
    </li>
  );
}
