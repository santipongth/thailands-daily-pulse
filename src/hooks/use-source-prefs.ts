import { useEffect, useState } from "react";

const KEY = "tds-source-prefs";
const EVT = "tds-source-prefs-change";
export type SourcePrefs = { disabled: string[]; intervalHours: number };
const DEF: SourcePrefs = { disabled: [], intervalHours: 3 };

export function useSourcePrefs(): [SourcePrefs, (p: SourcePrefs) => void] {
  const [v, setV] = useState<SourcePrefs>(DEF);
  useEffect(() => {
    const read = () => {
      try {
        const p = JSON.parse(localStorage.getItem(KEY) ?? "null");
        if (p && Array.isArray(p.disabled)) setV({ disabled: p.disabled, intervalHours: Number(p.intervalHours) || 3 });
      } catch { /* ignore */ }
    };
    read();
    window.addEventListener(EVT, read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener(EVT, read); window.removeEventListener("storage", read); };
  }, []);
  const set = (p: SourcePrefs) => {
    localStorage.setItem(KEY, JSON.stringify(p));
    setV(p);
    window.dispatchEvent(new Event(EVT));
  };
  return [v, set];
}

export function readIntervalHours(): number {
  try { return Number(JSON.parse(localStorage.getItem(KEY) ?? "{}").intervalHours) || 3; } catch { return 3; }
}
