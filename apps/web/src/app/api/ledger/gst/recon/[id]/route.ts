import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

function toDTO(l: {
  id: string; vendorGstin: string; vendorName: string; invoiceNo: string; invoiceDate: Date;
  taxableValue: number; itcClaimed: number; itcAsPer2B: number; status: string; reason: string | null;
}) {
  return {
    id: l.id,
    vendorGstin: l.vendorGstin,
    vendorName: l.vendorName,
    invoiceNo: l.invoiceNo,
    invoiceDate: l.invoiceDate.toISOString().slice(0, 10),
    taxableValue: l.taxableValue,
    itcClaimed: l.itcClaimed,
    itcAsPer2B: l.itcAsPer2B,
    status: l.status,
    reason: l.reason ?? undefined,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.ledgerGstReconLine.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Reconciliation line not found." }, { status: 404 });

  const body = await req.json();
  const status = String(body.status || "").trim();
  if (!["Matched", "Mismatched", "Pending"].includes(status)) {
    return NextResponse.json({ error: "status must be Matched, Mismatched, or Pending." }, { status: 400 });
  }

  const updated = await db.ledgerGstReconLine.update({
    where: { id },
    data: {
      status,
      reason: body.reason !== undefined ? body.reason : status === "Matched" ? null : existing.reason,
    },
  });
  return NextResponse.json({ line: toDTO(updated) });
}
