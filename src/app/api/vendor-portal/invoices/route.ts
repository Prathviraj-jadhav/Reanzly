import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// GET /api/vendor-portal/invoices
// Real Invoice list scoped to this portal session's linked Customer,
// replacing VENDOR_INVOICES (INVOICES.slice(0,5)). Same DTO as /api/invoices.
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
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  const invoices = await db.invoice.findMany({
    where: { customerId: customer!.id },
    include: { trip: { select: { tripId: true } } },
    orderBy: { invoiceDate: "desc" },
  });
  return NextResponse.json({ invoices: invoices.map(toInvoiceDTO) });
}
