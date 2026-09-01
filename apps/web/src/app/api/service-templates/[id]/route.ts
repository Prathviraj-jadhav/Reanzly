import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const EDITABLE_FIELDS = [
  "name", "vehicleType", "serviceType", "triggerType", "intervalValue",
  "intervalUnit", "defaultVendor", "status",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "services");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.serviceTemplate.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Service template not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  if ("estDurationHours" in body) {
    data.estDurationHours = Number.isFinite(body.estDurationHours) ? body.estDurationHours : null;
  }
  if ("estCost" in body) {
    data.estCostPaise = Number.isFinite(body.estCost) ? Math.round(body.estCost * 100) : null;
  }
  if (Array.isArray(body.tasks)) {
    data.tasksJson = JSON.stringify(
      body.tasks.map((t: any, i: number) =>
        typeof t === "string" ? { id: `t-${Date.now().toString(36)}-${i}`, text: t } : t,
      ),
    );
  }

  const updated = await db.serviceTemplate.update({
    where: { id },
    data,
    include: { _count: { select: { instances: true } } },
  });

  return NextResponse.json({
    template: {
      id: updated.id,
      name: updated.name,
      vehicleType: updated.vehicleType,
      serviceType: updated.serviceType,
      triggerType: updated.triggerType,
      intervalValue: updated.intervalValue,
      intervalUnit: updated.intervalUnit,
      linkedVehicles: updated._count.instances,
      tasks: JSON.parse(updated.tasksJson || "[]"),
      defaultVendor: updated.defaultVendor ?? "",
      estDurationHours: updated.estDurationHours ?? 0,
      estCost: updated.estCostPaise != null ? updated.estCostPaise / 100 : 0,
      lastUpdated: updated.updatedAt.toISOString(),
      status: updated.status,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "services");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.serviceTemplate.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Service template not found." }, { status: 404 });
  }

  await db.serviceTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
