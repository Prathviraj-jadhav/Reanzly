import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const EDITABLE_FIELDS = [
  "name", "make", "model", "year", "vin", "licensePlate", "status", "type",
  "group", "fuelType", "ownership", "operator", "currentMeter", "location",
  "watchers", "distanceThisPeriod", "gpsSpeed", "assignedTripId",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.vehicle.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (!(field in body)) continue;
    if (field === "watchers") {
      data.watchers = JSON.stringify(Array.isArray(body.watchers) ? body.watchers : []);
    } else {
      data[field] = body[field];
    }
  }

  try {
    const updated = await db.vehicle.update({ where: { id }, data });
    let watchers: string[] = [];
    try {
      watchers = JSON.parse(updated.watchers);
    } catch {
      watchers = [];
    }
    return NextResponse.json({
      vehicle: {
        id: updated.id,
        name: updated.name,
        year: updated.year ?? new Date().getFullYear(),
        make: updated.make ?? "",
        model: updated.model ?? "",
        vin: updated.vin ?? "",
        status: updated.status,
        type: updated.type ?? "",
        group: updated.group ?? "",
        currentMeter: updated.currentMeter,
        licensePlate: updated.licensePlate,
        watchers,
        operator: updated.operator ?? "-",
        fuelType: updated.fuelType,
        ownership: updated.ownership,
        location: updated.location ?? undefined,
        distanceThisPeriod: updated.distanceThisPeriod,
        gpsSpeed: updated.gpsSpeed ?? undefined,
        lastGpsUpdate: updated.lastGpsUpdate ? updated.lastGpsUpdate.toISOString() : undefined,
        assignedTripId: updated.assignedTripId ?? undefined,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "A vehicle with that license plate already exists." }, { status: 409 });
    }
    console.error("PATCH /api/vehicles/[id] error:", e);
    return NextResponse.json({ error: "Could not update vehicle." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.vehicle.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  }

  await db.vehicle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
