#!/bin/bash
# Vercel build script
set -e

echo "=== STARTING VERCEL BUILD SCRIPT ==="

# Export the database URL for all child commands




echo "Generating Prisma client..."
npx prisma generate

echo "Building Next.js application..."
npx next build

echo "=== VERCEL BUILD SCRIPT COMPLETED ==="
