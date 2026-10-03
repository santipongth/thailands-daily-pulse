import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { registryQuery } from "@/lib/registry";
import { STATUS_TH } from "@/lib/completeness";
import { AGENCIES, SOURCES } from "@/lib/sources";

export const Route = createFileRoute("/data-map")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "แผนผังข้อมูล — Thailand Daily Signals" },
      { name: "description", content: "แหล่งข้อมูลทุกตัวในเว็บ พร้อมวันที่อัปเดตล่าสุดและสถานะการดึงข้อมูล" },
      { property: "og:title", content: "แผนผังข้อมูล — Thailand Daily Signals" },
      { property: "og:description", content: "ดูว่าข้อมูลแต่ละอย่างมาจากไหน อัปเดตล่าสุดเมื่อไร และดึงได้หรือไม่" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(registryQuery),
  component: DataMap,
});

const dt = (s: string | null) => (s ? new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "—");
const tone = { ok: "text-primary", stale: "text-editorial-red", unverifiable: "text-destructive" } as const;

function DataMap() {
  const { data } = useSuspenseQuery(registryQuery);
  const comp = new Map(data.completeness.map((c) => [c.source, c]));
  const reg = new Map(data.registry.map((r) => [r.source, r]));
  const metrics = new Map(SOURCES.map((s) => [s.source, s.metrics.length]));
  const groups = [
    { label: "หน่วยงานรัฐ", items: AGENCIES.filter((a) => a.category === "government") },
    { label: "แหล่งอื่น", items: AGENCIES.filter((a) => a.category === "other") },
  ];
  const counts = { ok: 0, stale: 0, unverifiable: 0 };
  data.completeness.forEach((c) => counts[c.status]++);

  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="page-shell">
        <p className="text-sm font-semibold text-editorial-red">แผนผังข้อมูล</p>
        <h1 className="mt-2 font-editorial text-4xl sm:text-5xl">ข้อมูลในเว็บมาจากไหน</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">ทุกแหล่งข้อมูลที่เว็บใช้อยู่ พร้อมเวลาที่ได้ข้อมูลล่าสุดและสถานะ — แหล่งที่ดึงไม่ได้จะบอกเหตุผล ไม่ถือว่า "ไม่มีการเปลี่ยนแปลง"</p>

        <ol className="mt-8 grid gap-3 border-y-2 border-editorial-ink py-5 text-sm sm:grid-cols-4">
          {["แหล่งข้อมูล (หน่วยงาน/API)", "เก็บค่าและไฟล์หลักฐาน", "ตรวจเกณฑ์ → สัญญาณ", "Daily Brief 06:00"].map((s, i) => (
            <li key={s} className="flex items-center gap-2"><span className="font-editorial text-2xl text-editorial-red">{i + 1}</span><span>{s}</span>{i < 3 && <span aria-hidden className="ml-auto hidden text-muted-foreground sm:inline">→</span>}</li>
          ))}
        </ol>
        <p className="mt-3 text-sm">ครบ <b>{counts.ok}</b> · เก่า <b>{counts.stale}</b> · ตรวจสอบไม่ได้ <b>{counts.unverifiable}</b> จากทั้งหมด {data.completeness.length} แหล่ง</p>

        {groups.map((g) => (
          <section key={g.label} className="mt-10">
            <h2 className="border-t border-editorial-ink pt-4 font-editorial text-3xl text-editorial-red">{g.label}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {g.items.map((a) => (
                <article key={a.key} className="border-t-2 border-editorial-ink bg-editorial-surface p-4 shadow-[var(--shadow-editorial)]">
                  <h3 className="font-editorial text-xl"><Link to="/agencies/$agency" params={{ agency: a.key }} className="hover:underline">{a.label}</Link></h3>
                  <ul className="mt-3 space-y-3 text-sm">
                    {a.sources.map((s) => {
                      const c = comp.get(s), r = reg.get(s);
                      return (
                        <li key={s} className="border-t border-editorial-rule pt-2">
                          <div className="flex justify-between gap-2"><span className="font-semibold">{s}</span>{c && <span className={`shrink-0 font-semibold ${tone[c.status]}`}>{STATUS_TH[c.status]}</span>}</div>
                          <div className="text-xs text-muted-foreground">{r?.cadence ?? "—"} · {metrics.get(s) ?? 0} ตัวชี้วัด · ข้อมูลวันที่ {c?.data_date ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">อัปเดตล่าสุด {dt(c?.last_ok_at ?? null)}</div>
                          {c && c.status !== "ok" && <div className="mt-1 text-xs">{c.reason}</div>}
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ))}
        <p className="mt-10 text-sm"><Link to="/sources" className="underline">ดูทะเบียนแหล่งข้อมูลแบบละเอียด →</Link> · <Link to="/settings" className="underline">ตั้งค่าวิธีดึงข้อมูล →</Link></p>
      </main>
    </div>
  );
}
