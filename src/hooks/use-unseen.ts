import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "tds-last-seen-change";
const NOTIFIED = "tds-unseen-notified";
const EVT = "tds-unseen-change";

/** Count of gov changes newer than the last one this device has seen; notifies once per new max id. */
export function useUnseen() {
  const [count, setCount] = useState(0);
  const [maxId, setMaxId] = useState(0);
  const [lastSeen, setLastSeen] = useState(0);
  useEffect(() => {
    const read = () => setLastSeen(Number(localStorage.getItem(KEY) ?? 0));
    read();
    window.addEventListener(EVT, read);
    supabase.from("gov_changes").select("id,reason_th").order("id", { ascending: false }).limit(50).then(({ data }) => {
      const rows = data ?? [];
      const seen = Number(localStorage.getItem(KEY) ?? 0);
      const max = rows[0]?.id ?? 0;
      setMaxId(max);
      const fresh = rows.filter((r) => r.id > seen);
      setCount(fresh.length);
      if (fresh.length && typeof Notification !== "undefined" && Notification.permission === "granted" && localStorage.getItem(NOTIFIED) !== String(max)) {
        localStorage.setItem(NOTIFIED, String(max));
        new Notification(`ข้อมูลรัฐเปลี่ยนใหม่ ${fresh.length} รายการ`, { body: fresh.slice(0, 3).map((r) => r.reason_th).join("\n") });
      }
    });
    return () => window.removeEventListener(EVT, read);
  }, []);
  const markSeen = () => {
    localStorage.setItem(KEY, String(maxId));
    setCount(0);
    window.dispatchEvent(new Event(EVT));
  };
  return { count, lastSeen, markSeen };
}
