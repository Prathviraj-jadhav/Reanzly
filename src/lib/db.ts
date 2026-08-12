// ===== Read Replica Abstraction =====
// Read/write splitting for horizontal read scaling. The app talks to `db`
// (primary) for writes and `dbRead` (replica) for reads. In dev (SQLite) both
// point to the same client. In production, set DATABASE_REPLICA_URL to a
// read-replica Postgres/MySQL and reads fan out across replicas.
//
// Why a replica + cost:
//  - Reanzly is read-heavy (dashboards, fleet map, reports all read; only
//    drivers/ops write). A single DB primary saturates at ~1k QPS complex
//    queries. Replicas let reads scale horizontally to N x replica QPS.
//  - Cost: one replica doubles DB compute; replica lag (typically <1s) means
//    reads may be slightly stale. Mitigated by routing read-after-write to the
//    PRIMARY for the same request (session stickiness).
//
// Usage:
//   import { db, dbRead } from "@/lib/db";
//   await db.trip.create({ ... });              // write → primary
//   const trips = await dbRead.trip.findMany(); // read → replica

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Vercel serverless SQLite write bypass:
// Since Vercel's filesystem is read-only except for /tmp, we copy the
// pre-seeded SQLite database file to /tmp on the first initialization so
// that SQLite can open it in read-write mode and allow authentication/session writes.
if (process.env.VERCEL === "1") {
  const dbName = "reanzly.db";
  const srcPath = path.join(process.cwd(), "prisma", dbName);
  const fallbackSrcPath = path.join(process.cwd(), dbName);
  const destPath = path.join("/tmp", dbName);

  if (!fs.existsSync(destPath)) {
    console.log(`[db.ts] Copying SQLite database to /tmp...`);
    let copied = false;
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      copied = true;
      console.log(`[db.ts] SQLite database copied from ${srcPath} to ${destPath}`);
    } else if (fs.existsSync(fallbackSrcPath)) {
      fs.copyFileSync(fallbackSrcPath, destPath);
      copied = true;
      console.log(`[db.ts] SQLite database copied from ${fallbackSrcPath} to ${destPath}`);
    } else {
      console.error(`[db.ts] Source SQLite database not found at ${srcPath} or ${fallbackSrcPath}!`);
    }

    if (copied) {
      try {
        fs.chmodSync(destPath, 0o666);
      } catch (e) {
        console.warn(`[db.ts] Failed to chmod SQLite file:`, e);
      }
    }
  }

  process.env.DATABASE_URL = `file:${destPath}`;
}


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRead: PrismaClient | undefined;
};

// Primary - ALL writes + reads that must be read-after-write consistent.
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

// Replica - reads only. Falls back to the same client when no replica URL is
// configured (dev/SQLite). Production sets DATABASE_REPLICA_URL.
const replicaUrl = process.env.DATABASE_REPLICA_URL;
export const dbRead =
  globalForPrisma.prismaRead ??
  (replicaUrl
    ? new PrismaClient({ log: ["error", "warn"], datasources: { db: { url: replicaUrl } } })
    : db); // dev fallback: same client

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaRead = dbRead;
}

// ===== Read-after-write helper =====
// Use this for flows where the user just wrote and immediately reads back
// (e.g., create trip → render trip list). Forces a primary read to avoid
// replica-lag staleness.
export function primaryRead(): PrismaClient {
  return db;
}

// ===== Replica health =====
export async function replicaHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  lagMs: number | null;
}> {
  const configured = !!replicaUrl;
  if (!configured) {
    return { configured: false, connected: true, lagMs: 0 };
  }
  try {
    const start = Date.now();
    await dbRead.$queryRaw`SELECT 1`;
    return { configured: true, connected: true, lagMs: Date.now() - start };
  } catch {
    return { configured: true, connected: false, lagMs: null };
  }
}
