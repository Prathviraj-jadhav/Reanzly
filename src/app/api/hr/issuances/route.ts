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

async function nextDocumentId(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await db.hrIssuance.findMany({
    where: { companyId, documentId: { startsWith: `ISS-${year}-` } },
    select: { documentId: true },
  });
  let max = 0;
  for (const e of existing) {
    const n = parseInt(e.documentId.split("-").pop() || "0", 10);
    if (!isNaN(n)) max = Math.max(max, n);
  }
  return `ISS-${year}-${String(max + 1).padStart(4, "0")}`;
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const issuances = await db.hrIssuance.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { issuedOn: "desc" },
  });
  return NextResponse.json({ issuances: issuances.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const body = await req.json();
  const type = String(body.type || "").trim();
  const employeeId = String(body.employeeId || "").trim();
  if (!type || !employeeId) {
    return NextResponse.json({ error: "type and employeeId are required." }, { status: 400 });
  }

  const documentId = await nextDocumentId(sessionUser.companyId);

  const created = await db.hrIssuance.create({
    data: {
      companyId: sessionUser.companyId,
      documentId,
      type,
      category: body.category || "",
      employeeId,
      employeeName: body.employeeName || "",
      designation: body.designation || "",
      branch: body.branch || "",
      status: body.status || "Draft",
      issuedBy: sessionUser.name,
      issuedOn: body.issuedOn ? new Date(body.issuedOn) : new Date(),
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      format: body.format || "A4",
      letterhead: body.letterhead ?? true,
      watermark: body.watermark ?? false,
      branded: body.branded || "reanzly",
      theme: body.theme || "monochrome",
      font: body.font || "sans",
      ccManager: body.ccManager ?? false,
      bccHrHead: body.bccHrHead ?? false,
      fieldsJson: JSON.stringify(body.fields || {}),
      eSignPending: body.eSignPending ?? false,
    },
  });
  return NextResponse.json({ issuance: toDTO(created) }, { status: 201 });
}
