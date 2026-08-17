import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { assignDemoTripsIfEmpty, ensureDriverForSession } from "@/lib/driver-session";

// Real identity + assignment resolver for the Driver Field App
// (src/components/modules/driver-field). Previously the field app used a
// hardcoded driverId ("drv-23") and filtered src/lib/mock-data.ts's TRIPS
// array client-side - every driver-role login saw the exact same fake trip
// regardless of who actually signed in, and the 15 real seeded Driver rows
// (seed-business-data.ts) had no link at all to the real seeded User
// accounts (seed-users.ts). This resolves the session user to a real
// Driver row (by email, self-healing by creating one on first login), and
// - if that driver has no trips yet - stages them onto 2 real Planned/Active
// trips borrowed from the unstaffed pool so a fresh driver login isn't empty.

const TRIP_INCLUDE = {
  vehicle: { select: { name: true } },
  driver: { select: { name: true } },
  customer: { select: { companyName: true } },
} as const;

function toTripDTO(t: any) {
  return {
    id: t.id,
    tripId: t.tripId,
    lrNumber: t.lrNumber,
    consignor: t.consignor,
    consignee: t.consignee,
    origin: t.origin,
    destination: t.destination,
    vehicleId: t.vehicleId ?? "",
    vehicleName: t.vehicle?.name ?? "Unassigned",
    driverId: t.driverId ?? "",
    driverName: t.driver?.name ?? "Unassigned",
    status: t.status,
    createdDate: t.createdDate.toISOString(),
    expectedDelivery: t.expectedDelivery ? t.expectedDelivery.toISOString() : "",
    freightAmount: t.freightAmount,
    paymentStatus: t.paymentStatus,
    orderMode: t.orderMode,
    eWayBill: t.eWayBill ?? undefined,
    distanceKm: t.distanceKm,
    customer: t.customer?.companyName ?? t.consignor,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const driver = await ensureDriverForSession(sessionUser);
  await assignDemoTripsIfEmpty(sessionUser.companyId, driver.id);

  const trips = await db.trip.findMany({
    where: { companyId: sessionUser.companyId, driverId: driver.id },
    include: TRIP_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    driver: {
      id: driver.id,
      name: driver.name,
      email: driver.email ?? "",
      phone: driver.phone ?? "",
      licenseNumber: driver.licenseNumber ?? "",
      rating: driver.rating,
      tripsCompleted: driver.tripsCompleted,
      onTimeRate: driver.onTimeRate,
    },
    trips: trips.map(toTripDTO),
  });
}
