import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const EDITABLE_FIELDS = [
  "fuelType", "quantity", "unitPrice", "totalCost", "odometer", "efficiency",
  "station", "anomaly", "anomalyNote",
] as const;

const INCLUDE = { vehicle: { select: { name: true } }, driver: { select: { name: true } } } as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "fuel-energy");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.fuelEntry.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Fuel entry not found." }, { status: 404 });
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

  const updated = await db.fuelEntry.update({ where: { id }, data, include: INCLUDE });
  return NextResponse.json({
    fuelEntry: {
      id: updated.id,
      date: updated.date.toISOString(),
      vehicle: updated.vehicle?.name ?? "Unassigned",
      driver: updated.driver?.name ?? undefined,
      station: updated.station ?? "",
      fuelType: updated.fuelType,
      quantity: updated.quantity,
      unitPrice: updated.unitPrice,
      totalCost: updated.totalCost,
      odometer: updated.odometer,
      efficiency: updated.efficiency ?? 0,
      anomaly: updated.anomaly,
      anomalyNote: updated.anomalyNote ?? undefined,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "fuel-energy");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.fuelEntry.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Fuel entry not found." }, { status: 404 });
  }

  await db.fuelEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
