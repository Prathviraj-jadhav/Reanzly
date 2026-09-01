import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { computeResourceMetrics, startOfWeek } from "../../_lib";

const EDITABLE_FIELDS = ["code", "name", "designation", "homeBase", "status", "shiftStart", "shiftEnd"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "planning");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.planningResource.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  if ("skills" in body) {
    data.skills = Array.isArray(body.skills) ? body.skills.join(", ") : (body.skills || null);
  }

  const updated = await db.planningResource.update({ where: { id }, data });
  const metrics = await computeResourceMetrics(sessionUser.companyId, startOfWeek());
  const m = metrics.get(id);
  return NextResponse.json({
    resource: {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      type: updated.type,
      designation: updated.designation ?? undefined,
      homeBase: updated.homeBase,
      status: updated.status,
      shiftStart: updated.shiftStart,
      shiftEnd: updated.shiftEnd,
      skills: updated.skills ? updated.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      utilisationWeek: m ? Math.min(100, Math.round((m.hours / (7 * 24)) * 100)) : 0,
      allocationsThisWeek: m?.count ?? 0,
      conflicts: m?.conflicts ?? 0,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "planning");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.planningResource.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  await db.planningResource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
