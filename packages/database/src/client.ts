import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRead: PrismaClient | undefined;
};

/** Primary — writes and read-after-write consistent reads. */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

const replicaUrl = process.env.DATABASE_REPLICA_URL;

/** Replica — read-only; falls back to primary when unset. */
export const dbRead =
  globalForPrisma.prismaRead ??
  (replicaUrl
    ? new PrismaClient({
        log: ["error", "warn"],
        datasources: { db: { url: replicaUrl } },
      })
    : db);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaRead = dbRead;
}

export function primaryRead(): PrismaClient {
  return db;
}

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

export { PrismaClient };
