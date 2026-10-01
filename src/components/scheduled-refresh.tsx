import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { retrySources } from "@/lib/signals.functions";
import { useSourcePrefs } from "@/hooks/use-source-prefs";
import { SOURCES } from "@/lib/sources";

const LAST = "tds-sched-last";
const RESULT = "tds-sched-result";

/** Bangkok "YYYY-MM-DD" and minutes-since-midnight now. */
function bkkNow() {
  const d = new Date(Date.now() + 7 * 3600e3);
  return { date: d.toISOString().slice(0, 10), mins: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
const toMins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Latest chosen time that has already passed today, or null. */
export function lastPassedSlot(times: string[]) {
  const { date, mins } = bkkNow();
  const passed = times.filter((t) => toMins(t) <= mins).sort();
  const t = passed.pop();
  return t ? { key: `${date} ${t}`, time: t, at: new Date(`${date}T${t}:00+07:00`) } : null;
}
export function nextSlot(times: string[]) {
  const { mins } = bkkNow();
  const sorted = [...times].sort();
  return sorted.find((t) => toMins(t) > mins) ?? (sorted[0] ? `${sorted[0]} (พรุ่งนี้)` : null);
}
export function readLastResult(): { key: string; text: string } | null {
  try { return JSON.parse(localStorage.getItem(RESULT) ?? "null"); } catch { return null; }
}

/** Runs the user's chosen update times while the site is open (or on the next visit) and reports the result. */
export function ScheduledRefresh() {
  const [prefs] = useSourcePrefs();
  const retry = retrySources;
  const qc = useQueryClient();

  useEffect(() => {
    if (!prefs.times.length) return;
    let busy = false;
    const tick = async () => {
      const slot = lastPassedSlot(prefs.times);
      if (!slot || busy || localStorage.getItem(LAST) === slot.key) return;
      busy = true;
      localStorage.setItem(LAST, slot.key);
      try {
        const { data: latest } = await supabase.from("source_runs").select("ran_at").order("ran_at", { ascending: false }).limit(1).maybeSingle();
        const fresh = latest && (Date.now() - new Date(latest.ran_at).getTime() < 30 * 60e3 || new Date(latest.ran_at) >= slot.at);
        if (!fresh) await retry();
        const watched = new Set(SOURCES.filter((s) => !prefs.disabled.includes(s.source)).map((s) => s.source));
        const [{ data: runs }, { count }] = await Promise.all([
          supabase.from("source_runs").select("source,ok"),
          supabase.from("signals").select("id", { count: "exact", head: true }).eq("is_demo", false).gte("created_at", new Date(slot.at.getTime() - 24 * 3600e3).toISOString()),
        ]);
        const failed = (runs ?? []).filter((r) => !r.ok && watched.has(r.source)).length;
        const text = `อัปเดตรอบ ${slot.time} เสร็จแล้ว — สัญญาณใหม่ 24 ชม. ${count ?? 0} รายการ${failed ? `, ล้มเหลว ${failed} แหล่ง` : ", ทุกแหล่งที่ติดตามดึงได้"}`;
        localStorage.setItem(RESULT, JSON.stringify({ key: slot.key, text }));
        const href = failed ? "/failures?followed=1" : "/monitor";
        toast(text, { action: { label: failed ? "ดูแหล่งที่ล้มเหลว" : "ดูการเปลี่ยนแปลง", onClick: () => { window.location.href = href; } }, duration: 15000 });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const n = new Notification("Thailand Daily Signals", { body: text });
          n.onclick = () => { window.focus(); window.location.href = href; };
        }
        qc.invalidateQueries();
      } finally {
        busy = false;
      }
    };
    tick();
    const id = setInterval(tick, 15e3);
    return () => clearInterval(id);
  }, [prefs.times.join(","), prefs.disabled.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
