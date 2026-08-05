import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIP, rateLimit, sanitize } from "@/lib/security";
import { ALL_PROVIDERS } from "@/components/modules/integrations/_data";

/* ============================================================
   /api/integrations/[id]  (PATCH, DELETE)
   ------------------------------------------------------------
   Update (re-mask secrets, set primary, set priority, set status)
   or delete a connection. On delete, promote the next-in-category
   connection to primary if the deleted one was primary.
   ============================================================ */

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 200;

const SECRET_FIELD_HINTS = [
  "secret", "password", "token", "apikey", "authkey",
  "apisecret", "clientsecret", "accesskey", "accesskeyid",
  "secretaccesskey", "privateapp", "workingkey", "salt",
];

function isSecretField(fieldId: string): boolean {
  return SECRET_FIELD_HINTS.some((h) => fieldId.toLowerCase().includes(h));
}

export async function PATCH(
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
    const body = await req.json();

    const existing = await db.integrationConnection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    const data: {
      label?: string | null;
      status?: string;
      mode?: string;
      priority?: number;
      isPrimary?: boolean;
      fieldValues?: string;
      lastSyncAt?: Date;
      lastSyncStatus?: string;
      lastSyncMessage?: string;
    } = {};

    if (typeof body.label === "string" || body.label === null) {
      data.label = body.label ? sanitize(body.label, 80) : null;
    }
    if (body.status) data.status = body.status;
    if (body.mode) data.mode = body.mode === "test" ? "test" : "live";
    if (typeof body.priority === "number") data.priority = body.priority;
    if (typeof body.isPrimary === "boolean") data.isPrimary = body.isPrimary;

    // If fieldValues is provided, re-mask secrets and merge.
    if (body.fieldValues && typeof body.fieldValues === "object") {
      const provider = ALL_PROVIDERS.find((p) => p.id === existing.providerId);
      let current: Record<string, string> = {};
      try {
        current = JSON.parse(existing.fieldValues || "{}");
      } catch {
        current = {};
      }
      const merged: Record<string, string> = { ...current };
      for (const [key, value] of Object.entries(body.fieldValues)) {
        if (typeof value !== "string") continue;
        // Skip masked values — user didn't change them.
        if (value.includes("••")) continue;
        const field = provider?.fields.find((f) => f.id === key);
        const isSecret = field?.secret ?? isSecretField(key);
        if (isSecret && !value) continue;
        merged[key] = value;
      }
      data.fieldValues = JSON.stringify(merged);
    }

    if (body.lastSyncStatus) {
      data.lastSyncAt = new Date();
      data.lastSyncStatus = body.lastSyncStatus;
      data.lastSyncMessage = body.lastSyncMessage || null;
    }

    // If promoting to primary, demote others in the same category.
    if (data.isPrimary === true) {
      await db.integrationConnection.updateMany({
        where: {
          companyId: existing.companyId,
          category: existing.category,
          NOT: { id: existing.id },
        },
        data: { isPrimary: false },
      });
    }

    const updated = await db.integrationConnection.update({
      where: { id },
      data,
    });

    return NextResponse.json({ connection: updated });
  } catch (err) {
    console.error("[/api/integrations/[id] PATCH]", err);
    return NextResponse.json(
      { error: "Failed to update integration." },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const existing = await db.integrationConnection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    await db.integrationConnection.delete({ where: { id } });

    // If the deleted one was primary, promote the next by priority.
    if (existing.isPrimary) {
      const next = await db.integrationConnection.findFirst({
        where: { companyId: existing.companyId, category: existing.category },
        orderBy: [{ priority: "asc" }, { connectedAt: "desc" }],
      });
      if (next) {
        await db.integrationConnection.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[/api/integrations/[id] DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete integration." },
      { status: 500 },
    );
  }
}
