# Self-host the app in a container. The build targets the Workers runtime; the container runs it
# with workerd (via wrangler) — the same engine as production, no Cloudflare account needed.
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock* bunfig.toml* ./
RUN bun install --frozen-lockfile
COPY . .
# Browser-visible settings are baked in at build time
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SITE_URL
ARG VITE_ADMIN_EMAIL
RUN bun run build

FROM node:22-slim
WORKDIR /app
RUN npm i -g wrangler@4
COPY --from=build /app/dist ./dist
COPY wrangler.jsonc ./
EXPOSE 8787
# Server secrets come from a .dev.vars file mounted at /app/.dev.vars (same format as .env)
CMD ["wrangler", "dev", "--ip", "0.0.0.0", "--port", "8787", "--local"]
