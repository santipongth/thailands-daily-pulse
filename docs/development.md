# Development guide

## 1. Get running

```bash
git clone <your-fork> && cd <repo>
bun install
bun run setup     # asks for database URL/keys, writes .env, can install schema
bun run doctor    # verifies settings + database tables
bun run dev       # http://localhost:8080
```

Or open the repo in **VS Code Dev Containers / GitHub Codespaces** — `.devcontainer/` installs Bun, psql and packages; then run `bun run setup`.

The committed `.env` holds only the upstream project's public (publishable) keys. Replace it with your own via `bun run setup` or the in-app `/setup` page.

## 2. Local database options

- **Supabase cloud (easiest):** create a free project, copy URL + publishable + secret keys, Database → connection string (session mode) as `DATABASE_URL`.
- **Supabase CLI (fully local):** `npx supabase start`, then use the printed API URL/keys and `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
- Install schema: `DATABASE_URL=... bun run db:setup --no-cron` (add cron only on a public URL).
- Admin user: sign up the user in Auth, then run `database/create-admin.sql` with that email.

## 3. Database changes

1. Write an additive migration in `drizzle/migrations/` (never drop/rename; GRANT + RLS for new public tables).
2. Apply it to your database.
3. `bun run db:export` to refresh `database/`.

## 4. Tests and checks

`bun run typecheck && bun run test && bun run build`. Parser tests use fixtures — add one per new source.

## 5. Working with Claude Code / Codex

- Claude Code reads `CLAUDE.md` → `AGENTS.md`; Codex reads `AGENTS.md` (and `src/lib/AGENTS.md` inside that folder).
- Task guides: Claude slash commands `/add-source`, `/add-signal`, `/check`, `/db-export`; for Codex the same text is in `docs/agent-tasks/` — say "follow docs/agent-tasks/add-source.md".
- `.claude/settings.json` allows tests/builds and blocks reading `.env` and `git push`.
- Example requests:
  - "Add a connector for the Bank of Thailand policy rate, following docs/agent-tasks/add-source.md."
  - "Add a release rule for metric X effective next Monday with the official threshold."
  - "Why did yesterday's brief have no fuel signal? Check detect_core output and the observations."

## 6. Debugging checklist

- `bun run doctor` first.
- Admin → source manager shows last success/error per source; `/tracking` shows windows and cutoff reasons.
- Trigger a round manually: `curl -X POST -H "Authorization: Bearer $LOVABLE_CRON_SECRET" http://localhost:8080/api/public/ingest`.
- `/api/public/health` for queue and freshness.
