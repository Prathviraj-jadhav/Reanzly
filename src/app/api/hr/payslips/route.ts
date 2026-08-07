import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const INCLUDE = { employee: { select: { code: true, name: true, designation: true } } } as const;
type Row = Awaited<ReturnType<typeof db.payslip.findFirst<{ include: typeof INCLUDE }>>>;

function toDTO(p: NonNullable<Row>) {
  const gross = p.basic + p.hra + p.conveyance + p.overtime + p.allowances + p.incentives;
  const totalDeductions = p.pfDeduct + p.esiDeduct + p.ptDeduct + p.tdsDeduct + p.advanceDeduct + p.otherDeduct;
  return {
    id: p.id,
    empId: p.employeeId,
    empCode: p.employee.code,
    empName: p.employee.name,
    designation: p.employee.designation,
    month: p.month,
    basic: Math.round(p.basic / 100),
    hra: Math.round(p.hra / 100),
    conveyance: Math.round(p.conveyance / 100),
    ot: Math.round(p.overtime / 100),
    allowances: Math.round(p.allowances / 100),
    incentive: Math.round(p.incentives / 100),
    pf: Math.round(p.pfDeduct / 100),
    esi: Math.round(p.esiDeduct / 100),
    pt: Math.round(p.ptDeduct / 100),
    tds: Math.round(p.tdsDeduct / 100),
    advance: Math.round(p.advanceDeduct / 100),
    otherDeductions: Math.round(p.otherDeduct / 100),
    gross: Math.round(gross / 100),
    totalDeductions: Math.round(totalDeductions / 100),
    netPay: Math.round(p.netPay / 100),
    status: p.status,
  };
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const month = req.nextUrl.searchParams.get("month");
  const where: Record<string, unknown> = { companyId: sessionUser.companyId };
  if (month) where.month = month;
  const payslips = await db.payslip.findMany({ where, include: INCLUDE, orderBy: { month: "desc" } });
  return NextResponse.json({ payslips: payslips.map(toDTO) });
}
