import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

function toDTO(f: {
  id: string; date: Date; station: string | null; fuelType: string; quantity: number;
  unitPrice: number; totalCost: number; odometer: number; efficiency: number | null;
  anomaly: boolean; anomalyNote: string | null;
  vehicle: { name: string } | null; driver: { name: string } | null;
}) {
  return {
    id: f.id,
    date: f.date.toISOString(),
    vehicle: f.vehicle?.name ?? "Unassigned",
    driver: f.driver?.name ?? undefined,
    station: f.station ?? "",
    fuelType: f.fuelType,
    quantity: f.quantity,
    unitPrice: f.unitPrice,
    totalCost: f.totalCost,
    odometer: f.odometer,
    efficiency: f.efficiency ?? 0,
    anomaly: f.anomaly,
    anomalyNote: f.anomalyNote ?? undefined,
  };
}

const INCLUDE = { vehicle: { select: { name: true } }, driver: { select: { name: true } } } as const;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const entries = await db.fuelEntry.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ fuelEntries: entries.map(toDTO) });
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

  const created = await db.fuelEntry.create({
    data: {
      companyId: sessionUser.companyId,
      vehicleId: matchedVehicle?.id ?? null,
      driverId: matchedDriver?.id ?? null,
      date: body.date ? new Date(body.date) : new Date(),
      fuelType: body.fuelType || "Diesel",
      quantity: Number.isFinite(body.quantity) ? body.quantity : 0,
      unitPrice: Number.isFinite(body.unitPrice) ? body.unitPrice : 0,
      totalCost: Number.isFinite(body.totalCost) ? body.totalCost : 0,
      odometer: Number.isFinite(body.odometer) ? body.odometer : 0,
      efficiency: Number.isFinite(body.efficiency) ? body.efficiency : null,
      station: body.station || null,
      anomaly: !!body.anomaly,
      anomalyNote: body.anomalyNote || null,
    },
    include: INCLUDE,
  });
  return NextResponse.json({ fuelEntry: toDTO(created) }, { status: 201 });
}
