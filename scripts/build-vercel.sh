#!/bin/bash
# Vercel build script
set -e

echo "=== STARTING VERCEL BUILD SCRIPT ==="

# Export the database URL for all child commands
export DATABASE_URL="file:./reanzly.db"

echo "Running prisma db push..."
npx prisma db push --accept-data-loss

echo "Seeding database..."
npx tsx src/scripts/seed-all.ts

echo "Generating Prisma client..."
npx prisma generate

echo "Building Next.js application..."
npx next build

echo "=== VERCEL BUILD SCRIPT COMPLETED ==="
