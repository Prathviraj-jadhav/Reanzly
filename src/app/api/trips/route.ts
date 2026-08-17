import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess, forbidden } from "@/lib/permissions";
import { assignDemoTripsIfEmpty, ensureDriverForSession, isDriverRole } from "@/lib/driver-session";

// Real CRUD for the Trips module, replacing pure client-side state seeded
// from src/lib/mock-data.ts's TRIPS array. vehicleName/driverName/customer
// are resolved via real relations at read time rather than duplicated
// columns, so they can never go stale if the linked record changes.
// (Trip has no plain `customer` text column - only the `customer` relation
// via `customerId` - unlike Invoice, which does carry its own text
// snapshot. Matched here.)

function toTripDTO(t: {
  id: string; tripId: string; lrNumber: string; consignor: string; consignee: string;
  origin: string; destination: string; vehicleId: string | null; driverId: string | null;
  status: string; createdDate: Date; expectedDelivery: Date | null; freightAmount: number;
  paymentStatus: string; orderMode: string; eWayBill: string | null; distanceKm: number;
  vehicle: { name: string } | null; driver: { name: string } | null; customer: { companyName: string } | null;
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
    freightAmount: t.freightAmount,
    paymentStatus: t.paymentStatus,
    orderMode: t.orderMode,
    eWayBill: t.eWayBill ?? undefined,
    distanceKm: t.distanceKm,
    // No real customer link yet -> fall back to consignor, which is what
    // the create flow populates from the typed customer name anyway.
    customer: t.customer?.companyName ?? t.consignor,
  };
}

const TRIP_INCLUDE = {
  vehicle: { select: { name: true } },
  driver: { select: { name: true } },
  customer: { select: { companyName: true } },
} as const;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "trips");
  if (denied) return denied;
  const where: { companyId: string; driverId?: string } = { companyId: sessionUser.companyId };
  if (isDriverRole(sessionUser.role)) {
    const me = await ensureDriverForSession(sessionUser);
    await assignDemoTripsIfEmpty(sessionUser.companyId, me.id);
    where.driverId = me.id;
  }
  const trips = await db.trip.findMany({
    where,
    include: TRIP_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ trips: trips.map(toTripDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "trips");
  if (denied) return denied;
  if (isDriverRole(sessionUser.role)) {
    return forbidden("Drivers cannot create trips from this API.");
  }

  const body = await req.json();
  const origin = String(body.origin || "").trim();
  const destination = String(body.destination || "").trim();
  if (!origin || !destination) {
    return NextResponse.json({ error: "origin and destination are required." }, { status: 400 });
  }

  // vehicleId/driverId come from the real fleet/roster picker (the client
  // fetches /api/vehicles and /api/drivers and only lets the operator pick
  // a real record) - verify they actually belong to this company rather
  // than trusting the id blindly.
  const vehicleId = body.vehicleId ? String(body.vehicleId) : null;
  const driverId = body.driverId ? String(body.driverId) : null;
  if (vehicleId) {
    const v = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!v || v.companyId !== sessionUser.companyId) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 400 });
    }
  }
  if (driverId) {
    const d = await db.driver.findUnique({ where: { id: driverId } });
    if (!d || d.companyId !== sessionUser.companyId) {
      return NextResponse.json({ error: "Driver not found." }, { status: 400 });
    }
  }

  // customerId is a best-effort link when the typed customer name matches
  // a real Customer record; the customer/consignor/consignee text fields
  // always carry the typed value regardless, so nothing is lost when there's
  // no match.
  const customerName = String(body.customer || "").trim();
  const matchedCustomer = customerName
    ? await db.customer.findFirst({ where: { companyId: sessionUser.companyId, companyName: customerName } })
    : null;

  const tripId = body.tripId?.trim() || `TRIP-${Date.now()}`;
  const lrNumber = body.lrNumber?.trim() || `LR-${Date.now()}`;

  try {
    const created = await db.trip.create({
      data: {
        companyId: sessionUser.companyId,
        tripId,
        lrNumber,
        customerId: matchedCustomer?.id ?? null,
        vehicleId,
        driverId,
        consignor: body.consignor || customerName,
        consignee: body.consignee || customerName,
        origin,
        destination,
        status: body.status || "Planned",
        orderMode: body.orderMode || "FTL",
        freightAmount: Number.isFinite(body.freightAmount) ? body.freightAmount : 0,
        paymentStatus: body.paymentStatus || "Unpaid",
        distanceKm: Number.isFinite(body.distanceKm) ? body.distanceKm : 0,
        eWayBill: body.eWayBill || null,
        expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
      },
      include: TRIP_INCLUDE,
    });
    return NextResponse.json({ trip: toTripDTO(created) }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "A trip with that order number or LR number already exists." }, { status: 409 });
    }
    console.error("POST /api/trips error:", e);
    return NextResponse.json({ error: "Could not create trip." }, { status: 500 });
  }
}
