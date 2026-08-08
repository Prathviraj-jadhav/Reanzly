import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIP, rateLimit } from "@/lib/security";
import { ALL_PROVIDERS } from "@/components/modules/integrations/_data";

/* ============================================================
   /api/integrations/[id]/sync  (POST)
   ------------------------------------------------------------
   Trigger an on-demand DB sync for a single connection.
   The endpoint is non-blocking:
     1. Looks up the connection row.
     2. Validates the provider supports sync (has syncConfig).
     3. Creates an IntegrationSyncLog row with status=pending.
     4. Returns 202 Accepted immediately with the sync log id.
     5. (In production) hands off to a background worker that
        runs the actual sync logic per provider.
   For this demo we simulate the worker inline: sleep ~1.2s,
   mark the log as ok/error, and update the connection's
   lastSyncAt/Status fields.
   ============================================================ */

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 60; // sync is heavier - tighter limit

/** Deterministic record count based on provider's typicalRecordsPerSync. */
function computeRecordCounts(providerId: string): { pulled: number; pushed: number } {
  const provider = ALL_PROVIDERS.find((p) => p.id === providerId);
  const typical = provider?.syncConfig?.typicalRecordsPerSync ?? 10;
  return {
    pulled: Math.max(1, Math.round(typical * (0.7 + Math.random() * 0.5))),
    pushed: Math.round(typical * (0.2 + Math.random() * 0.15)),
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ip = getClientIP(req);
    const rl = rateLimit(ip, { limit: RATE_LIMIT_MAX, window: RATE_LIMIT_WINDOW });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const syncType: "scheduled" | "manual" | "webhook-triggered" =
      body?.syncType === "scheduled" || body?.syncType === "webhook-triggered"
        ? body.syncType
        : "manual";

    const conn = await db.integrationConnection.findUnique({ where: { id } });
    if (!conn) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 },
      );
    }

    const provider = ALL_PROVIDERS.find((p) => p.id === conn.providerId);
    if (!provider) {
      return NextResponse.json(
        { error: `Unknown provider: ${conn.providerId}` },
        { status: 400 },
      );
    }

    if (!provider.syncConfig) {
      return NextResponse.json(
        {
          error: `${provider.name} doesn't support sync. It's a fire-and-forget integration (webhooks only).`,
        },
        { status: 400 },
      );
    }

    // Create the sync log row (status=pending).
    const startedAt = new Date();
    const syncLog = await db.integrationSyncLog.create({
      data: {
        connectionId: conn.id,
        providerId: conn.providerId,
        companyId: conn.companyId,
        syncType,
        status: "running",
        recordsPulled: 0,
        recordsPushed: 0,
        startedAt,
      },
    });

    // Simulate the actual sync work. Real implementations would dispatch to a queue.
    const delay = provider.syncConfig.frequency === "real-time" ? 700 : 1100 + Math.random() * 800;
    await new Promise((r) => setTimeout(r, delay));

    const isError = Math.random() < (provider.syncConfig.frequency === "real-time" ? 0.04 : 0.08);
    const { pulled, pushed } = isError ? { pulled: 0, pushed: 0 } : computeRecordCounts(conn.providerId);
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await db.integrationSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: isError ? "error" : "ok",
        recordsPulled: pulled,
        recordsPushed: pushed,
        durationMs,
        completedAt,
        errorMessage: isError ? "503 Service Unavailable from upstream portal" : null,
        errorDetails: isError
          ? JSON.stringify({
              upstream: provider.docsUrl,
              httpStatus: 503,
              retryable: true,
              suggestedAction: "Auto-retry in 5 minutes",
            })
          : null,
      },
    });

    // Update the connection's lastSync telemetry.
    const message = isError
      ? "Sync failed - upstream returned 503 (service unavailable)"
      : `${pulled} records pulled · ${pushed} pushed · ${durationMs}ms`;
    await db.integrationConnection.update({
      where: { id: conn.id },
      data: {
        lastSyncAt: completedAt,
        lastSyncStatus: isError ? "error" : "ok",
        lastSyncMessage: message,
      },
    });

    return NextResponse.json({
      syncLogId: syncLog.id,
      connectionId: conn.id,
      providerId: conn.providerId,
      syncType,
      status: isError ? "error" : "ok",
      recordsPulled: pulled,
      recordsPushed: pushed,
      durationMs,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      message,
      errorMessage: isError ? "503 Service Unavailable from upstream portal" : undefined,
    });
  } catch (err) {
    console.error("[/api/integrations/[id]/sync POST]", err);
    return NextResponse.json(
      { error: "Failed to trigger sync" },
      { status: 500 },
    );
  }
}

/** GET - list the last 10 sync logs for a connection. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ip = getClientIP(req);
    const rl = rateLimit(ip, { limit: 120, window: RATE_LIMIT_WINDOW });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const { id } = await params;
    const conn = await db.integrationConnection.findUnique({ where: { id } });
    if (!conn) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 },
      );
    }

    const logs = await db.integrationSyncLog.findMany({
      where: { connectionId: id },
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      connectionId: id,
      providerId: conn.providerId,
      logs: logs.map((l) => ({
        id: l.id,
        syncType: l.syncType,
        status: l.status,
        recordsPulled: l.recordsPulled,
        recordsPushed: l.recordsPushed,
        durationMs: l.durationMs,
        startedAt: l.startedAt.toISOString(),
        completedAt: l.completedAt?.toISOString() ?? null,
        errorMessage: l.errorMessage,
        errorDetails: l.errorDetails ? JSON.parse(l.errorDetails) : null,
      })),
      count: logs.length,
    });
  } catch (err) {
    console.error("[/api/integrations/[id]/sync GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch sync logs" },
      { status: 500 },
    );
  }
}
