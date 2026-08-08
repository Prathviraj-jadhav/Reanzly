import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// GET /api/vendor-portal/ledger
// Composes real Invoice rows (as debit entries - no separate row is stored
// for these, avoiding duplicating data that already exists in the Invoice
// table) with real LedgerEntry rows (payments/credit notes/debit notes/
// opening balance - see schema.prisma comment on that model for why those
// needed a new table and invoices didn't), sorted by date, to compute a
// running balance. Replaces buildVendorLedger()'s hardcoded opening
// balance + 3 fake payment rows + 1 fake credit/debit note each.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  const [invoices, entries] = await Promise.all([
    db.invoice.findMany({ where: { customerId: customer!.id }, include: { trip: { select: { tripId: true } } } }),
    db.ledgerEntry.findMany({ where: { customerId: customer!.id } }),
  ]);

  type Row = { id: string; date: string; type: string; ref: string; description: string; debitINR: number; creditINR: number };
  const rows: Row[] = [
    ...invoices.map((i): Row => ({
      id: `inv-${i.id}`,
      date: i.invoiceDate.toISOString(),
      type: "Invoice",
      ref: i.invoiceNumber,
      description: `Freight invoice${i.trip ? ` - ${i.trip.tripId}` : ""}`,
      debitINR: i.totalAmount,
      creditINR: 0,
    })),
    ...entries.map((e): Row => ({
      id: e.id,
      date: e.date.toISOString(),
      type: e.type === "CreditNote" ? "Credit Note" : e.type === "DebitNote" ? "Debit Note" : e.type === "OpeningBalance" ? "Opening Balance" : "Payment",
      ref: e.reference ?? "",
      description: e.description,
      debitINR: e.debit,
      creditINR: e.credit,
    })),
  ];

  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let balance = 0;
  const ledger = rows.map((r) => {
    if (r.type === "Opening Balance") {
      balance = r.debitINR - r.creditINR;
    } else {
      balance += r.debitINR - r.creditINR;
    }
    return { ...r, runningBalanceINR: balance };
  });

  return NextResponse.json({
    ledger,
    openingBalanceINR: ledger.find((e) => e.type === "Opening Balance")?.runningBalanceINR ?? 0,
    closingBalanceINR: ledger.length ? ledger[ledger.length - 1].runningBalanceINR : 0,
  });
}
