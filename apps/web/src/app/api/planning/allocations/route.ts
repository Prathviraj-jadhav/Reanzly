import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { findConflictIds, parseWeekStart } from "../_lib";

function toDTO(a: {
  id: string; resourceId: string; type: string; title: string; refNo: string;
  startAt: Date; durationHours: number; status: string; location: string | null;
}) {
  return {
    id: a.id,
    resourceId: a.resourceId,
    type: a.type,
    title: a.title,
    refNo: a.refNo,
    startAt: a.startAt.toISOString(),
    durationHours: a.durationHours,
    status: a.status,
    location: a.location ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "planning");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const weekStart = parseWeekStart(searchParams.get("weekStart"));
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  const allocations = await db.planningAllocation.findMany({
    where: { companyId: sessionUser.companyId, startAt: { gte: weekStart, lt: weekEnd } },
    orderBy: { startAt: "asc" },
  });
  const conflictIds = findConflictIds(allocations);

  return NextResponse.json({
    allocations: allocations.map(toDTO),
    conflictIds: Array.from(conflictIds),
  });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "planning");
  if (denied) return denied;

  const body = await req.json();
  const resourceId = String(body.resourceId || "").trim();
  const title = String(body.title || "").trim();
  const startAt = body.startAt ? new Date(body.startAt) : null;
  const durationHours = Number.isFinite(body.durationHours) ? body.durationHours : 0;
  if (!resourceId || !title || !startAt || durationHours <= 0) {
    return NextResponse.json({ error: "resourceId, title, startAt, and a positive durationHours are required." }, { status: 400 });
  }

  const resource = await db.planningResource.findUnique({ where: { id: resourceId } });
  if (!resource || resource.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  const refNo = String(body.refNo || "").trim() || `OPS-${Date.now().toString(36).toUpperCase()}`;

  const created = await db.planningAllocation.create({
    data: {
      companyId: sessionUser.companyId,
      resourceId,
      type: body.type || "Trip",
      title,
      refNo,
      startAt,
      durationHours,
      status: body.status || "Planned",
      location: body.location || resource.homeBase,
    },
  });

  return NextResponse.json({ allocation: toDTO(created) }, { status: 201 });
}
