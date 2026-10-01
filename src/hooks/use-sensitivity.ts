import { useEffect, useState } from "react";
import type { Sensitivity } from "@/lib/signals";

const KEY = "tds-sensitivity";
const EVT = "tds-sensitivity-change";

export function useSensitivity(): [Sensitivity, (s: Sensitivity) => void] {
  const [value, setValue] = useState<Sensitivity>("medium");
  useEffect(() => {
    const read = () => {
      const v = localStorage.getItem(KEY);
      if (v === "low" || v === "medium" || v === "high") setValue(v);
    };
    read();
    window.addEventListener(EVT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  const set = (s: Sensitivity) => {
    localStorage.setItem(KEY, s);
    setValue(s);
    window.dispatchEvent(new Event(EVT));
  };
  return [value, set];
}
