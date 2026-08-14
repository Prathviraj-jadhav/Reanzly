import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// Real CRUD for the Bonus & Incentives tab, replacing the client-only
// BONUSES mock array. employeeId is a real FK to Employee - name/
// designation/department are resolved server-side, never trusted from the
// client body.

const INCLUDE = { employee: { select: { code: true, name: true, designation: true, department: true } } } as const;
type Row = Awaited<ReturnType<typeof db.payrollBonus.findFirst<{ include: typeof INCLUDE }>>>;

function toDTO(r: NonNullable<Row>) {
  return {
    id: r.id,
    code: r.code,
    empCode: r.employee.code,
    empName: r.employee.name,
    designation: r.employee.designation,
    department: r.employee.department ?? "Operations",
    month: r.month,
    type: r.type,
    amount: Math.round(r.amount / 100),
    status: r.status as "Pending" | "Approved" | "Paid" | "Cancelled",
    approvedDate: r.approvedDate ? r.approvedDate.toISOString() : undefined,
    approvedBy: r.approvedBy ?? undefined,
    paidDate: r.paidDate ? r.paidDate.toISOString() : undefined,
    description: r.description,
    tripsCount: r.tripsCount ?? undefined,
    perTripAmount: r.perTripAmount != null ? Math.round(r.perTripAmount / 100) : undefined,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const rows = await db.payrollBonus.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ bonuses: rows.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;

  const body = await req.json();
  const employeeId = String(body.employeeId || "").trim();
  const type = String(body.type || "").trim();
  const month = String(body.month || "").trim();
  const description = String(body.description || "").trim();
  if (!employeeId) return NextResponse.json({ error: "employeeId is required." }, { status: 400 });
  if (!["Performance", "Trip Incentive", "Festival", "Retention", "Referral"].includes(type)) {
    return NextResponse.json({ error: "Invalid bonus type." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "month must be in YYYY-MM format." }, { status: 400 });
  if (!description) return NextResponse.json({ error: "description is required." }, { status: 400 });

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const isTripIncentive = type === "Trip Incentive";
  const tripsCount = isTripIncentive ? Math.round(Number(body.tripsCount) || 0) : null;
  const perTripAmountPaise = isTripIncentive ? Math.round((Number(body.perTripAmount) || 0) * 100) : null;
  const amount = isTripIncentive
    ? (tripsCount ?? 0) * (perTripAmountPaise ?? 0)
    : Math.round((Number(body.amount) || 0) * 100);

  const count = await db.payrollBonus.count({ where: { companyId: sessionUser.companyId } });
  const created = await db.payrollBonus.create({
    data: {
      companyId: sessionUser.companyId,
      code: `RZ-BNS-${month.replace("-", "")}-${String(count + 1).padStart(3, "0")}`,
      employeeId: employee.id,
      type,
      month,
      amount,
      status: "Pending",
      description,
      tripsCount: tripsCount ?? undefined,
      perTripAmount: perTripAmountPaise ?? undefined,
    },
    include: INCLUDE,
  });
  await logAudit({
    sessionUser,
    action: "CREATE",
    entity: "PayrollBonus",
    entityId: created.id,
    description: `Created ${type} bonus ${created.code} for ${employee.name}`,
  });
  return NextResponse.json({ bonus: toDTO(created) }, { status: 201 });
}
