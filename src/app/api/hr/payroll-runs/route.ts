import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const INCLUDE = { _count: { select: { payslips: true } } } as const;
type Row = Awaited<ReturnType<typeof db.payrollRun.findFirst<{ include: typeof INCLUDE }>>>;

function toDTO(r: NonNullable<Row>) {
  return {
    id: r.id,
    month: r.month,
    generatedOn: r.createdAt.toISOString(),
    approvedOn: r.approvedAt ? r.approvedAt.toISOString() : undefined,
    disbursedOn: r.paidAt ? r.paidAt.toISOString() : undefined,
    status: r.status,
    totalGross: Math.round(r.grossTotal / 100),
    totalDeductions: Math.round(r.deductTotal / 100),
    totalNet: Math.round(r.netTotal / 100),
    employeeCount: r._count.payslips,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;
  const runs = await db.payrollRun.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { month: "desc" },
  });
  return NextResponse.json({ payrollRuns: runs.map(toDTO) });
}

// Generates a real payroll run for a month from the company's real active
// Employees - each gets a real Payslip row computed from their real
// ctcAnnual/basicMonthly/hraMonthly, not a scripted mock figure.
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const body = await req.json();
  const month = String(body.month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be in YYYY-MM format." }, { status: 400 });
  }

  const existing = await db.payrollRun.findUnique({ where: { companyId_month: { companyId: sessionUser.companyId, month } } });
  if (existing) return NextResponse.json({ error: `A payroll run for ${month} already exists.` }, { status: 409 });

  const employees = await db.employee.findMany({ where: { companyId: sessionUser.companyId, status: { in: ["Active", "On Leave"] } } });
  if (employees.length === 0) {
    return NextResponse.json({ error: "No active employees to run payroll for." }, { status: 400 });
  }

  const run = await db.$transaction(async (tx) => {
    let grossTotal = 0, deductTotal = 0, netTotal = 0;
    const created = await tx.payrollRun.create({
      data: {
        cycleNo: `RZ-CYC-${Date.now().toString(36).toUpperCase()}`,
        companyId: sessionUser.companyId, month, status: "Draft", grossTotal: 0, deductTotal: 0, netTotal: 0,
      },
    });
    let employerContribTotal = 0;
    for (const [i, emp] of employees.entries()) {
      const basic = emp.basicMonthly ?? Math.round(emp.ctcAnnual / 12 / 2);
      const hra = emp.hraMonthly ?? Math.round(basic * 0.4);
      const allowances = Math.round(emp.ctcAnnual / 12) - basic - hra;
      const pf = emp.pfEnrolled ? Math.round(basic * 0.12) : 0;
      const esi = emp.esiEnrolled ? Math.round((basic + hra) * 0.0075) : 0;
      const employerPF = emp.pfEnrolled ? Math.round(basic * 0.1333) : 0; // 3.67% + 8.33% EPS
      const employerESI = emp.esiEnrolled ? Math.round((basic + hra) * 0.0475) : 0;
      const pt = 20000; // flat professional tax, paise
      const gross = basic + hra + Math.max(allowances, 0);
      const deductions = pf + esi + pt;
      const net = gross - deductions;
      grossTotal += gross; deductTotal += deductions; netTotal += net;
      employerContribTotal += employerPF + employerESI;
      await tx.payslip.create({
        data: {
          payslipNo: `RZ-PAY-${Date.now().toString(36).toUpperCase()}-${i}`,
          companyId: sessionUser.companyId, payrollRunId: created.id, employeeId: emp.id, month,
          basic, hra, conveyance: 0, allowances: Math.max(allowances, 0), overtime: 0, incentives: 0,
          pfDeduct: pf, esiDeduct: esi, ptDeduct: pt, tdsDeduct: 0, advanceDeduct: 0, otherDeduct: 0,
          employerPF, employerESI, presentDays: 0, lopDays: 0,
          netPay: net, status: "Draft",
        },
      });
    }
    return tx.payrollRun.update({
      where: { id: created.id },
      data: { grossTotal, deductTotal, netTotal, employerContribTotal },
      include: INCLUDE,
    });
  });

  return NextResponse.json({ payrollRun: toDTO(run) }, { status: 201 });
}
