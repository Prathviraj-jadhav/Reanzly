import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

function toDTO(r: {
  id: string; empId: string; empCode: string; empName: string; docType: string;
  reason: string; requestedOn: Date; dueDate: Date; status: string; receivedOn: Date | null;
}) {
  return {
    id: r.id,
    empId: r.empId,
    empCode: r.empCode,
    empName: r.empName,
    docType: r.docType,
    reason: r.reason,
    requestedOn: r.requestedOn.toISOString(),
    dueDate: r.dueDate.toISOString(),
    status: r.status,
    receivedOn: r.receivedOn ? r.receivedOn.toISOString() : undefined,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.hrDocumentRequest.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Document request not found." }, { status: 404 });

  const body = await req.json();
  const status = String(body.status || "").trim();
  if (!["Pending", "Received", "Overdue", "Cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const updated = await db.hrDocumentRequest.update({
    where: { id },
    data: { status, receivedOn: status === "Received" ? new Date() : existing.receivedOn },
  });
  return NextResponse.json({ docRequest: toDTO(updated) });
}
