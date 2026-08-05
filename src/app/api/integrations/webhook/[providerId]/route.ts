import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIP, rateLimit } from "@/lib/security";
import { ALL_PROVIDERS } from "@/components/modules/integrations/_data";

/* ============================================================
   /api/integrations/webhook/[providerId]  (POST)
   ------------------------------------------------------------
   Universal webhook receiver for any connected provider.
   - Verifies the providerId is known.
   - Looks up the matching connection row(s) by providerId.
   - Stores the raw payload in IntegrationWebhookLog for replay.
   - Returns 200 OK quickly so the provider doesn't retry.
   In production, signature verification per-provider would happen
   here (Razorpay X-Razorpay-Signature, Stripe stripe-signature,
   Twilio X-Twilio-Signature, etc.) before persisting.
   ============================================================ */

const RATE_LIMIT_WINDOW = 10_000;
const RATE_LIMIT_MAX = 500; // webhooks can burst

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> },
) {
  try {
    const ip = getClientIP(req);
    const rl = rateLimit(ip, { limit: RATE_LIMIT_MAX, window: RATE_LIMIT_WINDOW });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": "10" } },
      );
    }

    const { providerId } = await params;
    const provider = ALL_PROVIDERS.find((p) => p.id === providerId);
    if (!provider) {
      return NextResponse.json(
        { error: `Unknown provider: ${providerId}` },
        { status: 404 },
      );
    }

    // Read raw body and headers.
    const raw = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

    const eventType = headers[`x-${providerId}-event`] ||
                      headers["x-event-type"] ||
                      "unknown";

    const signature =
      headers[`x-${providerId}-signature`] ||
      headers["x-signature"] ||
      headers["stripe-signature"] ||
      headers["x-razorpay-signature"] ||
      null;

    // Look up the connection row(s).
    const connections = await db.integrationConnection.findMany({
      where: { providerId },
      take: 5,
    });

    if (connections.length === 0) {
      // No connection — log as orphan but acknowledge so provider doesn't retry.
      console.warn(`[webhook] Orphan payload for ${providerId} — no connection.`);
      return NextResponse.json({ received: true, orphan: true });
    }

    // Persist one webhook log per matching connection (in multi-tenant,
    // we'd route by an identifier in the payload — for now, log to first).
    const conn = connections[0];
    await db.integrationWebhookLog.create({
      data: {
        connectionId: conn.id,
        providerId,
        eventType,
        signature,
        payload: raw.slice(0, 65_535), // truncate huge payloads
        processed: false,
      },
    });

    // Update the connection's last sync telemetry.
    await db.integrationConnection.update({
      where: { id: conn.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "ok",
        lastSyncMessage: `Webhook received: ${eventType}`,
      },
    });

    return NextResponse.json({
      received: true,
      providerId,
      eventType,
      connectionId: conn.id,
    });
  } catch (err) {
    console.error("[/api/integrations/webhook POST]", err);
    // Still return 200 so providers don't retry aggressively.
    return NextResponse.json({ received: false, error: "internal" }, { status: 200 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> },
) {
  // Health check / docs URL endpoint.
  const { providerId } = await params;
  const provider = ALL_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) {
    return NextResponse.json({ error: `Unknown provider: ${providerId}` }, { status: 404 });
  }
  return NextResponse.json({
    provider: provider.name,
    category: provider.category,
    docsUrl: provider.docsUrl,
    webhookUrl: `/api/integrations/webhook/${providerId}`,
    instructions: `Configure this URL in your ${provider.name} dashboard under webhooks.`,
  });
}
