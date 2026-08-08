# =============================================================================
# Reanzly — Production Dockerfile (Next.js standalone + Socket.IO chat service)
# Multi-stage build. Single runtime image serves the Next.js app on :3000 and
# the chat service on :3003, behind a Caddy gateway on :80.
# =============================================================================

# ---------- Stage 1: deps ----------
FROM node:20-slim AS deps
WORKDIR /app

# Install bun for fast installs (and to run the chat service build)
RUN npm install -g bun

# Copy lockfile + manifests
COPY package.json bun.lock* package-lock.json* ./
COPY mini-services/chat-service/package.json ./mini-services/chat-service/package.json

# Install root deps (include devDeps for the build)
RUN bun install --frozen-lockfile || bun install

# Install chat-service deps
WORKDIR /app/mini-services/chat-service
RUN bun install
WORKDIR /app

# ---------- Stage 2: build ----------
FROM node:20-slim AS builder
WORKDIR /app
RUN npm install -g bun

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/mini-services/chat-service/node_modules ./mini-services/chat-service/node_modules
COPY . .

# Environment for the build (public-safe values; real secrets set at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js standalone output
RUN bun run db:generate || true
RUN bun run build

# Compile the chat service (Bun bundles on the fly, no separate step needed,
# but we keep the source so the runtime can run it with bun --hot off).

# ---------- Stage 3: runtime ----------
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    caddy openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install bun in the runtime too (chat service runs on bun)
RUN npm install -g bun

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV CHAT_SERVICE_PORT=3003

# Create a non-root user
RUN groupadd --system --gid 1001 reanzly \
    && useradd --system --uid 1001 --gid reanzly --shell /bin/bash --create-home reanzly

# Copy the standalone Next.js server
COPY --from=builder --chown=reanzly:reanzly /app/.next/standalone ./
COPY --from=builder --chown=reanzly:reanzly /app/.next/static ./.next/static
COPY --from=builder --chown=reanzly:reanzly /app/public ./public

# Copy Prisma schema + migrations so db:push / migrate deploy work at runtime
COPY --from=builder --chown=reanzly:reanzly /app/prisma ./prisma
COPY --from=builder --chown=reanzly:reanzly /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=reanzly:reanzly /app/node_modules/@prisma ./node_modules/@prisma

# Copy the chat service
COPY --from=builder --chown=reanzly:reanzly /app/mini-services ./mini-services

# Copy storage + db dirs (created at runtime if missing)
RUN mkdir -p storage/photos db && chown -R reanzly:reanzly storage db

# Copy the gateway config
COPY --chown=reanzly:reanzly Caddyfile ./Caddyfile

# Copy the entrypoint
COPY --chown=reanzly:reanzly docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER reanzly

EXPOSE 81 3000 3003

# Healthcheck hits the Next.js health endpoint through Caddy on :81
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:81/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
