import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSourcePrefs } from "@/hooks/use-source-prefs";
import { SOURCES } from "@/lib/sources";

type Change = { id: number; agency: string; reason_th: string; dataset_id: string; gov_datasets: { url: string } | null };
const NOTIFIED = "tds-notified";

/** Banner (and optional browser notification) when a watched agency's official data changed today. */
export function GovAlert({ date }: { date: string }) {
  const [prefs] = useSourcePrefs();
  const [changes, setChanges] = useState<Change[]>([]);
  const [perm, setPerm] = useState<string>("default");
  useEffect(() => {
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
    supabase.from("gov_changes").select("id,agency,reason_th,dataset_id,gov_datasets(url)").eq("change_date", date).order("id").then(({ data }) => {
      setChanges((data ?? []) as unknown as Change[]);
    });
  }, [date]);
  const watched = new Set(SOURCES.filter((s) => s.kind === "catalog" && !prefs.disabled.includes(s.source)).map((s) => s.agency));
  const mine = changes.filter((c) => watched.has(c.agency));

  useEffect(() => {
    if (!mine.length || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const key = `${date}:${mine.length}`;
    if (localStorage.getItem(NOTIFIED) === key) return;
    localStorage.setItem(NOTIFIED, key);
    const n = new Notification("ข้อมูลรัฐที่คุณติดตามเปลี่ยนวันนี้", { body: mine.slice(0, 3).map((c) => c.reason_th).join("\n") });
    n.onclick = () => window.focus();
  }, [mine.length, date]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mine.length) return null;
  return (
    <section role="status" className="mt-6 border-2 border-up p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-lg">🔔 หน่วยงานที่คุณติดตามมีข้อมูลเปลี่ยนวันนี้ ({mine.length} ชุด)</p>
        <div className="flex gap-3 text-xs">
          {perm === "default" && (
            <button type="button" className="underline" onClick={() => Notification.requestPermission().then(setPerm)}>เปิดการแจ้งเตือนในเบราว์เซอร์</button>
          )}
          <Link to="/data" className="underline">ดูข้อมูลที่ดึงได้ทั้งหมด</Link>
        </div>
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {mine.slice(0, 5).map((c) => (
          <li key={c.id}>
            <a href={c.gov_datasets?.url} target="_blank" rel="noreferrer" className="hover:underline">{c.reason_th}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
