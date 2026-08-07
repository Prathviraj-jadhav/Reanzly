import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

function toDTO(i: {
  id: string; inspectionId: string; type: string; inspector: string; date: Date;
  result: string; odometer: number; vehicle: { name: string } | null; driver: { name: string } | null;
}) {
  return {
    id: i.id,
    inspectionId: i.inspectionId,
    type: i.type,
    vehicle: i.vehicle?.name ?? "Unassigned",
    driver: i.driver?.name ?? undefined,
    inspector: i.inspector,
    date: i.date.toISOString(),
    result: i.result,
    odometer: i.odometer,
    linkedIssues: 0,
  };
}

const INCLUDE = { vehicle: { select: { name: true } }, driver: { select: { name: true } } } as const;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const inspections = await db.inspection.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ inspections: inspections.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const vehicleName = String(body.vehicle || "").trim();
  if (!vehicleName) return NextResponse.json({ error: "vehicle is required." }, { status: 400 });

  const matchedVehicle = await db.vehicle.findFirst({ where: { companyId: sessionUser.companyId, name: vehicleName } });
  const driverName = String(body.driver || "").trim();
  const matchedDriver = driverName
    ? await db.driver.findFirst({ where: { companyId: sessionUser.companyId, name: driverName } })
    : null;

  const inspectionId = body.inspectionId?.trim() || `INS-${Date.now()}`;

  try {
    const created = await db.inspection.create({
      data: {
        companyId: sessionUser.companyId,
        inspectionId,
        vehicleId: matchedVehicle?.id ?? null,
        driverId: matchedDriver?.id ?? null,
        type: body.type || "Pre-Trip",
        inspector: body.inspector || "Unknown",
        date: body.date ? new Date(body.date) : new Date(),
        result: body.result || "Pass",
        odometer: Number.isFinite(body.odometer) ? body.odometer : 0,
      },
      include: INCLUDE,
    });
    return NextResponse.json({ inspection: toDTO(created) }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "An inspection with that ID already exists." }, { status: 409 });
    }
    console.error("POST /api/inspections error:", e);
    return NextResponse.json({ error: "Could not create inspection." }, { status: 500 });
  }
}
