# Ready for Claude Code and Codex: GitHub release + one-command install

## What needs you
- **Publish the code to GitHub:** click **+** in the chat box → **GitHub** → **Connect project**. This creates the repository and copies every file, including all admin pages. After that, every change syncs automatically. I can't press this button for you.
- **Make it public:** on GitHub, open Settings → Change visibility → Public.
- Once it's connected, I'll check that the repository has every file and that a fresh download installs cleanly.

## 1. Files that AI coding tools read automatically
- **`CLAUDE.md`** (Claude Code) and **`AGENTS.md`** (Codex): the existing project rules stay as they are. I'll add a short "start here" section covering:
  - how to install, run, test and build
  - where things live
  - the rules that must never break: official thresholds only, never invent data, honest dates, a read-only public API, additive-only database changes, no secrets in code
  - how to add a source or signal, and what to run before finishing (typecheck, tests, refreshing the database snapshot)

  `CLAUDE.md` points to `AGENTS.md`, so the rules live in one place.
- **`src/lib/AGENTS.md`** stays as the detailed rulebook for each data source. Both tools read it when they work in that folder.
- **`.claude/`** gets project settings with safe default permissions: commands like test, typecheck and lint are allowed, and reading `.env` or pushing code is blocked. It also gets ready-made commands:
  - `/add-source`: the step-by-step guide to adding a source
  - `/add-signal`: adding a signal rule
  - `/check`: typecheck + tests + build
  - `/db-export`: refreshing the database snapshot
- **`.codex/`** (or `AGENTS.md` sections, depending on what Codex supports) gets the same task guides as plain markdown prompts.

## 2. Install and start right away
- **One command:** `bun run setup`. An interactive script checks the needed tools, copies `.env.example`, asks for the database URL and keys (or reads them from the environment), creates the tables and setup data, and generates a scheduler secret. It finishes by printing the next steps.
- **Dev container** (`.devcontainer/`) for VS Code, GitHub Codespaces and Claude Code / Codex cloud sandboxes. It installs Bun, psql and the project packages automatically, so the developer opens it and runs `bun run dev`.
- **Demo mode without your own database** (optional switch): the site opens with a clear "no database connected" notice that points to `/setup`, instead of crashing. This helps someone who just wants to look at the code running.
- `bun run doctor`: checks settings and the database connection, and says exactly what is missing.

## 3. Docs for developers
- The READMEs (English and Thai) gain a section on developing with Claude Code / Codex: open the project, tell the AI what you want, and it already knows the rules. Example requests are included.
- `docs/development.md`: setting up a local database (Supabase CLI or Docker), running tests, the order of database changes, and the debugging checklist.
- Admin pages (custom sources, custom signals, source manager) are documented in `docs/operations.md`.

## 4. Finish the open work from last time
- Run the 05:20 custom schedule test for the test source "Frankfurter USD/THB (ทดสอบ)" on this install and confirm:
  - "สำเร็จล่าสุด" (last success) updates
  - a reading is stored with the source's own date as its effective date
  - evidence is saved
- Then remove or keep the test source, whichever you prefer.
- Tell you plainly about one bug found last time. Custom fetch times ("กำหนดเวลาเอง") couldn't be saved before, because the database only accepted the older schedule types. That's now fixed.
- Re-export `database/schema.sql`, which now includes the new custom-sources and rule tables, and add tests for the setup and doctor scripts.

## Technical details
- New files:
  - `CLAUDE.md` (imports `@AGENTS.md` + quick commands)
  - `.claude/settings.json` (permissions allow/deny)
  - `.claude/commands/{add-source,add-signal,check,db-export}.md`
  - `.devcontainer/devcontainer.json` (Bun, Node 22, postgresql-client; postCreate `bun install`)
  - `scripts/setup.ts`, `scripts/doctor.ts` (Bun, no new dependencies)
  - `docs/development.md`
- `package.json` gets `setup` and `doctor` scripts.
- Missing Supabase env: the root route catches client creation failure and renders a setup notice linking `/setup`, without touching auto-generated client files.
- `AGENTS.md` stays under its size budget. New long guidance goes into `docs/` and the command files.
- Secret scan before release: no `.env`, keys or admin password in tracked files. The admin password currently used on this site is never written anywhere.
