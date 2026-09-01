import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const EDITABLE_FIELDS = ["type", "title", "refNo", "durationHours", "status", "location"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "planning");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.planningAllocation.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Allocation not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  if ("startAt" in body && body.startAt) data.startAt = new Date(body.startAt);
  if ("resourceId" in body && body.resourceId) {
    const resource = await db.planningResource.findUnique({ where: { id: body.resourceId } });
    if (!resource || resource.companyId !== sessionUser.companyId) {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }
    data.resourceId = body.resourceId;
  }

  const updated = await db.planningAllocation.update({ where: { id }, data });
  return NextResponse.json({
    allocation: {
      id: updated.id,
      resourceId: updated.resourceId,
      type: updated.type,
      title: updated.title,
      refNo: updated.refNo,
      startAt: updated.startAt.toISOString(),
      durationHours: updated.durationHours,
      status: updated.status,
      location: updated.location ?? undefined,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "planning");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.planningAllocation.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Allocation not found." }, { status: 404 });
  }

  await db.planningAllocation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
