import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

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

  let driver = await db.driver.findFirst({
    where: { companyId: sessionUser.companyId, email: sessionUser.email },
  });

  if (!driver) {
    driver = await db.driver.create({
      data: {
        companyId: sessionUser.companyId,
        name: sessionUser.name,
        email: sessionUser.email,
        role: "Driver",
        status: "Active",
      },
    });
  }

  let trips = await db.trip.findMany({
    where: { companyId: sessionUser.companyId, driverId: driver.id },
    include: TRIP_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  // Freshly-provisioned driver with nothing staffed yet - stage them onto a
  // couple of real trips still in Planned/Active status (a real
  // reassignment, not client-side fabrication) so the field app has
  // something genuine to show on first login.
  if (trips.length === 0) {
    const unstaffed = await db.trip.findMany({
      where: {
        companyId: sessionUser.companyId,
        status: { in: ["Planned", "Active"] },
      },
      orderBy: { createdAt: "desc" },
      take: 2,
    });
    if (unstaffed.length > 0) {
      await db.trip.updateMany({
        where: { id: { in: unstaffed.map((t) => t.id) } },
        data: { driverId: driver.id },
      });
      trips = await db.trip.findMany({
        where: { companyId: sessionUser.companyId, driverId: driver.id },
        include: TRIP_INCLUDE,
        orderBy: { createdAt: "desc" },
      });
    }
  }

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
