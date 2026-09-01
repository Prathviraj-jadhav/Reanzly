import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const INCLUDE = {
  employee: { select: { code: true, name: true, designation: true, department: true } },
  installments: { orderBy: { no: "asc" as const } },
} as const;
import type { Prisma } from "@prisma/client";
type Row = Prisma.PayrollLoanGetPayload<{ include: typeof INCLUDE }>;

function installmentStatus(status: string, dueDate: Date): "Paid" | "Pending" | "Upcoming" {
  if (status === "Paid") return "Paid";
  return dueDate.getTime() <= Date.now() ? "Pending" : "Upcoming";
}

function toDTO(r: NonNullable<Row>) {
  const paidInstallments = r.installments.filter((i) => i.status === "Paid").length;
  return {
    id: r.id,
    code: r.code,
    empCode: r.employee.code,
    empName: r.employee.name,
    designation: r.employee.designation,
    department: r.employee.department ?? "Operations",
    type: r.type,
    principal: Math.round(r.principal / 100),
    interestRate: r.interestRate,
    tenureMonths: r.tenureMonths,
    emi: Math.round(r.emi / 100),
    disbursedDate: r.disbursedDate.toISOString(),
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    status: r.status as "Active" | "Closed" | "Foreclosed",
    outstanding: Math.round(r.outstanding / 100),
    paidInstallments,
    totalInstallments: r.installments.length,
    installments: r.installments.map((i) => ({
      id: i.id,
      no: i.no,
      date: i.dueDate.toISOString(),
      amount: Math.round(i.amount / 100),
      status: installmentStatus(i.status, i.dueDate),
    })),
    remarks: r.remarks ?? undefined,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.payrollLoan.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Loan not found." }, { status: 404 });
  }

  const body = await req.json();
  const action = body.action;

  if (action === "close" || action === "foreclose") {
    if (existing.status !== "Active") return NextResponse.json({ error: "Loan already closed/foreclosed." }, { status: 400 });
    const status = action === "close" ? "Closed" : "Foreclosed";
    const now = new Date();
    await db.$transaction([
      db.payrollLoanInstallment.updateMany({
        where: { loanId: id, status: { not: "Paid" } },
        data: { status: "Paid", paidDate: now },
      }),
      db.payrollLoan.update({ where: { id }, data: { status, outstanding: 0 } }),
    ]);
    const updated = await db.payrollLoan.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    await logAudit({
      sessionUser,
      action: "STATUS_CHANGE",
      entity: "PayrollLoan",
      entityId: id,
      description: `${status === "Closed" ? "Closed" : "Foreclosed"} loan ${updated.code}`,
    });
    return NextResponse.json({ loan: toDTO(updated) });
  }

  if (action === "mark-installment-paid") {
    const installmentId = String(body.installmentId || "").trim();
    const installment = await db.payrollLoanInstallment.findUnique({ where: { id: installmentId } });
    if (!installment || installment.loanId !== id) {
      return NextResponse.json({ error: "Installment not found." }, { status: 404 });
    }
    if (installment.status === "Paid") return NextResponse.json({ error: "Installment already paid." }, { status: 400 });
    const now = new Date();
    await db.$transaction([
      db.payrollLoanInstallment.update({ where: { id: installmentId }, data: { status: "Paid", paidDate: now } }),
      db.payrollLoan.update({ where: { id }, data: { outstanding: Math.max(0, existing.outstanding - installment.amount) } }),
    ]);
    const updated = await db.payrollLoan.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    await logAudit({
      sessionUser,
      action: "STATUS_CHANGE",
      entity: "PayrollLoan",
      entityId: id,
      description: `Recorded installment #${installment.no} paid for loan ${updated.code}`,
    });
    return NextResponse.json({ loan: toDTO(updated) });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
