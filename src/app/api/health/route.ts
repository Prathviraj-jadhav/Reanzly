import { NextResponse } from "next/server";
import { db, replicaHealth } from "@/lib/db";
import { cacheStats } from "@/lib/cache";
import { isWorkerRunning, startWorker } from "@/lib/queue";

// ===== Health Check =====
// Extended for the system-design layer: reports DB, replica, cache, queue, worker.

export async function GET() {
  try {
    // Quick DB connectivity check on primary.
    await db.$queryRaw`SELECT 1`;
    const replica = await replicaHealth();
    const cache = cacheStats();

    // Ensure the worker is running (idempotent).
    if (!isWorkerRunning()) startWorker();

    return NextResponse.json({
      status: "operational",
      database: "connected",
      replica: replica.configured
        ? replica.connected
          ? "connected"
          : "degraded"
        : "single-node",
      cache: {
        entries: cache.entries,
        hitRate:
          cache.hits + cache.misses > 0
            ? Math.round((cache.hits / (cache.hits + cache.misses)) * 100) / 100
            : 0,
      },
      queue: { workerRunning: isWorkerRunning() },
      timestamp: new Date().toISOString(),
      version: "3.1.0",
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
