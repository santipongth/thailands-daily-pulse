# Fix Open-Meteo and ThaiWater fetch failures

## What the checks found

- **Both sources answer with "429 Too Many Requests"** on every run since 14:05 UTC today. They also failed with 429 for most of 2 Oct, except one window at 10:16 UTC.
- **Our request volume is tiny:** 1–2 requests per hour per source. Open-Meteo gets 3 requests per run, ThaiWater gets 1. That's nowhere near either provider's limit.
- **The same addresses work right now from a different machine.** All three addresses (Open-Meteo weather, Open-Meteo PM2.5 and ThaiWater dams) returned 200 OK with fresh data when tested from the sandbox at 23:39 Bangkok.
- **Conclusion:** the block is on the outgoing address of the hosting servers, which is shared with many other sites. Our own traffic isn't the cause, and nothing is wrong with the addresses or how we read the data. When the block lifts, the run succeeds, as it did at 10:16.
- **The brief already handles this correctly:** both sources are marked "can't verify" in the brief, never "no change".

## What to build

1. **Retry politely on 429.** Wait for the time the provider asks for (Retry-After), or 20s, then 60s if it doesn't say. Stop after 3 tries so one run can't hammer the provider.
2. **Use a second route for each source:**
   - Open-Meteo: try the backup server address it publishes, and ask for both cities' PM2.5 in one request, which cuts the requests per run from 3 to 2.
   - ThaiWater: fall back to the separate dam-only public address.
3. **Collect more often before the cutoff.** If a source hits 429, add one extra queued retry before 05:45, so the brief has a better chance of getting fresh data.
4. **Show "blocked by provider (429)" clearly on the failures page,** separately from "site down" or "parse error", with a note that the rest of the system is fine.
5. **Verify:** run each fetch from the app's server, record whether it returns 200 or 429, and confirm the failures page shows the new label.

## Limits

- If the hosting servers' shared address stays blocked, no code change can guarantee success. The only full fix would be a paid key from Open-Meteo, which has its own allowance, or asking HII (สสน.) for an API key. I'll report the result after step 5.

## Technical details

- `src/lib/connectors.server.ts`: wrap the `json()` helper with retry-on-429 that honours `Retry-After`; merge the two PM2.5 calls into one multi-coordinate request; add fallback URLs.
- Classify errors starting with `429` as `rate_limited` in the failures UI.
- In `queue.server.ts`, a 429 failure uses `run_after` = now + 15 minutes, within the early runs before 05:45.
