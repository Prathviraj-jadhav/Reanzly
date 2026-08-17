import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

function toDTO(g: {
  id: string; type: string; period: string; dueDate: Date; filingDate: Date | null;
  status: string; taxableValue: number; outputTax: number; inputTaxCredit: number;
  netPayable: number; matched: number | null; mismatched: number | null; pending: number | null;
  ackNo: string | null;
}) {
  return {
    id: g.id,
    type: g.type,
    period: g.period,
    dueDate: g.dueDate.toISOString().slice(0, 10),
    filingDate: g.filingDate ? g.filingDate.toISOString().slice(0, 10) : undefined,
    status: g.status,
    taxableValue: g.taxableValue,
    outputTax: g.outputTax,
    inputTaxCredit: g.inputTaxCredit,
    netPayable: g.netPayable,
    matched: g.matched ?? undefined,
    mismatched: g.mismatched ?? undefined,
    pending: g.pending ?? undefined,
    ackNo: g.ackNo ?? undefined,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.ledgerGstReturn.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Return not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.filingDate !== undefined) data.filingDate = body.filingDate ? new Date(body.filingDate) : null;
  if (body.ackNo !== undefined) data.ackNo = body.ackNo;
  if (body.taxableValue !== undefined) data.taxableValue = Math.round(Number(body.taxableValue) || 0);
  if (body.outputTax !== undefined) data.outputTax = Math.round(Number(body.outputTax) || 0);
  if (body.inputTaxCredit !== undefined) data.inputTaxCredit = Math.round(Number(body.inputTaxCredit) || 0);
  if (body.netPayable !== undefined) data.netPayable = Math.round(Number(body.netPayable) || 0);

  const updated = await db.ledgerGstReturn.update({ where: { id }, data });
  return NextResponse.json({ return: toDTO(updated) });
}
