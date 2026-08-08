import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// GET /api/vendor-portal/rfqs
// Real Rfq rows for this portal session's linked Customer. RFQs are issued
// TO the customer by Reanzly staff (there's no "create RFQ" action in the
// portal itself, only "submit/revise quote" - see [id]/route.ts's PATCH),
// so this route is read-only.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  const rfqs = await db.rfq.findMany({
    where: { customerId: customer!.id },
    orderBy: { receivedAt: "desc" },
  });

  return NextResponse.json({
    rfqs: rfqs.map((r) => ({
      id: r.id,
      rfqNumber: r.rfqNumber,
      lane: r.lane,
      origin: r.origin,
      destination: r.destination,
      vehicleType: r.vehicleType,
      weightKg: r.weightKg,
      packages: r.packages,
      requiredDate: r.requiredDate.toISOString(),
      distanceKm: r.distanceKm ?? 0,
      quotedRatePerKm: r.quotedRatePerKm ?? undefined,
      validityDays: r.validityDays ?? 7,
      status: r.status,
      quotedAt: r.quotedAt ? r.quotedAt.toISOString() : undefined,
      receivedAt: r.receivedAt.toISOString(),
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : "",
      issuedBy: r.issuedBy ?? "",
      commodity: r.commodity,
      notes: r.notes ?? undefined,
    })),
  });
}
