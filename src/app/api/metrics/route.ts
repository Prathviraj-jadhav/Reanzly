import { NextResponse } from "next/server";
import { db, replicaHealth } from "@/lib/db";
import { cacheStats } from "@/lib/cache";
import { queueStats, isWorkerRunning } from "@/lib/queue";
import { storageStats } from "@/lib/storage/object-storage";

// ===== Observability Metrics =====
// Prometheus-style metrics + a JSON summary for the System Design dashboard.
// Exposed at /api/metrics for scraping. No PII.

export async function GET() {
  const [cache, queue, storage, replica] = await Promise.all([
    Promise.resolve(cacheStats()),
    queueStats(),
    storageStats(),
    replicaHealth(),
  ]);

  let dbCount = 0;
  try {
    const rows = await (db as unknown as { $queryRawUnsafe: (q: string) => Promise<unknown[]> }).$queryRawUnsafe(
      "SELECT count(*) as c FROM sqlite_master WHERE type='table'"
    );
    if (Array.isArray(rows) && rows[0] && typeof rows[0] === "object" && "c" in rows[0]) {
      dbCount = Number((rows[0] as { c: unknown }).c);
    }
  } catch {
    /* ignore */
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
      tables: dbCount,
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
      // Hybrid monolith + microservices readiness:
      // - Core app = monolith (this Next.js process)
      // - GPS ingestion service = candidate to split (high write QPS)
      // - Photo processing service = candidate to split (CPU-bound)
      mode: "hybrid-monolith",
      primaryDb: "sqlite",
      cache: "in-memory-lru",
      queue: "sqlite-persistent",
      objectStorage: "local-file",
      cdn: "ready",
      loadBalancer: "ready",
    },
  };

  return NextResponse.json(summary);
}
