---
description: Add a data source
---
# Add a data source

No code needed for simple JSON/CSV/text sources: use admin → "แหล่งข้อมูลของฉัน" (custom sources).

For a built-in connector:

1. Read `src/lib/AGENTS.md` and an existing connector in `src/lib/connectors.server.ts` (e.g. `dit.ts`).
2. Put pure parsing in `src/lib/<name>.ts` with a fixture test `src/lib/<name>.test.ts`; fetch only via `politeFetch` (`http.server.ts`).
3. Return `{ metric_id: value }` plus per-metric `effective` dates when the source gives them. Never synthesise missing days.
4. Add the source to `SOURCES`, a `source_registry` row (owner, licence, cadence, `stale_after_days`) and a `metrics` row with official thresholds, all in an additive migration.
5. Run `bun run test`, `bun run typecheck`, then `bun run db:export`.
6. Document it in `docs/data-sources.md`.
