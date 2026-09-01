import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

// Real CRUD for the Vehicles module, replacing what was previously pure
// client-side state seeded from src/lib/mock-data.ts's VEHICLES array
// (edits vanished on reload, nothing was shared across users/devices).
// companyId is always derived from the verified session, never trusted
// from the request body - the same pattern every other write route in
// this app already follows (chat, calls, profile).

function toVehicleDTO(v: {
  id: string; name: string; year: number | null; make: string | null; model: string | null;
  vin: string | null; status: string; type: string | null; group: string | null;
  currentMeter: number; licensePlate: string; watchers: string; operator: string | null;
  fuelType: string; ownership: string; location: string | null; distanceThisPeriod: number;
  gpsSpeed: number | null; lastGpsUpdate: Date | null; assignedTripId: string | null;
}) {
  let watchers: string[] = [];
  try {
    watchers = JSON.parse(v.watchers);
  } catch {
    watchers = [];
  }
  return {
    id: v.id,
    name: v.name,
    year: v.year ?? new Date().getFullYear(),
    make: v.make ?? "",
    model: v.model ?? "",
    vin: v.vin ?? "",
    status: v.status,
    type: v.type ?? "",
    group: v.group ?? "",
    currentMeter: v.currentMeter,
    licensePlate: v.licensePlate,
    watchers,
    operator: v.operator ?? "-",
    fuelType: v.fuelType,
    ownership: v.ownership,
    location: v.location ?? undefined,
    distanceThisPeriod: v.distanceThisPeriod,
    gpsSpeed: v.gpsSpeed ?? undefined,
    lastGpsUpdate: v.lastGpsUpdate ? v.lastGpsUpdate.toISOString() : undefined,
    assignedTripId: v.assignedTripId ?? undefined,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "vehicles");
  if (denied) return denied;
  const vehicles = await db.vehicle.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ vehicles: vehicles.map(toVehicleDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "vehicles");
  if (denied) return denied;

  const body = await req.json();
  const name = String(body.name || "").trim();
  const licensePlate = String(body.licensePlate || "").trim();
  if (!name || !licensePlate) {
    return NextResponse.json({ error: "name and licensePlate are required." }, { status: 400 });
  }

  try {
    const created = await db.vehicle.create({
      data: {
        companyId: sessionUser.companyId,
        name,
        licensePlate,
        vin: body.vin || null,
        make: body.make || null,
        model: body.model || null,
        year: Number.isFinite(body.year) ? body.year : null,
        type: body.type || null,
        group: body.group || null,
        status: body.status || "Idle",
        ownership: body.ownership || "Owned",
        fuelType: body.fuelType || "Diesel",
        currentMeter: Number.isFinite(body.currentMeter) ? body.currentMeter : 0,
        location: body.location || null,
        operator: body.operator || null,
        watchers: JSON.stringify(Array.isArray(body.watchers) ? body.watchers : []),
      },
    });
    return NextResponse.json({ vehicle: toVehicleDTO(created) }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "A vehicle with that license plate already exists." }, { status: 409 });
    }
    console.error("POST /api/vehicles error:", e);
    return NextResponse.json({ error: "Could not create vehicle." }, { status: 500 });
  }
}
