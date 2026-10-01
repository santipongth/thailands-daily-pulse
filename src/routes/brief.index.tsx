import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { thaiDate } from "@/lib/signals";

const archiveQuery = queryOptions({
  queryKey: ["brief-archive"],
  queryFn: async () => {
    const { data, error } = await supabase.from("daily_briefs").select("brief_date,body,published_at,items").order("brief_date", { ascending: false }).limit(60);
    if (error) throw error;
    return data ?? [];
  },
});

export const Route = createFileRoute("/brief/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(archiveQuery),
  head: () => ({
    meta: [
      { title: "คลัง Daily Brief — Thailand Daily Signals" },
      { name: "description", content: "Daily Brief ทุกเช้า 06:00 ย้อนหลัง: อะไรเปลี่ยน สำคัญแค่ไหน กระทบครัวเรือนเท่าไหร่ และควรทำอะไร" },
      { property: "og:title", content: "คลัง Daily Brief — Thailand Daily Signals" },
      { property: "og:description", content: "สรุปสัญญาณประจำวันของประเทศไทย ทุกเช้า 06:00" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Archive,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
});

function Archive() {
  const { data } = useSuspenseQuery(archiveQuery);
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-4xl">Daily Brief</h1>
        <p className="mt-2 text-muted-foreground">เผยแพร่ทุกเช้า 06:00 น. จากข้อมูลจริงของหน่วยงานทางการเท่านั้น</p>
        <ul className="mt-8 divide-y divide-border border-y-2 border-foreground">
          {data.map((b) => (
            <li key={b.brief_date} className="py-4">
              <Link to="/brief/$date" params={{ date: b.brief_date }} className="group block">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-xl group-hover:underline">{thaiDate(b.brief_date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                  <span className="text-xs text-muted-foreground">{b.published_at ? "ฉบับ 06:00" : "ฉบับระหว่างวัน"} · {Array.isArray(b.items) ? b.items.length : 0} เรื่อง</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{b.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
