import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSourcePrefs } from "@/hooks/use-source-prefs";
import { SOURCES } from "@/lib/sources";

type Run = { source: string; error: string | null; ran_at: string };
const NOTIFIED = "tds-fail-notified";

/** Warns immediately when a source the user watches failed in the latest fetch. */
export function FailureAlert() {
  const [prefs] = useSourcePrefs();
  const [runs, setRuns] = useState<Run[]>([]);
  useEffect(() => {
    supabase.from("source_runs").select("source,error,ran_at").eq("ok", false).then(({ data }) => setRuns((data ?? []) as Run[]));
  }, []);
  const watched = new Set(SOURCES.filter((s) => !prefs.disabled.includes(s.source)).map((s) => s.source));
  const mine = runs.filter((r) => watched.has(r.source));

  useEffect(() => {
    if (!mine.length || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const key = mine.map((r) => r.source + r.ran_at).join("|");
    if (localStorage.getItem(NOTIFIED) === key) return;
    localStorage.setItem(NOTIFIED, key);
    const n = new Notification(`ดึงข้อมูลรัฐไม่ได้ ${mine.length} แหล่ง`, { body: mine.slice(0, 3).map((r) => `${r.source}: ${r.error}`).join("\n") });
    n.onclick = () => { window.focus(); window.location.href = "/failures?followed=1"; };
  }, [mine.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
