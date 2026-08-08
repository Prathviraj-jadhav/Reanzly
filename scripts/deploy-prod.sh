#!/usr/bin/env bash
# =============================================================================
# Reanzly v2 - Production Automated Deployment & Healthcheck Script
# =============================================================================

set -e

echo "=== [1/5] Running Deployment Pre-flight Checks ==="
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH."
    exit 1
fi

COMPOSE_CMD="docker compose"
if ! $COMPOSE_CMD version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo "ERROR: Docker Compose is not installed."
        exit 1
    fi
fi

if [ ! -f ".env" ]; then
    echo "WARNING: .env file missing. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        echo "ERROR: .env.example template not found."
        exit 1
    fi
fi

# Ensure NEXTAUTH_SECRET is set securely
if ! grep -q "NEXTAUTH_SECRET=" .env || grep -q "NEXTAUTH_SECRET=generate-with-openssl" .env; then
    NEW_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=${NEW_SECRET}/" .env || echo "NEXTAUTH_SECRET=${NEW_SECRET}" >> .env
    echo "Generated new production NEXTAUTH_SECRET."
fi

echo "=== [2/5] Creating Database Backup ==="
mkdir -p db/backups storage/backups
BACKUP_TS=$(date +%Y%m%d_%H%M%S)
if [ -f "db/custom.db" ]; then
    cp db/custom.db "db/backups/custom_${BACKUP_TS}.db"
    echo "Backed up local database to db/backups/custom_${BACKUP_TS}.db"
fi

echo "=== [3/5] Building & Deploying Docker Containers ==="
$COMPOSE_CMD -f docker-compose.prod.yml pull || true
$COMPOSE_CMD -f docker-compose.prod.yml up -d --build --remove-orphans

echo "=== [4/5] Running Automated Healthchecks ==="
MAX_RETRIES=12
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    echo "Health check attempt $RETRY_COUNT/$MAX_RETRIES..."
    
    # Check gateway or local Next.js endpoint
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/api/health || curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || true)
    
    if [ "$HTTP_CODE" = "200" ]; then
        HEALTHY=true
        break
    fi
    sleep 5
done

if [ "$HEALTHY" = true ]; then
    echo "=== [5/5] Deployment SUCCESSFUL! Reanzly v2 is Live & Healthy ==="
    $COMPOSE_CMD -f docker-compose.prod.yml ps
    exit 0
else
    echo "=== ERROR: Health check failed! HTTP status: $HTTP_CODE ==="
    echo "Container logs:"
    $COMPOSE_CMD -f docker-compose.prod.yml logs --tail=50
    exit 1
fi
