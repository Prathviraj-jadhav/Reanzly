#!/usr/bin/env bash
# =============================================================================
# Reanzly container entrypoint.
#   1. Push the Prisma schema to the database (idempotent).
#   2. Start the Socket.IO chat service on port 3003 (background).
#   3. Start Caddy gateway on port 80 (background).
#   4. Start the Next.js standalone server on port 3000 (foreground).
# =============================================================================
set -euo pipefail

echo "[reanzly] runtime: NODE_ENV=${NODE_ENV:-development}"

# --- 1. Database schema push (idempotent) -------------------------------------
if [ -n "${DATABASE_URL:-}" ]; then
  echo "[reanzly] pushing prisma schema to database..."
  # node_modules/.bin/prisma is provided by the @prisma/client install
  if [ -f node_modules/.bin/prisma ]; then
    node_modules/.bin/prisma db push --accept-data-loss || {
      echo "[reanzly] WARNING: prisma db push failed — continuing anyway (DB may already be initialised)"
    }
  else
    echo "[reanzly] prisma CLI not found — skipping schema push"
  fi
else
  echo "[reanzly] DATABASE_URL not set — skipping schema push"
fi

# --- 2. Chat service (Socket.IO on :3003) -------------------------------------
echo "[reanzly] starting chat service on port ${CHAT_SERVICE_PORT:-3003}..."
cd /app/mini-services/chat-service
( bun run index.ts > /tmp/chat.log 2>&1 ) &
CHAT_PID=$!
cd /app
echo "[reanzly] chat service started (pid ${CHAT_PID})"

# --- 3. Caddy gateway on :80 --------------------------------------------------
echo "[reanzly] starting caddy gateway on port 80..."
( caddy run --config /app/Caddyfile --adapter caddyfile > /tmp/caddy.log 2>&1 ) &
CADDY_PID=$!
echo "[reanzly] caddy started (pid ${CADDY_PID})"

# --- 4. Next.js standalone server on :3000 (foreground) -----------------------
echo "[reanzly] starting next.js standalone server on port ${PORT:-3000}..."
exec node server.js
