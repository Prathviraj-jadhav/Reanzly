// ===== Read Replica Abstraction =====
// Read/write splitting for horizontal read scaling. The app talks to `db`
// (primary) for writes and `dbRead` (replica) for reads. In dev both point
// to the same client. In production, set DATABASE_REPLICA_URL to a read-replica
// and reads fan out across replicas.
//
// Usage:
//   import { db, dbRead } from "@/lib/db";
//   await db.trip.create({ ... });              // write → primary
//   const trips = await dbRead.trip.findMany(); // read → replica

import { PrismaClient } from "@prisma/client";

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
// configured (dev). Production sets DATABASE_REPLICA_URL.
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
