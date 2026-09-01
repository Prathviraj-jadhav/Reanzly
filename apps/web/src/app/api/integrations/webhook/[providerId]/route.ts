import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIP, rateLimit } from "@/lib/security";
import { verifyWebhookSignature } from "@/lib/integrations/webhook-verify";
import { ALL_PROVIDERS } from "@/components/modules/integrations/_data";

/* Universal webhook receiver — signature verification required before mutations. */

const RATE_LIMIT_WINDOW = 10_000;
const RATE_LIMIT_MAX = 500;

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

    const raw = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

    const verification = verifyWebhookSignature(providerId, headers, raw);
    if (!verification.ok) {
      return NextResponse.json(
        { error: "Webhook signature verification failed.", reason: verification.reason },
        { status: 401 },
      );
    }

    const eventType =
      verification.eventType ||
      headers[`x-${providerId}-event`] ||
      headers["x-event-type"] ||
      "unknown";

    const signature =
      headers[`x-${providerId}-signature`] ||
      headers["x-signature"] ||
      headers["stripe-signature"] ||
      headers["x-razorpay-signature"] ||
      null;

    const connections = await db.integrationConnection.findMany({
      where: { providerId },
      take: 5,
    });

    if (connections.length === 0) {
      console.warn(`[webhook] Verified orphan payload for ${providerId} - no connection.`);
      return NextResponse.json({ received: true, orphan: true, verified: true });
    }

    const conn = connections[0];
    await db.integrationWebhookLog.create({
      data: {
        connectionId: conn.id,
        providerId,
        eventType,
        signature,
        payload: raw.slice(0, 65_535),
        processed: false,
      },
    });

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
      verified: true,
      providerId,
      eventType,
      connectionId: conn.id,
    });
  } catch (err) {
    console.error("[/api/integrations/webhook POST]", err);
    return NextResponse.json({ received: false, error: "internal" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> },
) {
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
