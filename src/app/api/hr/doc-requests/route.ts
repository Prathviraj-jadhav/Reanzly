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

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const requests = await db.hrDocumentRequest.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { requestedOn: "desc" },
  });
  return NextResponse.json({ docRequests: requests.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const body = await req.json();
  const empId = String(body.empId || "").trim();
  const docType = String(body.docType || "").trim();
  if (!empId || !docType) {
    return NextResponse.json({ error: "empId and docType are required." }, { status: 400 });
  }

  const created = await db.hrDocumentRequest.create({
    data: {
      companyId: sessionUser.companyId,
      empId,
      empCode: body.empCode || "",
      empName: body.empName || "",
      docType,
      reason: body.reason || "",
      requestedOn: body.requestedOn ? new Date(body.requestedOn) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 7 * 86400000),
      status: body.status || "Pending",
    },
  });
  return NextResponse.json({ docRequest: toDTO(created) }, { status: 201 });
}
