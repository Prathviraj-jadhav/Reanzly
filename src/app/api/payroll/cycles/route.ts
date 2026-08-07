import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const INCLUDE = { _count: { select: { payslips: true } } } as const;
type Row = Awaited<ReturnType<typeof db.payrollRun.findFirst<{ include: typeof INCLUDE }>>>;

// Real audit trail derived from the run's own real timestamps - not a
// fabricated event log, just what genuinely happened to this record.
function realAudit(r: NonNullable<Row>) {
  const entries: { id: string; at: string; by: string; action: string; note?: string }[] = [
    { id: `${r.id}-created`, at: r.createdAt.toISOString(), by: r.runBy || "System", action: "Cycle created" },
  ];
  if (r.approvedAt) entries.push({ id: `${r.id}-approved`, at: r.approvedAt.toISOString(), by: r.approvedBy || "-", action: "Approved" });
  if (r.paidAt) entries.push({ id: `${r.id}-paid`, at: r.paidAt.toISOString(), by: r.approvedBy || "-", action: "Disbursed" });
  return entries;
}

function toDTO(r: NonNullable<Row>) {
  return {
    id: r.id,
    cycleNo: r.cycleNo,
    month: r.month,
    status: r.status,
    locked: r.locked,
    payDate: r.paidAt ? r.paidAt.toISOString() : undefined,
    approvedDate: r.approvedAt ? r.approvedAt.toISOString() : undefined,
    submittedDate: r.createdAt.toISOString(),
    headcount: r._count.payslips,
    grossTotal: Math.round(r.grossTotal / 100),
    deductionsTotal: Math.round(r.deductTotal / 100),
    netTotal: Math.round(r.netTotal / 100),
    employerContribTotal: Math.round(r.employerContribTotal / 100),
    approvedBy: r.approvedBy ?? undefined,
    runBy: r.runBy ?? undefined,
    remarks: r.remarks ?? undefined,
    audit: realAudit(r),
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const runs = await db.payrollRun.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { month: "desc" },
  });
  return NextResponse.json({ cycles: runs.map(toDTO) });
}

// Creates a Draft cycle for a month - a real row, empty until "Run
// Payroll" (PATCH .../run) generates real payslips from real Employees +
// their real SalaryStructure percentages.
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const month = String(body.month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be in YYYY-MM format." }, { status: 400 });
  }
  const existing = await db.payrollRun.findUnique({ where: { companyId_month: { companyId: sessionUser.companyId, month } } });
  if (existing) return NextResponse.json({ error: `A cycle for ${month} already exists.` }, { status: 409 });

  const created = await db.payrollRun.create({
    data: {
      cycleNo: `RZ-CYC-${Date.now().toString(36).toUpperCase()}`,
      companyId: sessionUser.companyId,
      month,
      status: "Draft",
      grossTotal: 0, deductTotal: 0, netTotal: 0, employerContribTotal: 0,
    },
    include: INCLUDE,
  });
  return NextResponse.json({ cycle: toDTO(created) }, { status: 201 });
}
