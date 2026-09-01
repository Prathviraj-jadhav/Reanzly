import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const INCLUDE = { employee: { select: { code: true, name: true, designation: true } } } as const;
import type { Prisma } from "@prisma/client";
type Row = Prisma.LeaveRequestGetPayload<{ include: typeof INCLUDE }>;

function toDTO(r: NonNullable<Row>) {
  return {
    id: r.id,
    empId: r.employeeId,
    empName: r.employee.name,
    empCode: r.employee.code,
    designation: r.employee.designation,
    leaveType: r.type,
    from: r.fromDate.toISOString().slice(0, 10),
    to: r.toDate.toISOString().slice(0, 10),
    days: r.days,
    reason: r.reason ?? "",
    approver: r.approverId ?? "",
    status: r.status,
    appliedOn: r.createdAt.toISOString(),
    reviewedOn: r.approvedAt ? r.approvedAt.toISOString() : undefined,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;
  const requests = await db.leaveRequest.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ leaveRequests: requests.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const body = await req.json();
  const empId = String(body.empId || "");
  const emp = await db.employee.findUnique({ where: { id: empId } });
  if (!emp || emp.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Employee not found." }, { status: 400 });
  }
  if (!body.from || !body.to) {
    return NextResponse.json({ error: "from and to dates are required." }, { status: 400 });
  }

  const created = await db.leaveRequest.create({
    data: {
      companyId: sessionUser.companyId,
      employeeId: empId,
      type: body.leaveType || "CL",
      fromDate: new Date(body.from),
      toDate: new Date(body.to),
      days: Number.isFinite(body.days) ? body.days : 1,
      reason: body.reason || null,
      approverId: body.approver || null,
    },
    include: INCLUDE,
  });
  return NextResponse.json({ leaveRequest: toDTO(created) }, { status: 201 });
}
