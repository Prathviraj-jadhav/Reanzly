import { NextResponse } from "next/server";
import { db, replicaHealth } from "@/lib/db";
import { cacheStats, cacheResetStats } from "@/lib/cache";
import { queueStats, isWorkerRunning, startWorker, stopWorker } from "@/lib/queue";
import { storageStats } from "@/lib/storage/object-storage";
import { requireSuperadmin } from "@/lib/permissions";

// ===== Queue Status & Control =====
// GET  - queue + worker + cache + storage snapshot
// POST - control worker (start/stop/reset-stats)

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  const [cache, queue, storage, replica] = await Promise.all([
    Promise.resolve(cacheStats()),
    queueStats(),
    storageStats(),
    replicaHealth(),
  ]);

  // Recent jobs for the ops view.
  let recent: unknown[] = [];
  try {
    recent = await (db as unknown as { job: { findMany: (a: unknown) => Promise<unknown[]> } }).job.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch {
    /* table missing */
  }

  return NextResponse.json({
    workerRunning: isWorkerRunning(),
    cache,
    queue,
    storage: {
      driver: storage.driver,
      buckets: storage.buckets.map((b) => ({
        ...b,
        totalMb: Math.round(b.totalBytes / 1024 / 1024),
      })),
    },
    replica,
    recent,
  });
}

export async function POST(req: Request) {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "status";
  if (action === "start") {
    startWorker();
    return NextResponse.json({ ok: true, workerRunning: true });
  }
  if (action === "stop") {
    stopWorker();
    return NextResponse.json({ ok: true, workerRunning: false });
  }
  if (action === "reset-stats") {
    cacheResetStats();
    return NextResponse.json({ ok: true, reset: true });
  }
  return GET();
}
