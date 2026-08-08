import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const INCLUDE = { employee: { select: { code: true, name: true, designation: true, department: true, bankAccount: true, bankIfsc: true, bankName: true, structure: { select: { name: true } } } } } as const;
type Row = Awaited<ReturnType<typeof db.payslip.findFirst<{ include: typeof INCLUDE }>>>;

function toDTO(p: NonNullable<Row>) {
  const gross = p.basic + p.da + p.hra + p.conveyance + p.medicalAllowance + p.specialAllowance + p.statutoryBonus + p.overtime + p.incentives;
  const totalDeductions = p.pfDeduct + p.esiDeduct + p.tdsDeduct + p.ptDeduct + p.advanceDeduct + p.otherDeduct;
  return {
    id: p.id,
    payslipNo: p.payslipNo,
    month: p.month,
    empCode: p.employee.code,
    empName: p.employee.name,
    designation: p.employee.designation,
    department: p.employee.department ?? "Operations",
    structure: p.employee.structure?.name ?? "-",
    bankAccount: p.employee.bankAccount ?? "",
    bankIfsc: p.employee.bankIfsc ?? "",
    bankName: p.employee.bankName ?? "",
    basic: Math.round(p.basic / 100),
    da: Math.round(p.da / 100),
    hra: Math.round(p.hra / 100),
    conveyance: Math.round(p.conveyance / 100),
    medicalAllowance: Math.round(p.medicalAllowance / 100),
    specialAllowance: Math.round(p.specialAllowance / 100),
    statutoryBonus: Math.round(p.statutoryBonus / 100),
    incentive: Math.round(p.incentives / 100),
    pf: Math.round(p.pfDeduct / 100),
    esi: Math.round(p.esiDeduct / 100),
    tds: Math.round(p.tdsDeduct / 100),
    pt: Math.round(p.ptDeduct / 100),
    otherDeductions: Math.round(p.otherDeduct / 100),
    status: p.status,
    netPay: Math.round(p.netPay / 100),
    gross: Math.round(gross / 100),
    totalDeductions: Math.round(totalDeductions / 100),
    employerPF: Math.round(p.employerPF / 100),
    employerESI: Math.round(p.employerESI / 100),
    // Real YTD, computed from every real payslip this employee has this
    // fiscal year - not a stored, driftable counter.
    presentDays: p.presentDays,
    lopDays: p.lopDays,
    // Payslip status changes aren't individually tracked (no per-event log
    // table for this yet) - this is the one real event we do know happened.
    audit: [{ id: `${p.id}-created`, at: p.createdAt.toISOString(), by: "System", action: "Payslip generated" }],
  };
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const month = req.nextUrl.searchParams.get("month");
  const where: Record<string, unknown> = { companyId: sessionUser.companyId };
  if (month) where.month = month;
  const payslips = await db.payslip.findMany({ where, include: INCLUDE, orderBy: { month: "desc" } });

  // Real YTD sums per employee (current fiscal year, Apr-Mar) computed from
  // every real payslip on file for them - not a stored counter.
  const empIds = [...new Set(payslips.map((p) => p.employeeId))];
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(fyStartYear, 3 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const ytdRows = await db.payslip.findMany({
    where: { companyId: sessionUser.companyId, employeeId: { in: empIds }, month: { in: fyMonths } },
  });
  const ytd = new Map<string, { gross: number; deductions: number; net: number }>();
  for (const r of ytdRows) {
    const gross = r.basic + r.da + r.hra + r.conveyance + r.medicalAllowance + r.specialAllowance + r.statutoryBonus + r.overtime + r.incentives;
    const deductions = r.pfDeduct + r.esiDeduct + r.tdsDeduct + r.ptDeduct + r.advanceDeduct + r.otherDeduct;
    const cur = ytd.get(r.employeeId) ?? { gross: 0, deductions: 0, net: 0 };
    cur.gross += gross; cur.deductions += deductions; cur.net += r.netPay;
    ytd.set(r.employeeId, cur);
  }

  return NextResponse.json({
    payslips: payslips.map((p) => {
      const y = ytd.get(p.employeeId) ?? { gross: 0, deductions: 0, net: 0 };
      return { ...toDTO(p), ytdGross: Math.round(y.gross / 100), ytdDeductions: Math.round(y.deductions / 100), ytdNet: Math.round(y.net / 100) };
    }),
  });
}
