# CLAUDE.md

Project rules live in @AGENTS.md (shared with Codex) and @src/lib/AGENTS.md (data sources). Read both before changing code.

## Start here

```bash
bun install
bun run setup      # interactive: .env + database schema/seed (+ optional cron)
bun run doctor     # checks env + database, says what is missing
bun run dev        # http://localhost:8080
```

Before finishing any task run `bun run typecheck && bun run test && bun run build`.
After any database migration run `bun run db:export` so `database/` stays in sync.

## Layout

- `src/routes/` — pages (TanStack Start file routes). `_admin/` = admin-only pages. `api/public/` = cron, REST v1, MCP, health.
- `src/lib/*.server.ts` — server-only code (connectors, queue, ingest). `*.functions.ts` — server functions callable from UI.
- `src/lib/connectors.server.ts` — every data source. `src/lib/openapi.ts` / `mcp-catalog.ts` — public API spec.
- `drizzle/migrations/` — schema history. `database/` — fresh-install snapshot. `docs/` — architecture, deployment, operations, development.

## Never break

- Official thresholds only; readers never set thresholds. Detection/ranking stay in SQL (`detect_core`, `rank_signals`).
- Never invent, fill or backdate data. Keep refers-to, effective and received dates separate. A blocked source fails honestly.
- Public REST/MCP are read-only (anon RLS). Never expose writes, queues, settings, evidence paths or service-role access.
- Migrations are additive: no dropped/renamed columns; every new public table gets GRANTs + RLS.
- No secrets in code or commits. Never edit `src/integrations/supabase/*` or `src/routeTree.gen.ts` (generated).

## Task guides

`/add-source`, `/add-signal`, `/check`, `/db-export` in `.claude/commands/`. The same guides for Codex: `docs/agent-tasks/`.
