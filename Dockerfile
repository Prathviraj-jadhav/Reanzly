# =============================================================================
# Reanzly - Production Dockerfile (npm workspaces monorepo)
# Next.js standalone (apps/web) + Socket.IO chat (apps/chat) behind Caddy.
# =============================================================================

FROM node:20-slim AS deps
WORKDIR /app

RUN npm install -g bun

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/chat/package.json ./apps/chat/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci

WORKDIR /app/apps/chat
RUN bun install
WORKDIR /app

FROM node:20-slim AS builder
WORKDIR /app
RUN npm install -g bun

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/chat/node_modules ./apps/chat/node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run db:generate
RUN npm run build:web

FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    caddy openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g bun

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV CHAT_SERVICE_PORT=3003

RUN groupadd --system --gid 1001 reanzly \
    && useradd --system --uid 1001 --gid reanzly --shell /bin/bash --create-home reanzly

COPY --from=builder --chown=reanzly:reanzly /app/apps/web/.next/standalone ./
COPY --from=builder --chown=reanzly:reanzly /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=reanzly:reanzly /app/apps/web/public ./apps/web/public

COPY --from=builder --chown=reanzly:reanzly /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder --chown=reanzly:reanzly /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=reanzly:reanzly /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=reanzly:reanzly /app/node_modules/prisma ./node_modules/prisma

COPY --from=builder --chown=reanzly:reanzly /app/apps/chat ./apps/chat

RUN mkdir -p storage/photos db && chown -R reanzly:reanzly storage db

COPY --chown=reanzly:reanzly Caddyfile ./Caddyfile
COPY --chown=reanzly:reanzly docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER reanzly

EXPOSE 81 3000 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:81/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
