import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const INCLUDE = { employee: { select: { code: true, name: true, designation: true, department: true } } } as const;
type Row = Awaited<ReturnType<typeof db.payrollReimbursement.findFirst<{ include: typeof INCLUDE }>>>;

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
    status: r.status as "Pending" | "Approved" | "Rejected" | "Paid",
    submittedDate: r.submittedDate.toISOString(),
    approvedDate: r.approvedDate ? r.approvedDate.toISOString() : undefined,
    approvedBy: r.approvedBy ?? undefined,
    paidDate: r.paidDate ? r.paidDate.toISOString() : undefined,
    description: r.description,
    receipts: r.receipts,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.payrollReimbursement.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Reimbursement not found." }, { status: 404 });
  }

  const body = await req.json();
  const action = body.action;

  if (action === "approve") {
    if (existing.status !== "Pending") return NextResponse.json({ error: "Reimbursement already processed." }, { status: 400 });
    const updated = await db.payrollReimbursement.update({
      where: { id },
      data: { status: "Approved", approvedDate: new Date(), approvedBy: sessionUser.name },
      include: INCLUDE,
    });
    await logAudit({ sessionUser, action: "APPROVE", entity: "PayrollReimbursement", entityId: id, description: `Approved reimbursement ${updated.code}` });
    return NextResponse.json({ reimbursement: toDTO(updated) });
  }

  if (action === "reject") {
    if (existing.status !== "Pending") return NextResponse.json({ error: "Reimbursement already processed." }, { status: 400 });
    const updated = await db.payrollReimbursement.update({
      where: { id },
      data: { status: "Rejected", approvedDate: new Date(), approvedBy: sessionUser.name },
      include: INCLUDE,
    });
    await logAudit({ sessionUser, action: "REJECT", entity: "PayrollReimbursement", entityId: id, description: `Rejected reimbursement ${updated.code}` });
    return NextResponse.json({ reimbursement: toDTO(updated) });
  }

  if (action === "mark-paid") {
    if (existing.status !== "Approved") return NextResponse.json({ error: "Reimbursement must be Approved first." }, { status: 400 });
    const updated = await db.payrollReimbursement.update({
      where: { id },
      data: { status: "Paid", paidDate: new Date() },
      include: INCLUDE,
    });
    await logAudit({ sessionUser, action: "STATUS_CHANGE", entity: "PayrollReimbursement", entityId: id, description: `Marked reimbursement ${updated.code} as paid` });
    return NextResponse.json({ reimbursement: toDTO(updated) });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
