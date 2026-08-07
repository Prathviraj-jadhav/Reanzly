import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Real CRUD for the Lorry Receipts module. `freight` is stored in paise
// (schema comment) while the UI works in whole rupees - converted at the
// API boundary. `tripId` in the frontend DTO is the human-readable Trip
// code (Trip.tripId), not the internal Prisma id - resolved via the real
// relation. `status`/`freightTerm` values are written using the LR module
// UI's own vocabulary (Generated/Printed/Sent/Archived, Paid/To Be Billed/
// To Pay) rather than the DB comment's original Issued/InTransit/etc, since
// the UI already has real, working code built around its own vocabulary.

function toDTO(l: {
  id: string; lrNumber: string; consignor: string; consignee: string;
  fromCity: string; toCity: string; freight: number; freightTerm: string;
  eWayBillNo: string | null; eWayBillExpiry: Date | null; status: string; issuedAt: Date;
  trip: { tripId: string } | null;
}) {
  return {
    id: l.id,
    lrNumber: l.lrNumber,
    tripId: l.trip?.tripId ?? "",
    consignor: l.consignor,
    consignee: l.consignee,
    origin: l.fromCity,
    destination: l.toCity,
    date: l.issuedAt.toISOString(),
    status: l.status,
    eWayBill: l.eWayBillNo ?? undefined,
    eWayBillExpiry: l.eWayBillExpiry ? l.eWayBillExpiry.toISOString() : undefined,
    freightAmount: Math.round(l.freight / 100),
    freightTerm: l.freightTerm,
  };
}

const INCLUDE = { trip: { select: { tripId: true } } } as const;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const lrs = await db.lorryReceipt.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ lrs: lrs.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const origin = String(body.origin || "").trim();
  const destination = String(body.destination || "").trim();
  const consignor = String(body.consignor || "").trim();
  const consignee = String(body.consignee || "").trim();
  if (!origin || !destination || !consignor || !consignee) {
    return NextResponse.json({ error: "origin, destination, consignor and consignee are required." }, { status: 400 });
  }

  const tripCode = String(body.tripId || "").trim();
  const matchedTrip = tripCode
    ? await db.trip.findFirst({ where: { companyId: sessionUser.companyId, tripId: tripCode } })
    : null;
  // Best-effort: link a real Customer if consignor matches one by name.
  const matchedCustomer = await db.customer.findFirst({ where: { companyId: sessionUser.companyId, companyName: consignor } });

  const lrNumber = body.lrNumber?.trim() || `LR-${Date.now()}`;

  try {
    const created = await db.lorryReceipt.create({
      data: {
        companyId: sessionUser.companyId,
        lrNumber,
        tripId: matchedTrip?.id ?? null,
        customerId: matchedCustomer?.id ?? null,
        fromCity: origin,
        toCity: destination,
        consignor,
        consignee,
        freight: Math.round((Number.isFinite(body.freightAmount) ? body.freightAmount : 0) * 100),
        freightTerm: body.freightTerm || "Paid",
        eWayBillNo: body.eWayBill || null,
        eWayBillExpiry: body.eWayBillExpiry ? new Date(body.eWayBillExpiry) : null,
        status: body.status || "Generated",
        issuedAt: body.date ? new Date(body.date) : new Date(),
      },
      include: INCLUDE,
    });
    return NextResponse.json({ lr: toDTO(created) }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/lorry-receipts error:", e);
    return NextResponse.json({ error: "Could not create lorry receipt." }, { status: 500 });
  }
}
