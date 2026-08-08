import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// PATCH /api/vendor-portal/rfqs/[id]  { ratePerKm, validityDays, notes? }
// The Vendor Portal's one real write action on RFQs: submit or revise a
// quote. Only allowed while the RFQ is still open for quoting (Pending or
// already Quoted by this customer) - Won/Lost/Expired are terminal.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.rfq.findUnique({ where: { id } });
  if (!existing || existing.customerId !== customer!.id) {
    return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
  }
  if (!["Pending", "Quoted"].includes(existing.status)) {
    return NextResponse.json({ error: `This RFQ is ${existing.status.toLowerCase()} and can no longer be quoted.` }, { status: 400 });
  }

  const body = await req.json();
  const ratePerKm = Number(body.ratePerKm);
  if (!Number.isFinite(ratePerKm) || ratePerKm <= 0) {
    return NextResponse.json({ error: "A valid rate per km is required." }, { status: 400 });
  }
  const validityDays = Number.isFinite(body.validityDays) ? body.validityDays : 7;

  const updated = await db.rfq.update({
    where: { id },
    data: {
      status: "Quoted",
      quotedRatePerKm: ratePerKm,
      validityDays,
      quotedAt: new Date(),
      notes: body.notes ? String(body.notes) : existing.notes,
    },
  });

  return NextResponse.json({
    rfq: {
      id: updated.id,
      status: updated.status,
      quotedRatePerKm: updated.quotedRatePerKm ?? undefined,
      validityDays: updated.validityDays ?? 7,
      quotedAt: updated.quotedAt ? updated.quotedAt.toISOString() : undefined,
    },
  });
}
