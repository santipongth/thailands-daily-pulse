import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SEEN_BRIEF = "tds-brief-seen";
const SEEN_SIGS = "tds-sigs-seen";

function bkk() {
  const d = new Date(Date.now() + 7 * 3600e3);
  return { date: d.toISOString().slice(0, 10), mins: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
function notify(body: string, href: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const n = new Notification("Thailand Daily Signals", { body });
  n.onclick = () => { window.focus(); window.location.href = href; };
}

/** Per-device: banner when today's Daily Brief is published (after 06:00) and alerts when today's real signal set changes. */
export function BriefAlert() {
  const [brief, setBrief] = useState<{ date: string; n: number } | null>(null);

  useEffect(() => {
    const tick = async () => {
      const { date, mins } = bkk();
      // Keyed on event_id#version: a re-fetch with no change keeps the same version, so no repeat alert.
      const { data: evs } = await supabase.from("signal_events").select("event_id,current_version,status").eq("signal_date", date).eq("is_demo", false).neq("status", "withdrawn");
      const ids = (evs ?? []).map((e) => `${e.event_id}#${e.current_version}`).sort();
      const key = `${date}:${ids.join(",")}`;
      const prev = localStorage.getItem(SEEN_SIGS);
      if (prev === null || !prev.startsWith(date)) {
        localStorage.setItem(SEEN_SIGS, key);
      } else if (prev !== key) {
        const old = new Set(prev.slice(11).split(",").filter(Boolean));
        const oldEvents = new Set([...old].map((k) => k.split("#")[0]));
        const added = ids.filter((i) => !oldEvents.has(i.split("#")[0])).length;
        localStorage.setItem(SEEN_SIGS, key);
        if (added > 0) {
          const text = `มีสัญญาณใหม่จากข้อมูลจริง ${added} รายการวันนี้`;
          toast(text, { action: { label: "ดูวันนี้", onClick: () => { window.location.href = `/day/${date}`; } }, duration: 15000 });
          notify(text, `/day/${date}`);
        }
      }
      if (mins >= 360 && localStorage.getItem(SEEN_BRIEF) !== date) {
        const { data: b } = await supabase.from("daily_briefs").select("brief_date,published_at").eq("brief_date", date).maybeSingle();
        if (b?.published_at) {
          setBrief({ date, n: ids.length });
          if (sessionStorage.getItem("tds-brief-notified") !== date) {
            sessionStorage.setItem("tds-brief-notified", date);
            notify(`Daily Brief วันนี้พร้อมแล้ว — ${ids.length} สัญญาณเปลี่ยนจริง`, `/brief/${date}`);
          }
        }
      }
    };
    tick();
    const id = setInterval(tick, 60e3);
    return () => clearInterval(id);
  }, []);

  if (!brief) return null;
  const close = () => { localStorage.setItem(SEEN_BRIEF, brief.date); setBrief(null); };
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-foreground bg-background px-4 py-3">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 text-sm">
        <strong className="font-display text-lg">Daily Brief วันนี้พร้อมแล้ว</strong>
        <span>{brief.n > 0 ? `${brief.n} สัญญาณเปลี่ยนจริง` : "วันนี้ไม่มีสัญญาณเปลี่ยนจากข้อมูลจริง"}</span>
        <Link to="/brief/$date" params={{ date: brief.date }} onClick={close} className="ml-auto border-2 border-foreground bg-foreground px-3 py-1 font-semibold text-background">เปิด Daily Brief</Link>
        <button onClick={close} aria-label="ปิด" className="px-2">×</button>
      </div>
    </div>
  );
}
