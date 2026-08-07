import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const INCLUDE = { _count: { select: { payslips: true } } } as const;
type Row = Awaited<ReturnType<typeof db.payrollRun.findFirst<{ include: typeof INCLUDE }>>>;

function toDTO(r: NonNullable<Row>) {
  return {
    id: r.id, month: r.month, generatedOn: r.createdAt.toISOString(),
    approvedOn: r.approvedAt ? r.approvedAt.toISOString() : undefined,
    disbursedOn: r.paidAt ? r.paidAt.toISOString() : undefined,
    status: r.status, totalGross: Math.round(r.grossTotal / 100),
    totalDeductions: Math.round(r.deductTotal / 100), totalNet: Math.round(r.netTotal / 100),
    employeeCount: r._count.payslips,
  };
}

// Handles both approve ({action: "approve"}) and disburse
// ({action: "disburse"}) - both real, transactional status flips across
// the run and every one of its real payslips, not a client-side patch.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.payrollRun.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Payroll run not found." }, { status: 404 });
  }

  const body = await req.json();
  const action = body.action;
  if (action !== "approve" && action !== "disburse") {
    return NextResponse.json({ error: "action must be 'approve' or 'disburse'." }, { status: 400 });
  }
  if (action === "disburse" && existing.status !== "Approved") {
    return NextResponse.json({ error: "Run must be approved before it can be disbursed." }, { status: 400 });
  }

  const newStatus = action === "approve" ? "Approved" : "Paid";
  const now = new Date();

  const updated = await db.$transaction(async (tx) => {
    const run = await tx.payrollRun.update({
      where: { id },
      data: action === "approve" ? { status: newStatus, approvedAt: now } : { status: newStatus, paidAt: now },
      include: INCLUDE,
    });
    await tx.payslip.updateMany({ where: { payrollRunId: id }, data: { status: newStatus } });
    return run;
  });

  return NextResponse.json({ payrollRun: toDTO(updated) });
}
