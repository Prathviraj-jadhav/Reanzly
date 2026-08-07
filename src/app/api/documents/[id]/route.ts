import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const EDITABLE_FIELDS = ["name", "type", "status", "uploadedBy"] as const;
const INCLUDE = { vehicle: { select: { name: true } }, driver: { select: { name: true } } } as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.document.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  if ("issueDate" in body) data.issueDate = body.issueDate ? new Date(body.issueDate) : null;
  if ("expiryDate" in body) data.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;

  const updated = await db.document.update({ where: { id }, data, include: INCLUDE });
  return NextResponse.json({
    document: {
      id: updated.id,
      name: updated.name,
      type: updated.type,
      entityType: updated.entityType,
      entityName: updated.vehicle?.name ?? updated.driver?.name ?? updated.entityId ?? "Unknown",
      issueDate: updated.issueDate ? updated.issueDate.toISOString() : "",
      expiryDate: updated.expiryDate ? updated.expiryDate.toISOString() : undefined,
      status: updated.status,
      uploadedBy: updated.uploadedBy ?? "",
      uploadDate: updated.uploadDate.toISOString(),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.document.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  await db.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
