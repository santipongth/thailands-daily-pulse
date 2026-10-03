# Check before finishing

```bash
bun run typecheck && bun run test && bun run build
```

Lint (`bun run lint`) has known formatting warnings; fix only files you touched (`bunx prettier --write <file>`).
