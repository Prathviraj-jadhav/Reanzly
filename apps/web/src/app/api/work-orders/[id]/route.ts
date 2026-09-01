import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const EDITABLE_FIELDS = [
  "title", "type", "priority", "status", "vendor", "technician",
  "estimatedCost", "actualCost",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "maintenance");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.workOrder.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Work order not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  if ("estimatedCompletion" in body) {
    data.estimatedCompletion = body.estimatedCompletion ? new Date(body.estimatedCompletion) : null;
  }
  if ("vehicle" in body) {
    const vehicleName = String(body.vehicle || "").trim();
    const matched = vehicleName
      ? await db.vehicle.findFirst({ where: { companyId: sessionUser.companyId, name: vehicleName } })
      : null;
    data.vehicleId = matched?.id ?? null;
  }

  const updated = await db.workOrder.update({
    where: { id },
    data,
    include: { vehicle: { select: { name: true } } },
  });

  return NextResponse.json({
    workOrder: {
      id: updated.id,
      workOrderId: updated.workOrderId,
      title: updated.title,
      vehicle: updated.vehicle?.name ?? "Unassigned",
      type: updated.type,
      priority: updated.priority,
      vendor: updated.vendor ?? undefined,
      technician: updated.technician ?? undefined,
      status: updated.status,
      createdDate: updated.createdDate.toISOString(),
      estimatedCompletion: updated.estimatedCompletion ? updated.estimatedCompletion.toISOString() : undefined,
      actualCost: updated.actualCost ?? undefined,
      estimatedCost: updated.estimatedCost,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "maintenance");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.workOrder.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Work order not found." }, { status: 404 });
  }

  await db.workOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
