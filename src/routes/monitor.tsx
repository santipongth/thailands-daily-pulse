import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { useUnseen } from "@/hooks/use-unseen";
import { bkkToday, shiftDate, thaiDate } from "@/lib/signals";

const monitorQuery = queryOptions({
  queryKey: ["monitor"],
  queryFn: async () => {
    const since = shiftDate(bkkToday(), -13);
    const [h, c, r] = await Promise.all([
      supabase.from("source_run_history").select("source,ran_at,ok,rows,error").gte("ran_at", `${since}T00:00:00+07:00`).order("ran_at", { ascending: false }).limit(1000),
      supabase.from("gov_changes").select("id,agency,change_date,kind,reason_th,pct,gov_datasets(url)").gte("change_date", since).order("id", { ascending: false }).limit(300),
      supabase.from("source_runs").select("source,ok,ran_at,error"),
    ]);
    return { history: h.data ?? [], changes: (c.data ?? []) as any[], latest: r.data ?? [], since };
  },
});

export const Route = createFileRoute("/monitor")({
  loader: ({ context }) => context.queryClient.ensureQueryData(monitorQuery),
  head: () => ({
    meta: [
      { title: "ติดตามการดึงข้อมูลรัฐ — Thailand Daily Signals" },
      { name: "description", content: "ประวัติการดึงข้อมูลจากทุกแหล่ง และฟีดการเปลี่ยนแปลงข้อมูลรัฐรายวัน" },
      { property: "og:title", content: "ติดตามการดึงข้อมูลรัฐ — Thailand Daily Signals" },
      { property: "og:description", content: "ดูว่าแหล่งไหนดึงได้ ล้มเหลว และข้อมูลอะไรเปลี่ยนในแต่ละวัน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Monitor,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
});

const KIND: Record<string, string> = { new: "ชุดใหม่", rows: "แถวเปลี่ยน", value: "ตัวเลขเปลี่ยน", updated: "อัปโหลดใหม่" };

function Monitor() {
  const { data } = useSuspenseQuery(monitorQuery);
  const { lastSeen, markSeen } = useUnseen();
  useEffect(() => {
    const t = setTimeout(markSeen, 1500);
    return () => clearTimeout(t);
  }, [data.changes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const days: string[] = [];
  for (let i = 0; i < 14; i++) days.push(shiftDate(bkkToday(), -i));
  const dayOf = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(0, 10);
  const sources = [...new Set([...data.latest.map((r) => r.source), ...data.history.map((h) => h.source)])].sort();
  const failed = data.latest.filter((r) => !r.ok);

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-4xl">ติดตามการดึงข้อมูลรัฐ</h1>
        <p className="mt-2 text-muted-foreground">
          {data.latest.length} แหล่ง · ล้มเหลวรอบล่าสุด {failed.length} แหล่ง{" "}
          {failed.length > 0 && <Link to="/failures" className="underline">ดูเหตุผลที่ดึงไม่ได้ →</Link>}
        </p>

        <section className="mt-8">
          <h2 className="border-b-2 border-foreground pb-1 font-display text-2xl">ข้อมูลที่เปลี่ยนในแต่ละวัน</h2>
          {days.map((d) => {
            const list = data.changes.filter((c) => c.change_date === d);
            if (!list.length) return (
              <div key={d} className="grid grid-cols-[7rem_1fr] gap-4 border-b border-border py-2 text-sm"><span className="text-muted-foreground">{thaiDate(d, { day: "numeric", month: "short" })}</span><span className="text-muted-foreground">ไม่มีการเปลี่ยนแปลง</span></div>
            );
            return (
              <div key={d} className="grid grid-cols-[7rem_1fr] gap-4 border-b border-border py-3 text-sm">
                <span className="text-muted-foreground">{thaiDate(d, { day: "numeric", month: "short" })}</span>
                <ul className="space-y-1.5">
                  {list.map((c) => (
                    <li key={c.id}>
                      {c.id > lastSeen && <span className="mr-2 bg-up px-1.5 text-xs text-background">ใหม่</span>}
                      <span className="mr-2 text-xs uppercase text-muted-foreground">{KIND[c.kind] ?? c.kind}</span>
                      <a href={c.gov_datasets?.url} target="_blank" rel="noreferrer" className="hover:underline">{c.reason_th}</a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="mt-10 overflow-x-auto">
          <h2 className="border-b-2 border-foreground pb-1 font-display text-2xl">ผลการดึงรายวันของแต่ละแหล่ง (14 วัน)</h2>
          <table className="mt-3 text-xs">
            <thead>
              <tr><th className="sticky left-0 bg-background pr-3 text-left">แหล่ง</th>{[...days].reverse().map((d) => <th key={d} className="px-1 font-normal text-muted-foreground">{d.slice(8)}</th>)}</tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s} className="border-b border-border">
                  <td className="sticky left-0 max-w-[16rem] truncate bg-background py-1 pr-3">{s}</td>
                  {[...days].reverse().map((d) => {
                    const runs = data.history.filter((h) => h.source === s && dayOf(h.ran_at) === d);
                    const ok = runs.filter((r) => r.ok).length;
                    const title = runs.length ? `${ok}/${runs.length} สำเร็จ${runs.find((r) => !r.ok)?.error ? ` · ${runs.find((r) => !r.ok)!.error}` : ""}` : "ไม่ได้ดึง";
                    return (
                      <td key={d} className="px-1 text-center" title={title}>
                        <span className={`inline-block h-3 w-3 ${!runs.length ? "bg-muted" : ok === runs.length ? "bg-primary" : ok ? "bg-up" : "bg-destructive"}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">■ สำเร็จทุกครั้ง · ■ สำเร็จบางครั้ง · ■ ล้มเหลว · ■ ไม่ได้ดึง — ชี้ที่ช่องเพื่อดูรายละเอียด (เริ่มบันทึกประวัติตั้งแต่วันนี้)</p>
        </section>
      </main>
    </div>
  );
}
