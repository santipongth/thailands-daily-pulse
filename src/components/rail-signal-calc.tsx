// Fetch-log box: how today's train signal was calculated per line (arrival window, counted vs not counted + reasons).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bkkDate, incidentPosts } from "@/lib/rail";

const t = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function RailSignalCalc() {
  const today = bkkDate(new Date().toISOString());
  const { data } = useQuery({
    queryKey: ["rail-calc", today],
    queryFn: async () => {
      const since = new Date(Date.parse(today + "T00:00:00+07:00") - 86400e3).toISOString();
      const [r, p] = await Promise.all([
        supabase.from("source_runs").select("ran_at,sample").eq("source", "รถไฟฟ้า BTS/MRT (X)").maybeSingle(),
        supabase.from("social_posts").select("source,posted_at,received_at,text,url,rail_status,rail_reason,rail_day").in("source", ["BTS (X)", "MRT (X)"]).gte("received_at", since).order("posted_at", { ascending: false }),
      ]);
      return { run: r.data, posts: p.data ?? [] };
    },
  });
  const posts = data?.posts ?? [];
  return (
    <section className="border border-border p-3 text-sm">
      <h3 className="font-display text-lg">การคำนวณสัญญาณรถไฟฟ้า ({today})</h3>
      <p className="text-xs text-muted-foreground">นับเหตุล่าช้า/ขัดข้อง/หยุดให้บริการตามวันที่ได้รับเมื่อประกาศข้ามวัน · โพสต์ติดตามจากสายเดียวกันใน 2 ชั่วโมงนับเป็นเหตุเดียว · 1 = น่าจับตา, 3+ = สำคัญมาก · รอบล่าสุด: {data?.run ? `${t(data.run.ran_at)} — ${data.run.sample ?? ""}` : "—"}</p>
      <table className="mt-2 w-full text-xs"><thead><tr className="text-left"><th>สาย</th><th>อ่านแล้ว</th><th>นับวันนี้</th><th>ไม่นับ</th><th>ผล</th></tr></thead><tbody>
        {["BTS", "MRT"].map((l) => { const mine = posts.filter((p) => p.source === `${l} (X)`); const n = incidentPosts(mine.filter((p) => p.rail_status === "counted" && p.rail_day === today)).length;
          return <tr key={l}><td>{l}</td><td>{mine.length}</td><td>{n}</td><td>{mine.filter((p) => p.rail_status && p.rail_status !== "counted").length}</td><td>{n >= 3 ? "สำคัญมาก" : n >= 1 ? "น่าจับตา" : "ไม่มีสัญญาณ"}</td></tr>; })}
      </tbody></table>
      <ul className="mt-2 space-y-1 text-xs">{posts.map((p) => (
        <li key={p.url}><b>{p.source.replace(" (X)", "")}</b> ประกาศ {t(p.posted_at)} · ได้รับ {t(p.received_at)} · {p.rail_status ?? "ไม่มีสถานะ"}{p.rail_day ? ` (${p.rail_day})` : ""} — {p.rail_reason ?? ""} <a href={p.url} target="_blank" rel="noreferrer" className="underline">{p.text.slice(0, 60)}</a></li>))}
        {!posts.length && <li className="text-muted-foreground">ไม่มีประกาศผิดปกติใน 24 ชั่วโมงล่าสุด</li>}</ul>
    </section>
  );
}
