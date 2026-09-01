import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// POST /api/vendor-portal/rfqs/submit-load
// Creates a new RFQ row in the database pre-quoted, connecting the marketplace
// load application to the vendor portal active quotes list.
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  try {
    const body = await req.json();
    const {
      origin,
      destination,
      vehicleType,
      weight,
      ratePerKm,
      validityDays,
      notes,
      shipper,
      budget,
    } = body;

    if (!origin || !destination || !vehicleType) {
      return NextResponse.json(
        { error: "Origin, destination, and vehicle type are required." },
        { status: 400 }
      );
    }

    const rate = Number(ratePerKm);
    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json(
        { error: "A valid rate per km is required." },
        { status: 400 }
      );
    }

    // Generate a unique RFQ number
    const rfqNumber = `RFQ-MKP-${Math.floor(100000 + Math.random() * 900000)}`;

    const rfq = await db.rfq.create({
      data: {
        companyId: customer!.companyId,
        customerId: customer!.id,
        rfqNumber,
        lane: `${origin} → ${destination}`,
        origin,
        destination,
        vehicleType,
        weightKg: Number(weight) || 12000,
        packages: 120, // default placeholder
        commodity: "Industrial Goods",
        requiredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // required in 5 days
        status: "Quoted",
        quotedRatePerKm: rate,
        validityDays: Number(validityDays) || 7,
        quotedAt: new Date(),
        notes: notes ? String(notes) : `Marketplace bid for ${shipper || "shipper"}'s load (Budget: ₹${budget || 0})`,
        issuedBy: shipper || "Marketplace Shipper",
      },
    });

    return NextResponse.json({ success: true, rfq });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to submit quote." },
      { status: 500 }
    );
  }
}
