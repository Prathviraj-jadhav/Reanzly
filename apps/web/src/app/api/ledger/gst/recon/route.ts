import { NextResponse } from "next/server";
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

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;

  const lines = await db.ledgerGstReconLine.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { invoiceDate: "desc" },
  });
  return NextResponse.json({ lines: lines.map(toDTO) });
}
