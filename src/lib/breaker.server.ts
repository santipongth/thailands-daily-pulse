// Server-only: circuit breaker per source. 3 failed runs in a row → pause 4h; each failed probe
// after that → pause 6h. A success resets. Manual runs and the 05:xx pre-brief rounds always probe.
export const BREAKER_FAILS = 3;

export function nextBreaker(prevStreak: number, failed: boolean, now = Date.now()) {
  if (!failed) return { fail_streak: 0, open_until: null as string | null };
  const s = prevStreak + 1;
  const open_until = s >= BREAKER_FAILS ? new Date(now + (s === BREAKER_FAILS ? 4 : 6) * 3600e3).toISOString() : null;
  return { fail_streak: s, open_until };
}

export async function recordBreaker(admin: any, source: string, failed: boolean) {
  const { data } = await admin.from("source_breaker").select("fail_streak").eq("source", source).maybeSingle();
  const n = nextBreaker(data?.fail_streak ?? 0, failed);
  await admin.from("source_breaker").upsert({ source, ...n, probe: false, updated_at: new Date().toISOString() }, { onConflict: "source" });
}

/** Sources paused right now (open_until in the future). */
export async function pausedSources(admin: any): Promise<Set<string>> {
  const { data } = await admin.from("source_breaker").select("source").gt("open_until", new Date().toISOString());
  return new Set((data ?? []).map((r: any) => r.source));
}

/** Bypass for manual runs and the 05:00–05:59 Bangkok pre-brief rounds. */
export const breakerBypass = (runKind?: string) => runKind === "manual" || new Date(Date.now() + 7 * 3600e3).getUTCHours() === 5;
