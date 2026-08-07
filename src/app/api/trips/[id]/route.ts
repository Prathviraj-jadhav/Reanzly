import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const EDITABLE_FIELDS = [
  "consignor", "consignee", "origin", "destination", "status", "orderMode",
  "freightAmount", "paymentStatus", "distanceKm", "eWayBill",
  "vehicleId", "driverId",
] as const;

const TRIP_INCLUDE = {
  vehicle: { select: { name: true } },
  driver: { select: { name: true } },
  customer: { select: { companyName: true } },
} as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.trip.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  if ("expectedDelivery" in body) {
    data.expectedDelivery = body.expectedDelivery ? new Date(body.expectedDelivery) : null;
  }
  // A customer name edit re-resolves the best-effort customerId link,
  // matching the create route's behavior.
  if ("customer" in body) {
    const customerName = String(body.customer || "").trim();
    const matched = customerName
      ? await db.customer.findFirst({ where: { companyId: sessionUser.companyId, companyName: customerName } })
      : null;
    data.customerId = matched?.id ?? null;
  }

  const updated = await db.trip.update({ where: { id }, data, include: TRIP_INCLUDE });

  return NextResponse.json({
    trip: {
      id: updated.id,
      tripId: updated.tripId,
      lrNumber: updated.lrNumber,
      consignor: updated.consignor,
      consignee: updated.consignee,
      origin: updated.origin,
      destination: updated.destination,
      vehicleId: updated.vehicleId ?? "",
      vehicleName: updated.vehicle?.name ?? "Unassigned",
      driverId: updated.driverId ?? "",
      driverName: updated.driver?.name ?? "Unassigned",
      status: updated.status,
      createdDate: updated.createdDate.toISOString(),
      expectedDelivery: updated.expectedDelivery ? updated.expectedDelivery.toISOString() : "",
      freightAmount: updated.freightAmount,
      paymentStatus: updated.paymentStatus,
      orderMode: updated.orderMode,
      eWayBill: updated.eWayBill ?? undefined,
      distanceKm: updated.distanceKm,
      customer: updated.customer?.companyName ?? updated.consignor,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.trip.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  await db.trip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
