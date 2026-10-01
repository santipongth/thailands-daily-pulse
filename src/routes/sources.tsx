import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Masthead } from "@/components/masthead";
import { DataBadge } from "@/components/signals-ui";
import { sourcesQuery } from "@/lib/signals";

export const Route = createFileRoute("/sources")({
  loader: ({ context }) => context.queryClient.ensureQueryData(sourcesQuery),
  head: () => ({
    meta: [
      { title: "แหล่งข้อมูล — Thailand Daily Signals" },
      { name: "description", content: "รายชื่อแหล่งข้อมูลราชการและสาธารณะที่ใช้ตรวจจับสัญญาณการเปลี่ยนแปลงในประเทศไทย" },
      { property: "og:title", content: "แหล่งข้อมูล — Thailand Daily Signals" },
      { property: "og:description", content: "แหล่งข้อมูลราชการและสาธารณะ พร้อมสถานะการเชื่อมต่อ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sources,
  errorComponent: ({ error }) => <div role="alert" className="p-8">โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-8">ไม่พบข้อมูล</div>,
});

function Sources() {
  const { data } = useSuspenseQuery(sourcesQuery);
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display text-4xl">แหล่งข้อมูล</h1>
        <p className="mt-2 text-muted-foreground">
          ดึงข้อมูลจริงล่าสุดเมื่อ{" "}
          {data.lastLive ? new Date(data.lastLive).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "—"} · อัปเดตอัตโนมัติทุกราว 3 ชั่วโมงเมื่อมีผู้เปิดหน้าแรก
        </p>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-foreground text-left">
              <th className="py-2">กลุ่ม</th><th>แหล่งที่มา</th><th>ความถี่</th><th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {data.families.map((f) => (
              <tr key={f.id} className="border-b border-border align-top">
                <td className="py-2"><Link to="/signals/$family" params={{ family: f.id }} className="hover:underline">{f.emoji} {f.name_th}</Link></td>
                <td className="py-2 pr-2">{f.source_url ? <a className="underline" href={f.source_url} target="_blank" rel="noreferrer">{f.source_name}</a> : f.source_name}</td>
                <td className="py-2 pr-2">{f.cadence}</td>
                <td className="py-2"><DataBadge demo={!f.is_live} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
