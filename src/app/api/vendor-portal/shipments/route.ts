import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// GET /api/vendor-portal/shipments
// Real Trip list scoped to this portal session's linked Customer, replacing
// VENDOR_TRIPS (TRIPS.slice(0,8)). Same base DTO shape as /api/trips (the
// vendor-shipments.tsx frontend types this as the shared `Trip` type from
// @/lib/types), plus a few extra real Vehicle/Driver fields the detail
// sheet needs - previously read via vehicleByName()/driverByName() lookups
// into the frozen VEHICLES/DRIVERS mock arrays, now inlined from the real
// relations so they can't go stale.
function toTripDTO(t: {
  id: string; tripId: string; lrNumber: string; consignor: string; consignee: string;
  origin: string; destination: string; vehicleId: string | null; driverId: string | null;
  status: string; createdDate: Date; expectedDelivery: Date | null; freightAmount: number;
  paymentStatus: string; orderMode: string; eWayBill: string | null; distanceKm: number;
  vehicle: { name: string; licensePlate: string; type: string | null; ownership: string; make: string | null; model: string | null } | null;
  driver: { name: string; phone: string | null; licenseNumber: string | null; rating: number; tripsCompleted: number; onTimeRate: number } | null;
  customer: { companyName: string } | null;
}) {
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
    freightAmount: t.freightAmount, // Trip.freightAmount is stored in rupees, not paise (matches /api/trips)
    paymentStatus: t.paymentStatus,
    orderMode: t.orderMode,
    eWayBill: t.eWayBill ?? undefined,
    distanceKm: t.distanceKm,
    customer: t.customer?.companyName ?? t.consignor,
    vehicleDetail: t.vehicle
      ? { licensePlate: t.vehicle.licensePlate, type: t.vehicle.type ?? "", ownership: t.vehicle.ownership, make: t.vehicle.make ?? "", model: t.vehicle.model ?? "" }
      : undefined,
    driverDetail: t.driver
      ? { phone: t.driver.phone ?? "", licenseNumber: t.driver.licenseNumber ?? "", rating: t.driver.rating, tripsCompleted: t.driver.tripsCompleted, onTimeRate: t.driver.onTimeRate }
      : undefined,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  const trips = await db.trip.findMany({
    where: { customerId: customer!.id },
    include: {
      vehicle: { select: { name: true, licensePlate: true, type: true, ownership: true, make: true, model: true } },
      driver: { select: { name: true, phone: true, licenseNumber: true, rating: true, tripsCompleted: true, onTimeRate: true } },
      customer: { select: { companyName: true } },
    },
    orderBy: { createdDate: "desc" },
  });
  return NextResponse.json({ trips: trips.map(toTripDTO) });
}
