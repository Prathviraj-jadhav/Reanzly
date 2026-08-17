import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logSuperadminAudit } from "@/lib/superadmin-audit";
import { requireSuperadmin } from "@/lib/permissions";

const DEFAULTS: Record<string, { label: string; provider: string; fromAddress: string }> = {
  email: { label: "Email Gateway", provider: "Amazon SES (Mumbai region)", fromAddress: "no-reply@reanzly.com" },
  sms: { label: "SMS Gateway", provider: "Karix (transactional)", fromAddress: "REANZLY" },
};

function toDTO(g: {
  id: string; label: string; provider: string; fromAddress: string; enabled: boolean;
  lastTestAt: Date | null; lastTestStatus: string | null;
}) {
  return {
    id: g.id,
    label: g.label,
    provider: g.provider,
    fromAddress: g.fromAddress,
    enabled: g.enabled,
    lastTestAt: g.lastTestAt ? g.lastTestAt.toISOString() : undefined,
    lastTestStatus: g.lastTestStatus ?? undefined,
  };
}

async function ensureSeeded() {
  for (const id of ["email", "sms"]) {
    const existing = await db.superadminGateway.findUnique({ where: { id } });
    if (!existing) {
      const d = DEFAULTS[id];
      await db.superadminGateway.create({ data: { id, label: d.label, provider: d.provider, fromAddress: d.fromAddress, enabled: true } });
    }
  }
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  await ensureSeeded();
  const gateways = await db.superadminGateway.findMany();
  return NextResponse.json({ gateways: gateways.map(toDTO) });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const id = String(body.id || "");
  if (id !== "email" && id !== "sms") {
    return NextResponse.json({ error: "Unknown gateway." }, { status: 400 });
  }
  await ensureSeeded();

  const data: Record<string, unknown> = {};
  if (typeof body.provider === "string") data.provider = body.provider;
  if (typeof body.fromAddress === "string") data.fromAddress = body.fromAddress;
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;

  if (body.action === "test") {
    const gw = await db.superadminGateway.findUnique({ where: { id } });
    const ok = !!gw?.enabled && !!gw?.provider && !!gw?.fromAddress;
    data.lastTestAt = new Date();
    data.lastTestStatus = ok ? "ok" : "fail";
  }

  const updated = await db.superadminGateway.update({ where: { id }, data });

  if (body.action === "test") {
    await logSuperadminAudit({
      actor: auth.name,
      action: `Tested ${id === "email" ? "email" : "SMS"} gateway`,
      target: `${updated.provider} · ${updated.fromAddress}`,
      module: "Settings",
    });
  } else if (typeof body.enabled === "boolean") {
    await logSuperadminAudit({
      actor: auth.name,
      action: `${body.enabled ? "Enabled" : "Disabled"} ${id} gateway`,
      target: updated.provider,
      module: "Settings",
    });
  }

  return NextResponse.json({ gateway: toDTO(updated) });
}
