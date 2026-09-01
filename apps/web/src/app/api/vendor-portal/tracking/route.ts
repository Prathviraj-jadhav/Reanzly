import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// GET /api/vendor-portal/tracking
// Real live-tracking view for this portal session's linked Customer's
// in-transit trips, replacing buildLiveTrips()'s fully synthesized speed/
// GPS/signal/battery fields. Real telemetry comes from DriverLocationPing
// (fed by the driver field app) - the latest ping per driver stands in for
// "current location". Trips with no ping yet (driver hasn't sent a GPS
// update) are still listed, with location fields left blank rather than
// fabricated - an honest partial result, not a fake one.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  const trips = await db.trip.findMany({
    where: { customerId: customer!.id, status: { in: ["Active", "In Transit", "Planned"] } },
    include: {
      vehicle: { select: { name: true, licensePlate: true } },
      driver: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const liveTrips = await Promise.all(
    trips.map(async (t) => {
      const ping = t.driverId
        ? await db.driverLocationPing.findFirst({ where: { driverId: t.driverId }, orderBy: { createdAt: "desc" } })
        : null;
      const now = Date.now();
      const pingAgeMin = ping ? (now - ping.createdAt.getTime()) / 60000 : null;
      const signal = pingAgeMin == null ? "Offline" : pingAgeMin <= 5 ? "Live" : pingAgeMin <= 30 ? "Stale" : "Offline";
      return {
        tripId: t.tripId,
        lrNumber: t.lrNumber,
        origin: t.origin,
        destination: t.destination,
        vehicleName: t.vehicle?.name ?? "Unassigned",
        vehiclePlate: t.vehicle?.licensePlate ?? "",
        driverName: t.driver?.name ?? "Unassigned",
        driverPhone: t.driver?.phone ?? "",
        lastLocation: ping?.address ?? "",
        lastUpdate: ping ? ping.createdAt.toISOString() : "",
        speedKph: ping?.speed ?? 0,
        etaIso: t.expectedDelivery ? t.expectedDelivery.toISOString() : "",
        progressPct: t.status === "Delivered" ? 100 : t.status === "Planned" ? 0 : 50,
        status: t.status,
        gps: ping ? { lat: ping.lat, lng: ping.lng } : undefined,
        signal,
        batteryPct: ping?.battery ?? undefined,
      };
    }),
  );

  return NextResponse.json({ liveTrips });
}
