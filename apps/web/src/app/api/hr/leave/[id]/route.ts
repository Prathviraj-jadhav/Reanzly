import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { notifyRole } from "@/lib/notify";

const INCLUDE = { employee: { select: { code: true, name: true, designation: true } } } as const;
import type { Prisma } from "@prisma/client";
type Row = Prisma.LeaveRequestGetPayload<{ include: typeof INCLUDE }>;

function toDTO(r: NonNullable<Row>) {
  return {
    id: r.id, empId: r.employeeId, empName: r.employee.name, empCode: r.employee.code,
    designation: r.employee.designation, leaveType: r.type,
    from: r.fromDate.toISOString().slice(0, 10), to: r.toDate.toISOString().slice(0, 10),
    days: r.days, reason: r.reason ?? "", approver: r.approverId ?? "", status: r.status,
    appliedOn: r.createdAt.toISOString(), reviewedOn: r.approvedAt ? r.approvedAt.toISOString() : undefined,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.leaveRequest.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "Approved" || body.status === "Rejected") data.approvedAt = new Date();
  }
  if (body.reason !== undefined) data.reason = body.reason || null;
  if (body.approver !== undefined) data.approverId = body.approver || null;

  const updated = await db.leaveRequest.update({ where: { id }, data, include: INCLUDE });

  if (body.status === "Approved" || body.status === "Rejected") {
    const approved = body.status === "Approved";
    await logAudit({
      sessionUser,
      action: approved ? "APPROVE" : "REJECT",
      entity: "LeaveRequest",
      entityId: updated.id,
      description: `${approved ? "Approved" : "Rejected"} ${updated.type} leave for ${updated.employee.name} (${updated.days}d)`,
    });
    if (sessionUser.role !== "owner") {
      await notifyRole({
        companyId: sessionUser.companyId,
        roleId: "owner",
        category: "HR",
        title: approved ? "Leave request approved" : "Leave request rejected",
        description: `${updated.employee.name}'s ${updated.type} leave (${updated.days}d) was ${approved ? "approved" : "rejected"} by ${sessionUser.name}.`,
        severity: approved ? "info" : "warning",
        link: { module: "hr", id: updated.id },
      });
    }
  }

  return NextResponse.json({ leaveRequest: toDTO(updated) });
}
