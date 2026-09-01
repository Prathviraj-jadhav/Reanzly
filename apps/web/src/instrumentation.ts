// ===== Server bootstrap (runs once when the Next.js server starts) =====
// Starts the job-queue worker so durable async jobs (photo processing,
// location batching, notifications, audit logging) begin draining immediately.
// Idempotent - safe if called again.

export async function register() {
  // Only run on the server (not during the client build).
  if (typeof window !== "undefined") return;
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { startWorker, startAlertScan } = await import("./lib/queue");
    startWorker();
    console.log("[instrumentation] queue worker started");
    await startAlertScan();
    console.log("[instrumentation] alert-scan loop started");
  } catch (err) {
    // Non-fatal: the worker can also be started lazily by /api/health.
    console.warn("[instrumentation] queue worker start failed", err);
  }
}
