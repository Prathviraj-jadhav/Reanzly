import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireAnyModuleAccess } from "@/lib/permissions";

const EDITABLE_FIELDS = [
  "party", "amount", "mode", "reference", "date", "status", "against",
  "fromAccount", "toAccount", "vehicle", "vendor", "lrNumber",
  "totalAdvance", "totalExpense", "netPayable", "settledAmount", "balance",
  "approvedBy", "remarks",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireAnyModuleAccess(sessionUser, "ledger", "payments", "financial-ops");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.treasuryVoucher.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Voucher not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  const intFields = new Set(["amount", "totalAdvance", "totalExpense", "netPayable", "settledAmount", "balance"]);
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      const v = body[field];
      if (field === "date" && v) data[field] = new Date(v);
      else if (intFields.has(field) && v != null && v !== "") data[field] = Math.round(Number(v));
      else data[field] = v;
    }
  }
  if ("from" in body) data.fromCity = body.from;
  if ("to" in body) data.toCity = body.to;

  const updated = await db.treasuryVoucher.update({ where: { id }, data });
  return NextResponse.json({
    voucher: {
      id: updated.id,
      type: updated.type,
      number: updated.number,
      party: updated.party,
      amount: updated.amount,
      mode: updated.mode,
      reference: updated.reference ?? "",
      date: updated.date.toISOString(),
      status: updated.status,
      against: updated.against ?? "",
      fromAccount: updated.fromAccount ?? undefined,
      toAccount: updated.toAccount ?? undefined,
      vehicle: updated.vehicle ?? undefined,
      vendor: updated.vendor ?? undefined,
      lrNumber: updated.lrNumber ?? undefined,
      from: updated.fromCity ?? undefined,
      to: updated.toCity ?? undefined,
      totalAdvance: updated.totalAdvance ?? undefined,
      totalExpense: updated.totalExpense ?? undefined,
      netPayable: updated.netPayable ?? undefined,
      settledAmount: updated.settledAmount ?? undefined,
      balance: updated.balance ?? undefined,
      approvedBy: updated.approvedBy ?? undefined,
      remarks: updated.remarks ?? "",
      createdBy: updated.createdBy,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireAnyModuleAccess(sessionUser, "ledger", "payments", "financial-ops");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.treasuryVoucher.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Voucher not found." }, { status: 404 });
  }

  await db.treasuryVoucher.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
