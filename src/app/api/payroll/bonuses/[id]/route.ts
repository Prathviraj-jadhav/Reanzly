import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.payrollBonus.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Bonus not found." }, { status: 404 });
  }

  const body = await req.json();
  const action = body.action;

  if (action === "approve") {
    if (existing.status !== "Pending") return NextResponse.json({ error: "Bonus already processed." }, { status: 400 });
    const updated = await db.payrollBonus.update({
      where: { id },
      data: { status: "Approved", approvedDate: new Date(), approvedBy: sessionUser.name },
      include: INCLUDE,
    });
    await logAudit({ sessionUser, action: "APPROVE", entity: "PayrollBonus", entityId: id, description: `Approved bonus ${updated.code}` });
    return NextResponse.json({ bonus: toDTO(updated) });
  }

  if (action === "cancel") {
    if (existing.status !== "Pending") return NextResponse.json({ error: "Bonus already processed." }, { status: 400 });
    const updated = await db.payrollBonus.update({
      where: { id },
      data: { status: "Cancelled", approvedDate: new Date(), approvedBy: sessionUser.name },
      include: INCLUDE,
    });
    await logAudit({ sessionUser, action: "REJECT", entity: "PayrollBonus", entityId: id, description: `Cancelled bonus ${updated.code}` });
    return NextResponse.json({ bonus: toDTO(updated) });
  }

  if (action === "mark-paid") {
    if (existing.status !== "Approved") return NextResponse.json({ error: "Bonus must be Approved first." }, { status: 400 });
    const updated = await db.payrollBonus.update({
      where: { id },
      data: { status: "Paid", paidDate: new Date() },
      include: INCLUDE,
    });
    await logAudit({ sessionUser, action: "STATUS_CHANGE", entity: "PayrollBonus", entityId: id, description: `Marked bonus ${updated.code} as paid` });
    return NextResponse.json({ bonus: toDTO(updated) });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
