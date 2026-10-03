import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { DataBadge, Sparkline } from "@/components/signals-ui";
import { familyQuery, fmt, thaiDate } from "@/lib/signals";

export const Route = createFileRoute("/signals/$family")({
  staticData: { sitemap: false },
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(familyQuery(params.family));
    if (!d) throw notFound();
    return { id: params.family, name: d.family.name_th, desc: d.family.description };
  },
  head: ({ loaderData }) => {
    const isOil = loaderData?.id === "oil";
    const title = isOil
      ? "ราคาน้ำมันวันนี้ — อัปเดตทุกวัน | Thailand Daily Signals"
      : `${loaderData?.name ?? "กลุ่มข้อมูล"} — Thailand Daily Signals`;
    const desc = isOil
      ? "ราคาน้ำมันวันนี้จาก PTT และบางจาก เทียบกับเมื่อวาน แจ้งเฉพาะเมื่อราคาเปลี่ยนจริง พร้อมผลกระทบต่อค่าใช้จ่ายครัวเรือน"
      : `ประวัติและสัญญาณการเปลี่ยนแปลง: ${loaderData?.desc ?? ""}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: FamilyPage,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
  notFoundComponent: () => (
    <div className="p-8">ไม่พบกลุ่มข้อมูลนี้ <Link to="/" className="underline">กลับหน้าแรก</Link></div>
  ),
});

function FamilyPage() {
  const { family: id } = Route.useParams();
  const { data } = useSuspenseQuery(familyQuery(id));
  if (!data) return null;
  const { family, metrics, obs, signals, news } = data;
  const met = new Map(metrics.map((m) => [m.id, m]));
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="page-shell">
        <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm hover:underline">← กลับหน้าวันนี้</Link>
        <h1 className="mt-4 font-editorial text-4xl sm:text-5xl">{family.emoji} {family.name_th}</h1>
        <p className="mt-2 text-muted-foreground">{family.description} · อัปเดต{family.cadence}</p>
        <p className="mt-1 flex items-center gap-2 text-sm">
          ที่มา: {family.source_url ? <a href={family.source_url} target="_blank" rel="noreferrer" className="underline">{family.source_name}</a> : family.source_name}
          <DataBadge demo={!family.is_live} />
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {metrics.map((m) => {
            const h = obs.filter((o) => o.metric_id === m.id);
            const last = h.at(-1);
            return (
              <div key={m.id} className="border-t-2 border-editorial-ink bg-editorial-surface p-4 shadow-[var(--shadow-editorial)]">
                <div className="text-sm text-muted-foreground">{m.name_th}</div>
                <div className="flex items-end justify-between">
                  <div className="font-editorial text-3xl tabular-nums">
                    {last ? fmt(last.value, m.decimals) : "—"} <span className="text-base text-muted-foreground">{m.unit}</span>
                  </div>
                  {m.kind !== "release" && <Sparkline values={h.map((o) => Number(o.value))} />}
                </div>
                <div className="text-xs text-muted-foreground">{last ? `ข้อมูล ณ ${thaiDate(last.observed_on)}` : ""}</div>
              </div>
            );
          })}
        </section>

        {news.length > 0 && (
          <section className="mt-12">
            <h2 className="section-heading text-2xl">ข่าวที่เกี่ยวข้องล่าสุด</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {news.map((n) => (
                <li key={n.id}>
                  <a href={n.link} target="_blank" rel="noreferrer" className="underline">{n.title}</a>
                  <span className="block text-xs text-muted-foreground">{n.agency ? `${n.agency} · ` : ""}{n.source} · {new Date(n.published_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium" })}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-12">
          <h2 className="section-heading text-2xl">สัญญาณที่เคยเกิด</h2>
          {signals.length === 0 ? (
            <p className="mt-3 text-muted-foreground">ยังไม่มีการเปลี่ยนแปลงที่เกินเกณฑ์</p>
          ) : (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {signals.map((s) => (
                <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <span className="w-32 text-sm tabular-nums text-muted-foreground">{thaiDate(s.signal_date, { day: "numeric", month: "short", year: "2-digit" })}</span>
                  <span className="flex-1">{s.title}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {s.change_pct != null && met.get(s.metric_id)?.kind !== "release" ? `${s.change_pct > 0 ? "+" : ""}${s.change_pct.toFixed(1)}%` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        </div>
      </main>
    </div>
  );
}
