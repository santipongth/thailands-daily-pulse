# Contributing

Thanks for helping! Thai or English is welcome in issues and PRs.

## Ground rules (please read)
These rules are what make the project trustworthy. A PR that breaks one will be asked to change.
1. **No change → no signal.** Signals come only from official thresholds in the `metrics` table. Readers never set thresholds.
2. **Never invent data.** No gap filling, no interpolation, no made-up history. If a source is blocked, it fails honestly and shows up on `/tracking`.
3. **Keep dates honest.** Every observation keeps `observed_on` (refers to), `effective_from`, `published_at` and `received_at`.
4. **Keep evidence.** Every fetch goes through `politeFetch` and is archived as raw evidence.
5. **News and social posts are context**, never signals.
6. **The public API/MCP are read-only.** Never expose writes, admin, queues, settings or private files.

## Dev setup
See the [Quick start in README](README.md#quick-start). Then:
```sh
bun run dev        # http://localhost:8080
bun run test       # unit tests (parsers, detection helpers)
bun run typecheck
bun run lint
```

## Adding a data source
1. **Parser** — `src/lib/<source>.ts`: pure function from raw text/JSON to values. Add `<source>.test.ts` with a saved fixture (real response, trimmed).
2. **Connector** — register in `src/lib/connectors.server.ts`. Return `{ values: { metric_id: number }, dates?, effective? }`. Use `politeFetch` (see `src/lib/AGENTS.md` for per-source rules).
3. **Metric(s)** — a migration in `drizzle/migrations/` that inserts into `metrics` (family, unit, kind `delta|level|release|events`, thresholds, `max_gap_days`, `late_window_days`) and `source_registry` (owner, channel, licence, cadence, url).
4. **Schedule** — add to the job list in `src/lib/source-config.server.ts` so it appears in the admin source manager.
5. Run `scripts/export-db.sh` to refresh `database/schema.sql` and `database/seed.sql`, and add a row to `docs/data-sources.md`.
6. Check the licence/terms of the source and write them in the PR.

## Database changes
- Add a new SQL file in `drizzle/migrations/`. Never edit old ones.
- Changes must be additive (no drop/rename of live columns).
- New public tables need `GRANT`s plus RLS policies (anon read-only, service_role write).

## Pull request checklist
- [ ] `bun run typecheck`, `bun run lint` and `bun run test` pass
- [ ] No secrets, keys or personal data in code, fixtures or screenshots
- [ ] UI text is in Thai, and code and comments are in English
- [ ] Docs updated (README, `docs/`, `/developers` pages come from `src/lib/openapi.ts`)

By contributing you agree your work is released under the MIT licence.
