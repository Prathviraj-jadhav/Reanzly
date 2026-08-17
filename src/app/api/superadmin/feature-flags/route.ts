import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logSuperadminAudit } from "@/lib/superadmin-audit";
import { requireSuperadmin } from "@/lib/permissions";

// Mirrors the id/defaultOn pairs from components/modules/superadmin/_data.ts's
// MODULES (client-only "use client" module, not importable into a server
// route) - only id + defaultOn are needed here; label/description stay
// client-side where they're actually rendered.
const MODULE_DEFAULTS: { id: string; defaultOn: boolean }[] = [
  { id: "fleet", defaultOn: true },
  { id: "trips", defaultOn: true },
  { id: "customers", defaultOn: true },
  { id: "vendors", defaultOn: true },
  { id: "invoices", defaultOn: true },
  { id: "pod", defaultOn: true },
  { id: "financial-ops", defaultOn: true },
  { id: "rate-cards", defaultOn: true },
  { id: "inspection", defaultOn: false },
  { id: "issues", defaultOn: false },
  { id: "maintenance", defaultOn: false },
  { id: "fuel-energy", defaultOn: false },
  { id: "documents", defaultOn: true },
  { id: "chat", defaultOn: true },
  { id: "reports", defaultOn: true },
  { id: "access-matrix", defaultOn: true },
  { id: "automation", defaultOn: false },
  { id: "driver-field", defaultOn: true },
];

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  const existing = await db.superadminFeatureFlag.findMany();
  const byModule = new Map(existing.map((f) => [f.moduleId, f.enabled]));
  const flags: Record<string, boolean> = {};
  for (const m of MODULE_DEFAULTS) {
    flags[m.id] = byModule.has(m.id) ? byModule.get(m.id)! : m.defaultOn;
  }
  return NextResponse.json({ flags });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const moduleId = String(body.moduleId || "");
  const enabled = !!body.enabled;
  const mod = MODULE_DEFAULTS.find((m) => m.id === moduleId);
  if (!mod) return NextResponse.json({ error: "Unknown module." }, { status: 400 });

  await db.superadminFeatureFlag.upsert({
    where: { moduleId },
    update: { enabled },
    create: { moduleId, enabled },
  });
  await logSuperadminAudit({
    actor: auth.name,
    action: `${enabled ? "Enabled" : "Disabled"} module · ${moduleId}`,
    target: "Platform-wide",
    module: "Settings",
  });
  return NextResponse.json({ moduleId, enabled });
}
