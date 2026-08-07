import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Real CRUD for the Invoices module, replacing pure client-side state
// seeded from src/lib/mock-data.ts's INVOICES array. tripRef is resolved
// via the real Trip relation (its human-readable tripId code) rather than
// stored redundantly.

function toInvoiceDTO(i: {
  id: string; invoiceNumber: string; customer: string; invoiceDate: Date; dueDate: Date | null;
  amount: number; taxAmount: number; totalAmount: number; status: string; paymentStatus: string;
  igst: number | null; cgst: number | null; sgst: number | null; trip: { tripId: string } | null;
}) {
  return {
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    customer: i.customer,
    invoiceDate: i.invoiceDate.toISOString(),
    dueDate: i.dueDate ? i.dueDate.toISOString() : "",
    amount: i.amount,
    taxAmount: i.taxAmount,
    totalAmount: i.totalAmount,
    status: i.status,
    paymentStatus: i.paymentStatus,
    tripRef: i.trip?.tripId ?? undefined,
    igst: i.igst ?? undefined,
    cgst: i.cgst ?? undefined,
    sgst: i.sgst ?? undefined,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const invoices = await db.invoice.findMany({
    where: { companyId: sessionUser.companyId },
    include: { trip: { select: { tripId: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ invoices: invoices.map(toInvoiceDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json();
  const customer = String(body.customer || "").trim();
  if (!customer) {
    return NextResponse.json({ error: "customer is required." }, { status: 400 });
  }

  // customerId is a best-effort link when the typed customer name matches
  // a real Customer record; tripId similarly resolves the human-readable
  // trip code (tripRef) back to a real Trip row, if given.
  const matchedCustomer = await db.customer.findFirst({
    where: { companyId: sessionUser.companyId, companyName: customer },
  });
  const matchedTrip = body.tripRef
    ? await db.trip.findFirst({ where: { companyId: sessionUser.companyId, tripId: String(body.tripRef) } })
    : null;

  const invoiceNumber = body.invoiceNumber?.trim() || `INV-${Date.now()}`;

  try {
    const created = await db.invoice.create({
      data: {
        companyId: sessionUser.companyId,
        invoiceNumber,
        customerId: matchedCustomer?.id ?? null,
        tripId: matchedTrip?.id ?? null,
        customer,
        amount: Number.isFinite(body.amount) ? body.amount : 0,
        taxAmount: Number.isFinite(body.taxAmount) ? body.taxAmount : 0,
        totalAmount: Number.isFinite(body.totalAmount) ? body.totalAmount : 0,
        status: body.status || "Draft",
        paymentStatus: body.paymentStatus || "Unpaid",
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        igst: Number.isFinite(body.igst) ? body.igst : null,
        cgst: Number.isFinite(body.cgst) ? body.cgst : null,
        sgst: Number.isFinite(body.sgst) ? body.sgst : null,
      },
      include: { trip: { select: { tripId: true } } },
    });
    return NextResponse.json({ invoice: toInvoiceDTO(created) }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "An invoice with that number already exists." }, { status: 409 });
    }
    console.error("POST /api/invoices error:", e);
    return NextResponse.json({ error: "Could not create invoice." }, { status: 500 });
  }
}
