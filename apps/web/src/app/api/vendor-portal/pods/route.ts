import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// GET /api/vendor-portal/pods
// Real Pod rows scoped to this portal session's linked Customer via
// Pod.trip.customerId (Pod itself has no direct customerId FK). Replaces
// VendorPOD's mock construction from LORRY_RECEIPTS - unlike that mock,
// this reads the real Pod model's own capture fields (signature/photo/GPS)
// instead of fabricating them.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  const pods = await db.pod.findMany({
    where: { trip: { customerId: customer!.id } },
    include: {
      trip: { select: { tripId: true, vehicle: { select: { name: true } }, driver: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    pods: pods.map((p) => ({
      id: p.id,
      podNumber: p.voucherNumber,
      tripRef: p.trip?.tripId ?? "",
      lrNumber: p.consignmentNumber,
      origin: p.source,
      destination: p.destination,
      vehicleName: p.trip?.vehicle?.name ?? p.vehicleNumber ?? "Unassigned",
      driverName: p.trip?.driver?.name ?? "Unassigned",
      consignee: p.consignee,
      consignor: p.consignor,
      capturedDate: p.createdAt.toISOString(),
      deliveryDate: p.deliveryDate ? p.deliveryDate.toISOString() : undefined,
      status: p.status,
      signatureCaptured: !!(p.signatureImageFull || p.signatureDrawn),
      damages: p.conditionOk ? "None" : "Minor",
      packages: p.packages ?? 0,
      weightKg: p.weight ?? 0,
      gps: p.gpsLat != null && p.gpsLng != null ? { lat: p.gpsLat, lng: p.gpsLng } : undefined,
      remarks: p.remarks ?? undefined,
      photoCount: [p.frontImageFull, p.backImageFull, p.stampImageFull].filter(Boolean).length,
    })),
  });
}
