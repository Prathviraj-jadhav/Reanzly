import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Real per-vehicle ServiceProgram instances (as opposed to the reusable
// ServiceTemplate a program is created from). Backs the Services module's
// "Service Due" tab. There's currently no UI that links a template to a
// vehicle (creates one of these rows), so this legitimately returns an
// empty list until that flow exists - shown as a real empty state rather
// than the old mock's fabricated per-vehicle cycling of SERVICE_PROGRAMS.

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const instances = await db.serviceProgram.findMany({
    where: { companyId: sessionUser.companyId },
    include: { vehicle: { select: { id: true, name: true, licensePlate: true, currentMeter: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const now = Date.now();
  const dueItems = instances.map((p) => {
    const kmRemaining = p.nextDueKm != null ? p.nextDueKm - p.vehicle.currentMeter : null;
    const daysRemaining = p.nextDueAt != null ? Math.round((p.nextDueAt.getTime() - now) / 86400000) : null;
    const status =
      (kmRemaining != null && kmRemaining <= 0) || (daysRemaining != null && daysRemaining <= 0)
        ? "Due Now"
        : (kmRemaining != null && p.intervalKm && kmRemaining <= p.intervalKm * 0.1) || (daysRemaining != null && daysRemaining <= 7)
          ? "Due Soon"
          : "Upcoming";
    return {
      id: p.id,
      vehicleId: p.vehicleId,
      vehicleName: p.vehicle.name,
      licensePlate: p.vehicle.licensePlate,
      programName: p.name,
      serviceType: p.type,
      lastServiceDate: p.lastDoneAt ? p.lastDoneAt.toISOString() : undefined,
      lastServiceOdometer: p.lastDoneKm ?? undefined,
      currentOdometer: p.vehicle.currentMeter,
      intervalValue: p.intervalKm ?? p.intervalDays ?? 0,
      intervalUnit: p.intervalKm ? "km" : "days",
      kmRemaining: kmRemaining ?? 0,
      daysRemaining: daysRemaining ?? 0,
      status,
    };
  });

  return NextResponse.json({ dueItems });
}
