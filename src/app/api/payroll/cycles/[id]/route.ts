import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const INCLUDE = { _count: { select: { payslips: true } } } as const;
type Row = Awaited<ReturnType<typeof db.payrollRun.findFirst<{ include: typeof INCLUDE }>>>;

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
    id: r.id, cycleNo: r.cycleNo, month: r.month, status: r.status, locked: r.locked,
    payDate: r.paidAt ? r.paidAt.toISOString() : undefined,
    approvedDate: r.approvedAt ? r.approvedAt.toISOString() : undefined,
    submittedDate: r.createdAt.toISOString(),
    headcount: r._count.payslips,
    grossTotal: Math.round(r.grossTotal / 100),
    deductionsTotal: Math.round(r.deductTotal / 100),
    netTotal: Math.round(r.netTotal / 100),
    employerContribTotal: Math.round(r.employerContribTotal / 100),
    approvedBy: r.approvedBy ?? undefined, runBy: r.runBy ?? undefined, remarks: r.remarks ?? undefined,
    audit: realAudit(r),
  };
}

// Real Indian payroll math: basic/DA/HRA as % of monthly CTC (matching the
// structures.tsx UI's own formula exactly), special allowance is the
// remainder after every other component - same math the Structures tab
// itself displays, now actually used to generate real payslips.
function computeSplit(ctcAnnualPaise: number, s: { basicPct: number; daPct: number; hraPct: number; specialAllowance: number; conveyance: number; medicalAllowance: number; statutoryBonus: number; pfPct: number; esiApplicable: boolean; ptApplicable: boolean }) {
  const monthly = ctcAnnualPaise / 12;
  const basic = Math.round(monthly * (s.basicPct / 100));
  const da = Math.round(monthly * (s.daPct / 100));
  const hra = Math.round(monthly * (s.hraPct / 100));
  const conveyance = s.conveyance;
  const medicalAllowance = s.medicalAllowance;
  const statutoryBonus = s.statutoryBonus;
  const special = Math.max(0, Math.round(monthly - basic - da - hra - conveyance - medicalAllowance - statutoryBonus));
  const pf = Math.round(basic * (s.pfPct / 100));
  const employerPF = Math.round(basic * 0.1333);
  const esi = s.esiApplicable ? Math.round((basic + hra) * 0.0175) : 0;
  const employerESI = s.esiApplicable ? Math.round((basic + hra) * 0.0475) : 0;
  const pt = s.ptApplicable ? 20000 : 0;
  const gross = basic + da + hra + conveyance + medicalAllowance + statutoryBonus + special;
  const deductions = pf + esi + pt;
  return { basic, da, hra, conveyance, medicalAllowance, statutoryBonus, special, pf, esi, pt, employerPF, employerESI, gross, deductions, net: gross - deductions };
}

const DEFAULT_STRUCTURE = { basicPct: 40, daPct: 10, hraPct: 20, specialAllowance: 0, conveyance: 160000, medicalAllowance: 125000, statutoryBonus: 0, pfPct: 12, esiApplicable: false, ptApplicable: true };

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.payrollRun.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Cycle not found." }, { status: 404 });
  }

  const body = await req.json();
  const action = body.action;

  if (action === "run") {
    if (existing.locked) return NextResponse.json({ error: "Cycle is locked - unlock it before re-running." }, { status: 400 });
    const employees = await db.employee.findMany({
      where: { companyId: sessionUser.companyId, status: { in: ["Active", "On Leave"] } },
      include: { structure: true },
    });
    if (employees.length === 0) return NextResponse.json({ error: "No active employees to run payroll for." }, { status: 400 });

    const updated = await db.$transaction(async (tx) => {
      await tx.payslip.deleteMany({ where: { payrollRunId: id } });
      let grossTotal = 0, deductTotal = 0, netTotal = 0, employerContribTotal = 0;
      for (const [i, emp] of employees.entries()) {
        const s = emp.structure ?? DEFAULT_STRUCTURE;
        const split = computeSplit(emp.ctcAnnual, s);
        grossTotal += split.gross; deductTotal += split.deductions; netTotal += split.net;
        employerContribTotal += split.employerPF + split.employerESI;
        await tx.payslip.create({
          data: {
            payslipNo: `RZ-PAY-${Date.now().toString(36).toUpperCase()}-${i}`,
            companyId: sessionUser.companyId, payrollRunId: id, employeeId: emp.id, month: existing.month,
            basic: split.basic, da: split.da, hra: split.hra, conveyance: split.conveyance,
            medicalAllowance: split.medicalAllowance, specialAllowance: split.special, statutoryBonus: split.statutoryBonus,
            allowances: split.special, overtime: 0, incentives: 0,
            pfDeduct: split.pf, esiDeduct: split.esi, ptDeduct: split.pt, tdsDeduct: 0, advanceDeduct: 0, otherDeduct: 0,
            employerPF: split.employerPF, employerESI: split.employerESI, presentDays: 0, lopDays: 0,
            netPay: split.net, status: "Draft",
          },
        });
      }
      return tx.payrollRun.update({
        where: { id },
        data: { status: "Processing", runBy: sessionUser.name, grossTotal, deductTotal, netTotal, employerContribTotal },
        include: INCLUDE,
      });
    });
    return NextResponse.json({ cycle: toDTO(updated) });
  }

  if (action === "advance") {
    const order = ["Draft", "Processing", "Approved", "Disbursed"];
    const idx = order.indexOf(existing.status);
    const target = typeof body.status === "string" ? body.status : order[Math.min(order.length - 1, idx + 1)];
    const now = new Date();
    const data: Record<string, unknown> = { status: target };
    if (target === "Approved" || target === "Disbursed") { data.approvedAt = existing.approvedAt ?? now; data.approvedBy = sessionUser.name; }
    if (target === "Disbursed") {
      data.paidAt = now;
      await db.payslip.updateMany({ where: { payrollRunId: id }, data: { status: "Paid" } });
    } else if (target === "Approved") {
      await db.payslip.updateMany({ where: { payrollRunId: id }, data: { status: "Approved" } });
    }
    const updated = await db.payrollRun.update({ where: { id }, data, include: INCLUDE });
    return NextResponse.json({ cycle: toDTO(updated) });
  }

  if (action === "toggle-lock") {
    const updated = await db.payrollRun.update({ where: { id }, data: { locked: !existing.locked }, include: INCLUDE });
    return NextResponse.json({ cycle: toDTO(updated) });
  }

  if (body.remarks !== undefined) {
    const updated = await db.payrollRun.update({ where: { id }, data: { remarks: body.remarks || null }, include: INCLUDE });
    return NextResponse.json({ cycle: toDTO(updated) });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
