import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireAnyModuleAccess } from "@/lib/permissions";

const PREFIX_BY_TYPE: Record<string, string> = {
  Advance: "RZ-ADV",
  "Add Money": "RZ-ADD",
  Withdrawal: "RZ-WTH",
  Movement: "RZ-MVT",
  "Truck Forwarding": "RZ-FWD",
  Settlement: "RZ-SET",
  "Recovery Voucher": "RZ-RCV",
};

function toDTO(v: {
  id: string; type: string; number: string; party: string; amount: number; mode: string;
  reference: string | null; date: Date; status: string; against: string | null;
  fromAccount: string | null; toAccount: string | null; vehicle: string | null; vendor: string | null;
  lrNumber: string | null; fromCity: string | null; toCity: string | null;
  totalAdvance: number | null; totalExpense: number | null; netPayable: number | null;
  settledAmount: number | null; balance: number | null; approvedBy: string | null;
  remarks: string | null; createdBy: string; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: v.id,
    type: v.type,
    number: v.number,
    party: v.party,
    amount: v.amount,
    mode: v.mode,
    reference: v.reference ?? "",
    date: v.date.toISOString(),
    status: v.status,
    against: v.against ?? "",
    fromAccount: v.fromAccount ?? undefined,
    toAccount: v.toAccount ?? undefined,
    vehicle: v.vehicle ?? undefined,
    vendor: v.vendor ?? undefined,
    lrNumber: v.lrNumber ?? undefined,
    from: v.fromCity ?? undefined,
    to: v.toCity ?? undefined,
    totalAdvance: v.totalAdvance ?? undefined,
    totalExpense: v.totalExpense ?? undefined,
    netPayable: v.netPayable ?? undefined,
    settledAmount: v.settledAmount ?? undefined,
    balance: v.balance ?? undefined,
    approvedBy: v.approvedBy ?? undefined,
    remarks: v.remarks ?? "",
    createdBy: v.createdBy,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

async function nextNumber(companyId: string, type: string): Promise<string> {
  const prefix = PREFIX_BY_TYPE[type] ?? "RZ-VCH";
  const existing = await db.treasuryVoucher.findMany({ where: { companyId, type }, select: { number: true } });
  let max = 0;
  for (const e of existing) {
    const n = parseInt(e.number.replace(/\D/g, ""), 10);
    if (!isNaN(n)) max = Math.max(max, n);
  }
  return `${prefix}-${String(max + 1).padStart(5, "0")}`;
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireAnyModuleAccess(sessionUser, "ledger", "payments", "financial-ops");
  if (denied) return denied;

  const vouchers = await db.treasuryVoucher.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ vouchers: vouchers.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireAnyModuleAccess(sessionUser, "ledger", "payments", "financial-ops");
  if (denied) return denied;

  const body = await req.json();
  const type = String(body.type || "").trim();
  const party = String(body.party || "").trim();
  const amount = Number(body.amount);
  if (!type || !party || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "type, party, and a positive amount are required." }, { status: 400 });
  }

  const number = await nextNumber(sessionUser.companyId, type);

  const created = await db.treasuryVoucher.create({
    data: {
      companyId: sessionUser.companyId,
      type,
      number,
      party,
      amount: Math.round(amount),
      mode: body.mode || "Cash",
      reference: body.reference || null,
      date: body.date ? new Date(body.date) : new Date(),
      status: body.status || "Draft",
      against: body.against || null,
      fromAccount: body.fromAccount || null,
      toAccount: body.toAccount || null,
      vehicle: body.vehicle || null,
      vendor: body.vendor || null,
      lrNumber: body.lrNumber || null,
      fromCity: body.from || null,
      toCity: body.to || null,
      totalAdvance: Number.isFinite(body.totalAdvance) ? Math.round(body.totalAdvance) : null,
      totalExpense: Number.isFinite(body.totalExpense) ? Math.round(body.totalExpense) : null,
      netPayable: Number.isFinite(body.netPayable) ? Math.round(body.netPayable) : null,
      settledAmount: Number.isFinite(body.settledAmount) ? Math.round(body.settledAmount) : null,
      balance: Number.isFinite(body.balance) ? Math.round(body.balance) : null,
      approvedBy: body.approvedBy || null,
      remarks: body.remarks || null,
      createdBy: sessionUser.name,
    },
  });

  return NextResponse.json({ voucher: toDTO(created) }, { status: 201 });
}
