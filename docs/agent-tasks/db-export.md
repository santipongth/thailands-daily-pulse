# Refresh the database snapshot

After any new file in `drizzle/migrations/`:

```bash
DATABASE_URL=postgresql://... bun run db:export
```

This rewrites `database/schema.sql` and `database/seed.sql` (structure + setup data only — never readings, accounts or secrets). Commit both with the migration.
