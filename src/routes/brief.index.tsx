import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { supabase } from "@/integrations/supabase/client";
import { thaiDate } from "@/lib/signals";
import { z } from "zod";

const PAGE_SIZE = 20;
const archiveQuery = (page: number) => queryOptions({
  queryKey: ["brief-archive", page],
  queryFn: async () => {
    const { data, error, count } = await supabase.from("daily_briefs").select("brief_date,body,published_at,items", { count: "exact" }).order("brief_date", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (error) throw error;
    return { rows: data ?? [], count: count ?? 0 };
  },
});

export const Route = createFileRoute("/brief/")({
  staticData: { sitemap: true },
  validateSearch: z.object({ page: z.coerce.number().int().min(1).max(10000).catch(1).optional() }),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(archiveQuery(deps.page)),
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
  const { page: requestedPage } = Route.useSearch();
  const page = requestedPage ?? 1;
  const { data } = useSuspenseQuery(archiveQuery(page));
  const totalPages = Math.ceil(data.count / PAGE_SIZE);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2);
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="border-y-4 border-double border-foreground py-4 text-center font-display text-4xl">Daily Brief</h1>
        <p className="mt-2 text-muted-foreground">เผยแพร่ทุกเช้า 06:00 น. จากข้อมูลจริงของหน่วยงานทางการเท่านั้น</p>
        <p className="mt-5 text-sm text-muted-foreground">{data.count} ฉบับ · หน้า {Math.min(page, totalPages || 1)} จาก {totalPages || 1}</p>
        <ul className="mt-8 divide-y divide-border border-y-2 border-foreground">
          {data.rows.map((b) => (
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
        {!data.rows.length && <p className="py-8 text-center text-muted-foreground">{page > totalPages && totalPages > 0 ? "ไม่มีฉบับในหน้านี้" : "ยังไม่มี Daily Brief"}</p>}
        {totalPages > 1 && <nav aria-label="หน้าคลัง Daily Brief" className="mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-foreground pt-5 text-sm">
          {page > 1 && <Link to="/brief" search={{ page: page - 1 }} className="border border-border px-3 py-2 hover:bg-card">← ก่อนหน้า</Link>}
          {pages.map((n, i) => <span key={n} className="contents">
            {i > 0 && n - pages[i - 1] > 1 && <span aria-hidden="true" className="px-1 text-muted-foreground">…</span>}
            <Link to="/brief" search={{ page: n }} aria-current={n === page ? "page" : undefined} className={`min-w-10 border px-3 py-2 text-center ${n === page ? "border-foreground bg-foreground text-background" : "border-border hover:bg-card"}`}>{n}</Link>
          </span>)}
          {page < totalPages && <Link to="/brief" search={{ page: page + 1 }} className="border border-border px-3 py-2 hover:bg-card">ถัดไป →</Link>}
        </nav>}
      </main>
    </div>
  );
}
