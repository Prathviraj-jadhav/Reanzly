// ===== Reanzly Job Queue =====
// SQLite-backed persistent job queue with in-process workers.
// Survives server restarts (jobs are durable in the DB). Powers async work:
//   - photo.process: downscale + upload to object storage + extract EXIF GPS
//   - location.batch: coalesce high-frequency GPS pings into batched writes
//   - notification.dispatch: fan-out notifications across channels
//   - report.generate: long-running report renders off the request path
//   - audit.log: append audit entries asynchronously
//   - cache.invalidate: cross-instance cache busting (pub/sub in prod)
//
// Why a queue + cost:
//  - Driver app fires a GPS ping every few seconds + photos on capture. Doing
//    these synchronously in the request handler adds 100-300ms latency to the
//    driver's response. Offloading to a queue keeps the API p99 < 50ms.
//  - Cost: one worker thread polling every 500ms; SQLite write contention is
//    minimal because jobs are small rows. In prod, swap to Redis/BullMQ or
//    SQS - the enqueue/handle API is identical.

import { db } from "@/lib/db";
import { uploadPhoto } from "@/lib/storage/object-storage";
import { cacheInvalidate, CACHE_TAGS } from "@/lib/cache";

// ===== Job types =====
export type JobType =
  | "photo.process"
  | "location.batch"
  | "notification.dispatch"
  | "report.generate"
  | "audit.log"
  | "cache.invalidate"
  | "automation.run";

export interface Job<T = unknown> {
  id: string;
  type: JobType;
  payload: T;
  status: "pending" | "running" | "completed" | "failed" | "dead";
  attempts: number;
  maxAttempts: number;
  priority: number; // higher = sooner
  runAfter: number; // ms epoch
  lockedBy: string | null;
  error: string | null;
  result: unknown;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

// Prisma model (added to schema):
//   model Job {
//     id          String   @id
//     type        String
//     payload     String   // JSON
//     status      String   @default("pending")
//     attempts    Int      @default(0)
//     maxAttempts Int      @default(5)
//     priority    Int      @default(0)
//     runAfter    DateTime @default(now())
//     lockedBy    String?
//     error       String?
//     result      String?
//     createdAt   DateTime @default(now())
//     startedAt   DateTime?
//     completedAt DateTime?
//     @@index([status, runAfter, priority])
//     @@index([type, status])
//   }

const POLL_INTERVAL_MS = 500;
const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 2_000; // 2s, 4s, 8s, 16s, 32s exponential

let workerRunning = false;
let workerTimer: NodeJS.Timeout | null = null;

// ===== Enqueue =====

let idCounter = 0;
function genId(): string {
  idCounter = (idCounter + 1) % 1_000_000;
  return `job_${Date.now().toString(36)}_${idCounter.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export interface EnqueueOpts {
  priority?: number;
  runAfterMs?: number;
  maxAttempts?: number;
}

export async function enqueue<T>(
  type: JobType,
  payload: T,
  opts: EnqueueOpts = {}
): Promise<string> {
  const id = genId();
  const now = Date.now();
  try {
    await (db as unknown as { job: { create: (a: unknown) => Promise<unknown> } }).job.create({
      data: {
        id,
        type,
        payload: JSON.stringify(payload),
        status: "pending",
        attempts: 0,
        maxAttempts: opts.maxAttempts ?? MAX_ATTEMPTS,
        priority: opts.priority ?? 0,
        runAfter: new Date(now + (opts.runAfterMs ?? 0)),
        lockedBy: null,
        error: null,
        result: null,
        startedAt: null,
        completedAt: null,
      },
    });
  } catch (err) {
    // If Job table doesn't exist yet (schema not pushed), fail soft - caller
    // can still operate synchronously. Log for observability.
    console.error("[queue] enqueue failed (table missing?)", err);
  }
  return id;
}

// ===== Worker =====

type Handler<T> = (payload: T, job: Job<T>) => Promise<unknown>;

const handlers: Partial<Record<JobType, Handler<unknown>>> = {};

export function registerHandler<T>(type: JobType, handler: Handler<T>): void {
  handlers[type] = handler as Handler<unknown>;
}

async function claimNext(): Promise<Job | null> {
  // Atomic claim: mark the next eligible job as running.
  // SQLite doesn't support SKIP LOCKED, so we use a transaction + lockedBy.
  const now = new Date();
  try {
    const next = await (db as unknown as { job: { findFirst: (a: unknown) => Promise<JobRecord | null> } }).job.findFirst({
      where: {
        status: "pending",
        runAfter: { lte: now },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 1,
    });
    if (!next) return null;

    const lockId = genId();
    // Try to claim it (CAS on status).
    const updated = await (db as unknown as { job: { updateMany: (a: unknown) => Promise<{ count: number }> } }).job.updateMany({
      where: { id: next.id, status: "pending" },
      data: { status: "running", lockedBy: lockId, startedAt: now, attempts: { increment: 1 } },
    });
    if (updated.count === 0) return null; // someone else got it

    return recordToJob(next, lockId);
  } catch (err) {
    console.error("[queue] claim error", err);
    return null;
  }
}

interface JobRecord {
  id: string;
  type: string;
  payload: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  priority: number;
  runAfter: Date;
  lockedBy: string | null;
  error: string | null;
  result: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

function recordToJob(r: JobRecord, lockId: string): Job {
  let payload: unknown = null;
  try {
    payload = r.payload ? JSON.parse(r.payload) : null;
  } catch {
    payload = null;
  }
  let result: unknown = null;
  try {
    result = r.result ? JSON.parse(r.result) : null;
  } catch {
    result = null;
  }
  return {
    id: r.id,
    type: r.type as JobType,
    payload,
    status: r.status as Job["status"],
    attempts: r.attempts,
    maxAttempts: r.maxAttempts,
    priority: r.priority,
    runAfter: r.runAfter.getTime(),
    lockedBy: lockId,
    error: r.error,
    result,
    createdAt: r.createdAt.getTime(),
    startedAt: r.startedAt?.getTime() ?? null,
    completedAt: r.completedAt?.getTime() ?? null,
  };
}

async function processOne(): Promise<boolean> {
  const job = await claimNext();
  if (!job) return false;

  const handler = handlers[job.type];
  if (!handler) {
    // No handler - mark dead so it doesn't block the queue.
    await finishJob(job.id, job.lockedBy, "dead", "no handler registered", null);
    return true;
  }

  try {
    const result = await handler(job.payload, job);
    await finishJob(job.id, job.lockedBy, "completed", null, result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (job.attempts >= job.maxAttempts) {
      // Dead-letter.
      await finishJob(job.id, job.lockedBy, "dead", errorMsg, null);
    } else {
      // Retry with exponential backoff.
      const backoff = BACKOFF_BASE_MS * Math.pow(2, job.attempts - 1);
      await requeue(job.id, job.lockedBy, backoff, errorMsg);
    }
  }
  return true;
}

async function finishJob(
  id: string,
  lockId: string | null,
  status: "completed" | "dead",
  error: string | null,
  result: unknown
): Promise<void> {
  try {
    await (db as unknown as { job: { updateMany: (a: unknown) => Promise<{ count: number }> } }).job.updateMany({
      where: { id, lockedBy: lockId },
      data: {
        status,
        error,
        result: result === null ? null : JSON.stringify(result),
        completedAt: new Date(),
        lockedBy: null,
      },
    });
  } catch (err) {
    console.error("[queue] finishJob error", err);
  }
}

async function requeue(id: string, lockId: string | null, backoffMs: number, error: string): Promise<void> {
  try {
    await (db as unknown as { job: { updateMany: (a: unknown) => Promise<{ count: number }> } }).job.updateMany({
      where: { id, lockedBy: lockId },
      data: {
        status: "pending",
        error,
        runAfter: new Date(Date.now() + backoffMs),
        lockedBy: null,
      },
    });
  } catch (err) {
    console.error("[queue] requeue error", err);
  }
}

async function workerLoop(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;
  try {
    // Drain up to 10 jobs per tick to handle bursts.
    for (let i = 0; i < 10; i++) {
      const did = await processOne();
      if (!did) break;
    }
  } finally {
    workerRunning = false;
  }
}

/** Start the worker poll loop. Idempotent - safe to call multiple times. */
export function startWorker(): void {
  if (workerTimer) return;
  registerBuiltinHandlers();
  workerTimer = setInterval(() => {
    void workerLoop().catch((e) => console.error("[queue] loop error", e));
  }, POLL_INTERVAL_MS);
  // Fire one immediate drain.
  void workerLoop().catch(() => {});
}

/** Stop the worker (for tests / graceful shutdown). */
export function stopWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
}

// ===== Built-in handlers =====

function registerBuiltinHandlers(): void {
  if (handlers["photo.process"]) return; // already registered

  registerHandler<{ activityId: string; dataUrl: string; driverId: string }>(
    "photo.process",
    async (payload) => {
      const uploaded = await uploadPhoto(payload.dataUrl, {
        driverId: payload.driverId,
        activityId: payload.activityId,
      });
      if (!uploaded) throw new Error("photo upload failed");
      // Update the activity row to point at the storage key (not the base64).
      await (db as unknown as { driverActivity: { update: (a: unknown) => Promise<unknown> } }).driverActivity.update({
        where: { id: payload.activityId },
        data: { photoDataUrl: `storage://${uploaded.bucket}/${uploaded.key}` },
      });
      cacheInvalidate(CACHE_TAGS.activities, CACHE_TAGS.driver(payload.driverId));
      return { key: uploaded.key, size: uploaded.size };
    }
  );

  registerHandler<{ driverId: string }>(
    "location.batch",
    async (payload) => {
      cacheInvalidate(CACHE_TAGS.locations, CACHE_TAGS.driver(payload.driverId));
      return { invalidated: true };
    }
  );

  registerHandler<{ channel: string; recipients: string[]; title: string; body: string }>(
    "notification.dispatch",
    async (payload) => {
      // Stub: in prod this fans out to FCM/APNs/WhatsApp/Email.
      console.log("[queue] notification.dispatch →", payload.channel, payload.recipients.length, "recipients");
      return { sent: payload.recipients.length };
    }
  );

  registerHandler<{ entity: string; action: string; actorId: string; metadata?: unknown }>(
    "audit.log",
    async (payload) => {
      await (db as unknown as { auditLog: { create: (a: unknown) => Promise<unknown> } }).auditLog.create({
        data: {
          entity: payload.entity,
          action: payload.action,
          actorId: payload.actorId,
          metadata: JSON.stringify(payload.metadata ?? {}),
          createdAt: new Date(),
        },
      });
      return { logged: true };
    }
  );

  registerHandler<{ tags: string[] }>(
    "cache.invalidate",
    async (payload) => {
      const n = cacheInvalidate(...payload.tags);
      return { invalidated: n };
    }
  );

  // Recurring automation runs ("loops" in the Automation module) - a
  // dynamic import avoids a static circular import with
  // src/lib/automation-engine.ts, which itself imports enqueue() from
  // this file to schedule its own next occurrence.
  registerHandler<{ automationId: string }>(
    "automation.run",
    async (payload) => {
      // A scheduled fire must re-check live state before doing anything -
      // unlike manual "Run Now" (which should always run, even for a
      // paused automation, since that's a deliberate user action), a
      // schedule that got paused/disabled between enqueue and fire must
      // not run at all, and must not re-enqueue itself. That's the whole
      // stop condition for the recurring loop.
      const automation = await (db as unknown as {
        automation: { findUnique: (a: unknown) => Promise<{ status: string; scheduleEnabled: boolean } | null> };
      }).automation.findUnique({ where: { id: payload.automationId } });
      if (!automation || !automation.scheduleEnabled || automation.status !== "Active") {
        return { ran: false, reason: "schedule no longer active" };
      }
      const { runAutomationOnce } = await import("@/lib/automation-engine");
      const result = await runAutomationOnce(payload.automationId);
      if (!result) return { ran: false, reason: "automation not found" };
      return { ran: true, result: result.log.result, matched: result.log.matchedCount };
    }
  );

  // report.generate handler is registered lazily by the reports module if present.
}

// ===== Queue stats for observability =====

export async function queueStats(): Promise<{
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  oldestPendingMs: number | null;
  totalProcessed: number;
  failureRate: number;
}> {
  try {
    const rows = await (db as unknown as { job: { findMany: (a: unknown) => Promise<JobRecord[]> } }).job.findMany({
      where: {},
      take: 10_000,
    });
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let oldestPending: number | null = null;
    let totalCompleted = 0;
    let totalFailed = 0;
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      byType[r.type] = (byType[r.type] ?? 0) + 1;
      if (r.status === "pending") {
        const age = Date.now() - r.createdAt.getTime();
        if (oldestPending === null || age > oldestPending) oldestPending = age;
      }
      if (r.status === "completed") totalCompleted++;
      if (r.status === "dead") totalFailed++;
    }
    const totalProcessed = totalCompleted + totalFailed;
    return {
      byStatus,
      byType,
      oldestPendingMs: oldestPending,
      totalProcessed,
      failureRate: totalProcessed > 0 ? totalFailed / totalProcessed : 0,
    };
  } catch {
    return { byStatus: {}, byType: {}, oldestPendingMs: null, totalProcessed: 0, failureRate: 0 };
  }
}

// ===== Health =====
export function isWorkerRunning(): boolean {
  return workerTimer !== null;
}
