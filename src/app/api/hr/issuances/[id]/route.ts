import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

function toDTO(i: {
  id: string; documentId: string; type: string; category: string; employeeId: string;
  employeeName: string; designation: string; branch: string; status: string; issuedBy: string;
  issuedOn: Date; validUntil: Date | null; format: string; letterhead: boolean; watermark: boolean;
  branded: string; theme: string; font: string; ccManager: boolean; bccHrHead: boolean;
  fieldsJson: string; eSignPending: boolean;
}) {
  let fields: Record<string, string> = {};
  try {
    fields = JSON.parse(i.fieldsJson);
  } catch {
    fields = {};
  }
  return {
    id: i.id,
    documentId: i.documentId,
    type: i.type,
    category: i.category,
    employeeId: i.employeeId,
    employeeName: i.employeeName,
    designation: i.designation,
    branch: i.branch,
    status: i.status,
    issuedBy: i.issuedBy,
    issuedOn: i.issuedOn.toISOString(),
    validUntil: i.validUntil ? i.validUntil.toISOString() : undefined,
    format: i.format,
    letterhead: i.letterhead,
    watermark: i.watermark,
    branded: i.branded,
    theme: i.theme,
    font: i.font,
    ccManager: i.ccManager,
    bccHrHead: i.bccHrHead,
    fields,
    eSignPending: i.eSignPending || undefined,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.hrIssuance.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Issuance not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!["Draft", "Sent", "Accepted", "E-Signed", "Expired", "Revoked"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = body.status;
    if (body.status === "Revoked" || body.status === "E-Signed" || body.status === "Accepted") {
      data.eSignPending = false;
    }
  }

  const updated = await db.hrIssuance.update({ where: { id }, data });
  return NextResponse.json({ issuance: toDTO(updated) });
}
