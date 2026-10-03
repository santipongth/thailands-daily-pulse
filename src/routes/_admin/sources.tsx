import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { registryQuery } from "@/lib/registry";
import { STATUS_TH } from "@/lib/completeness";

export const Route = createFileRoute("/_admin/sources")({
  staticData: { sitemap: false },
  loader: ({ context }) => context.queryClient.ensureQueryData(registryQuery),
  head: () => ({
    meta: [
      { title: "ทะเบียนแหล่งข้อมูล — Thailand Daily Signals" },
      { name: "description", content: "เจ้าของ ช่องทาง สิทธิ์ใช้ รอบอัปเดต หน่วย พื้นที่ และเกณฑ์ข้อมูลเก่าของทุกแหล่ง พร้อมสถานะความครบถ้วนวันนี้" },
      { property: "og:title", content: "ทะเบียนแหล่งข้อมูล — Thailand Daily Signals" },
      { property: "og:description", content: "ทุกแหล่งข้อมูลที่ใช้ตรวจจับสัญญาณ พร้อมสถานะ ครบ / เก่า / ตรวจสอบไม่ได้" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sources,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-8">ไม่พบข้อมูล</div>,
});

const dt = (s: string | null) => (s ? new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }) : "—");

function Sources() {
  const { data } = useSuspenseQuery(registryQuery);
  const byS = new Map(data.completeness.map((c) => [c.source, c]));
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="page-shell">
        <h1 className="font-editorial text-4xl sm:text-5xl">ทะเบียนแหล่งข้อมูล</h1>
        <p className="mt-2 text-muted-foreground">ทุกแหล่งมีเจ้าของ ช่องทาง สิทธิ์ใช้ รอบอัปเดต หน่วย พื้นที่ และเกณฑ์ "ข้อมูลเก่า" — แหล่งที่เก่าหรือตรวจสอบไม่ได้จะถูกแสดงตามนั้น ไม่ถูกนับว่า "ไม่เปลี่ยน"</p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead>
              <tr className="border-b-2 border-editorial-ink text-left align-bottom">
                <th className="py-2 pr-2">แหล่ง / เจ้าของ</th><th className="pr-2">ช่องทาง</th><th className="pr-2">สิทธิ์ใช้</th><th className="pr-2">รอบอัปเดต</th><th className="pr-2">หน่วย</th><th className="pr-2">พื้นที่</th><th className="pr-2">ถือว่าเก่าเมื่อ</th><th>สถานะวันนี้</th>
              </tr>
            </thead>
            <tbody>
              {data.registry.map((r) => {
                const c = byS.get(r.source);
                return (
                  <tr key={r.source} className="border-b border-border align-top">
                    <td className="py-2 pr-2"><div className="font-semibold">{r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="underline">{r.source}</a> : r.source}</div><div className="text-xs text-muted-foreground">{r.owner}</div></td>
                    <td className="pr-2">{r.channel}</td>
                    <td className="pr-2 text-xs">{r.licence}</td>
                    <td className="pr-2">{r.cadence}</td>
                    <td className="pr-2">{r.unit}</td>
                    <td className="pr-2">{r.area}</td>
                    <td className="pr-2">เกิน {r.stale_after_days} วัน</td>
                    <td>
                      {c && <span className={c.status === "ok" ? "font-semibold text-primary" : "font-semibold text-destructive"}>{STATUS_TH[c.status]}</span>}
                      {c && <div className="text-xs text-muted-foreground">ข้อมูลวันที่ {c.data_date ?? "—"} · ได้รับ {dt(c.last_ok_at)}<br />{c.reason}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
