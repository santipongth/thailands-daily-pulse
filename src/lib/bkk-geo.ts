// Pure helpers for map locations and TMD times (unit-tested in bkk-geo.test.ts).

/** OpenStreetMap search strings for a BMA road sensor "ถ.<road> (<soi or landmark>)". Empty → list-only. */
export function bmaGeoQueries(name: string, road: string): string[] {
  const m = name.match(/ถ\.\s*(.+?)\s*\((.+)\)/);
  if (!m) return [];
  const rd = m[1]!.trim(), land = m[2]!.trim();
  const soi = land.match(/^ซ\.?\s*(.+)/);
  return soi ? [`ซอย${rd} ${soi[1]!.trim()}`] : [`${land} ${road}`.trim(), land];
}

/** TMD obs time "MM/DD/YYYY HH:MM:SS" (or "HH:MM") → "HH:MM"; null if unreadable. */
export function tmdTime(s: string | null | undefined): string | null {
  const m = String(s ?? "").match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*$/);
  return m ? `${m[1]!.padStart(2, "0")}:${m[2]}` : null;
}

/** "แขวง… เขตบางนา, กรุงเทพฯ" → "บางนา". */
export function districtOf(area: string | null | undefined): string | null {
  const m = String(area ?? "").match(/เขต\s*([^\s,]+)/);
  return m ? m[1]! : null;
}
