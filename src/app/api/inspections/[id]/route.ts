import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const EDITABLE_FIELDS = ["type", "inspector", "result", "odometer"] as const;
const INCLUDE = { vehicle: { select: { name: true } }, driver: { select: { name: true } } } as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "inspection");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.inspection.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Inspection not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  if ("vehicle" in body) {
    const name = String(body.vehicle || "").trim();
    const matched = name ? await db.vehicle.findFirst({ where: { companyId: sessionUser.companyId, name } }) : null;
    data.vehicleId = matched?.id ?? null;
  }
  if ("driver" in body) {
    const name = String(body.driver || "").trim();
    const matched = name ? await db.driver.findFirst({ where: { companyId: sessionUser.companyId, name } }) : null;
    data.driverId = matched?.id ?? null;
  }

  const updated = await db.inspection.update({ where: { id }, data, include: INCLUDE });
  return NextResponse.json({
    inspection: {
      id: updated.id,
      inspectionId: updated.inspectionId,
      type: updated.type,
      vehicle: updated.vehicle?.name ?? "Unassigned",
      driver: updated.driver?.name ?? undefined,
      inspector: updated.inspector,
      date: updated.date.toISOString(),
      result: updated.result,
      odometer: updated.odometer,
      linkedIssues: 0,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "inspection");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.inspection.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Inspection not found." }, { status: 404 });
  }

  await db.inspection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
