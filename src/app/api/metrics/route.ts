import { NextRequest, NextResponse } from "next/server";
import { db, replicaHealth } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireMetricsAccess } from "@/lib/api-guards";
import { cacheStats } from "@/lib/cache";
import { queueStats, isWorkerRunning } from "@/lib/queue";
import { storageStats } from "@/lib/storage/object-storage";

// Detailed observability metrics — internal secret or platform admin only.

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  const denied = await requireMetricsAccess(req, sessionUser);
  if (denied) return denied;

  const [cache, queue, storage, replica] = await Promise.all([
    Promise.resolve(cacheStats()),
    queueStats(),
    storageStats(),
    replicaHealth(),
  ]);

  let tableCount = 0;
  try {
    const rows = await db.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    tableCount = Number(rows[0]?.count ?? 0);
  } catch {
    try {
      const rows = await (db as unknown as { $queryRawUnsafe: (q: string) => Promise<{ c: unknown }[]> })
        .$queryRawUnsafe("SELECT count(*) as c FROM sqlite_master WHERE type='table'");
      if (Array.isArray(rows) && rows[0] && "c" in rows[0]) {
        tableCount = Number(rows[0].c);
      }
    } catch {
      /* ignore */
    }
  }

  const uptimeSec = Math.floor(process.uptime());
  const mem = process.memoryUsage();

  const summary = {
    timestamp: new Date().toISOString(),
    uptimeSec,
    process: {
      pid: process.pid,
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      externalMb: Math.round(mem.external / 1024 / 1024),
    },
    database: {
      tables: tableCount,
      replica: {
        configured: replica.configured,
        connected: replica.connected,
        lagMs: replica.lagMs,
      },
    },
    cache: {
      ...cache,
      hitRate: cache.hits + cache.misses > 0 ? cache.hits / (cache.hits + cache.misses) : 0,
      bytesMb: Math.round(cache.bytes / 1024 / 1024),
    },
    queue: {
      ...queue,
      workerRunning: isWorkerRunning(),
    },
    storage: {
      driver: storage.driver,
      rootPath: storage.rootPath,
      buckets: storage.buckets.map((b) => ({
        ...b,
        totalMb: Math.round(b.totalBytes / 1024 / 1024),
      })),
    },
    architecture: {
      mode: "hybrid-monolith",
      cache: "in-memory-lru",
      queue: "persistent",
      objectStorage: storage.driver,
    },
  };

  return NextResponse.json(summary);
}
