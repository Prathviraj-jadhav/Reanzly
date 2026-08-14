import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// Real CRUD for the Loans & Advances tab, replacing the client-only LOANS
// mock array (with its nested LoanInstallment[] mock). employeeId is a real
// FK to Employee; installments are real PayrollLoanInstallment rows created
// in the same transaction as the loan, using the exact EMI math the mock
// drawer already computed client-side: emi = principal * (1 + rate% *
// (tenure/12)) / tenure (simple interest, spread evenly).
//
// PayrollLoanInstallment only has Pending | Paid in the schema (no
// "Upcoming"); the UI's third visual state is derived here at read time
// from dueDate vs now, not a stored status.

const INCLUDE = {
  employee: { select: { code: true, name: true, designation: true, department: true } },
  installments: { orderBy: { no: "asc" as const } },
} as const;
type Row = Awaited<ReturnType<typeof db.payrollLoan.findFirst<{ include: typeof INCLUDE }>>>;

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

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const rows = await db.payrollLoan.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ loans: rows.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;

  const body = await req.json();
  const employeeId = String(body.employeeId || "").trim();
  const type = String(body.type || "").trim();
  if (!employeeId) return NextResponse.json({ error: "employeeId is required." }, { status: 400 });
  if (!["Vehicle Loan", "Personal Loan", "Salary Advance", "Education Loan"].includes(type)) {
    return NextResponse.json({ error: "Invalid loan type." }, { status: 400 });
  }

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const principal = Math.round((Number(body.principal) || 0) * 100);
  const interestRate = Number(body.interestRate) || 0;
  const tenureMonths = Math.max(1, Math.round(Number(body.tenureMonths) || 6));
  const emi = Math.round((principal * (1 + (interestRate / 100) * (tenureMonths / 12))) / tenureMonths);
  const now = new Date();
  const startDate = now;
  const endDate = new Date(now.getFullYear(), now.getMonth() + tenureMonths, 5);

  const count = await db.payrollLoan.count({ where: { companyId: sessionUser.companyId } });
  const code = `RZ-LON-${String(count + 1).padStart(3, "0")}`;

  const created = await db.$transaction(async (tx) => {
    const loan = await tx.payrollLoan.create({
      data: {
        companyId: sessionUser.companyId,
        code,
        employeeId: employee.id,
        type,
        principal,
        interestRate,
        tenureMonths,
        emi,
        disbursedDate: now,
        startDate,
        endDate,
        status: "Active",
        // First EMI is treated as already recovered against this disbursal,
        // matching the mock's own onSave() behaviour.
        outstanding: Math.max(0, principal - emi),
        remarks: body.remarks || null,
      },
    });
    for (let i = 0; i < tenureMonths; i++) {
      const dueDate = new Date(now.getFullYear(), now.getMonth() + i, 5);
      await tx.payrollLoanInstallment.create({
        data: {
          loanId: loan.id,
          no: i + 1,
          dueDate,
          amount: emi,
          status: i === 0 ? "Paid" : "Pending",
          paidDate: i === 0 ? now : null,
        },
      });
    }
    return tx.payrollLoan.findUniqueOrThrow({ where: { id: loan.id }, include: INCLUDE });
  });

  await logAudit({
    sessionUser,
    action: "CREATE",
    entity: "PayrollLoan",
    entityId: created.id,
    description: `Disbursed ${type} ${created.code} to ${employee.name}`,
  });
  return NextResponse.json({ loan: toDTO(created) }, { status: 201 });
}
