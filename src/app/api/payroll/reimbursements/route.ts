import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// Real CRUD for the Reimbursements tab, replacing the client-only
// REIMBURSEMENTS mock array. employeeId is a real FK to Employee - name/
// designation/department are resolved server-side from that row, never
// trusted from the client body.

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

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const rows = await db.payrollReimbursement.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { submittedDate: "desc" },
  });
  return NextResponse.json({ reimbursements: rows.map(toDTO) });
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
  if (!["Fuel", "Travel", "Food", "Mobile", "Stationery", "Medical"].includes(type)) {
    return NextResponse.json({ error: "Invalid reimbursement type." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "month must be in YYYY-MM format." }, { status: 400 });
  if (!description) return NextResponse.json({ error: "description is required." }, { status: 400 });

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const count = await db.payrollReimbursement.count({ where: { companyId: sessionUser.companyId } });
  const created = await db.payrollReimbursement.create({
    data: {
      companyId: sessionUser.companyId,
      code: `RZ-RMB-${month.replace("-", "")}-${String(count + 1).padStart(3, "0")}`,
      employeeId: employee.id,
      type,
      month,
      amount: Math.round((Number(body.amount) || 0) * 100),
      status: "Pending",
      description,
      receipts: Number.isFinite(body.receipts) ? Number(body.receipts) : 1,
    },
    include: INCLUDE,
  });
  await logAudit({
    sessionUser,
    action: "CREATE",
    entity: "PayrollReimbursement",
    entityId: created.id,
    description: `Submitted ${type} reimbursement ${created.code} for ${employee.name}`,
  });
  return NextResponse.json({ reimbursement: toDTO(created) }, { status: 201 });
}
