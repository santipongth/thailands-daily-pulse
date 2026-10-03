import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { registryQuery, bkkToday } from "@/lib/registry";

const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400e3);

/** Admin-only: sources whose newest real data is older than their registry allowance. */
export function StaleSourcesAlert() {
  const { data } = useQuery(registryQuery);
  if (!data) return null;
  const today = bkkToday();
  const allow = new Map(data.registry.map((r) => [r.source, r.stale_after_days]));
  const rows = data.completeness
    .map((c) => ({ ...c, age: c.data_date ? days(c.data_date, today) : null, allow: allow.get(c.source) ?? 1 }))
    .filter((c) => c.age === null || c.age > c.allow)
    .sort((a, b) => (b.age ?? 1e9) - (a.age ?? 1e9));
  return (
    <section className="mt-6 border-t-2 border-editorial-ink pt-4" aria-live="polite">
      <h2 className="font-editorial text-2xl">แหล่งข้อมูลขาดข้อมูลหลายวัน</h2>
      {!rows.length ? (
        <p className="mt-2 text-sm text-primary">ครบทุกแหล่ง — ไม่มีแหล่งที่ข้อมูลเก่าเกินเกณฑ์</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.source} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
              <span className="font-semibold text-destructive">{r.source}</span>
              <span>ข้อมูลล่าสุด {r.data_date ?? "ไม่เคยมี"}{r.age !== null && ` · ขาดมา ${r.age} วัน (เกณฑ์ ${r.allow} วัน)`}</span>
              <span className="basis-full text-xs text-muted-foreground">{r.reason}</span>
              <span className="basis-full text-xs"><Link to="/settings" className="underline">ตั้งค่าแหล่งนี้</Link> · <Link to="/tracking" className="underline">ดูการเก็บวันนี้</Link></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
