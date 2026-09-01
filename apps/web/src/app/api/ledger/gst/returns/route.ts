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

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;

  const returns = await db.ledgerGstReturn.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { period: "desc" },
  });
  return NextResponse.json({ returns: returns.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;

  const body = await req.json();
  const type = String(body.type || "").trim();
  const period = String(body.period || "").trim();
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (!type || !period || !dueDate) {
    return NextResponse.json({ error: "type, period, and dueDate are required." }, { status: 400 });
  }

  const created = await db.ledgerGstReturn.create({
    data: {
      companyId: sessionUser.companyId,
      type,
      period,
      dueDate,
      status: body.status || "Draft",
      taxableValue: Math.round(Number(body.taxableValue) || 0),
      outputTax: Math.round(Number(body.outputTax) || 0),
      inputTaxCredit: Math.round(Number(body.inputTaxCredit) || 0),
      netPayable: Math.round(Number(body.netPayable) || 0),
      matched: Number.isFinite(body.matched) ? Math.round(body.matched) : null,
      mismatched: Number.isFinite(body.mismatched) ? Math.round(body.mismatched) : null,
      pending: Number.isFinite(body.pending) ? Math.round(body.pending) : null,
    },
  });

  return NextResponse.json({ return: toDTO(created) }, { status: 201 });
}
