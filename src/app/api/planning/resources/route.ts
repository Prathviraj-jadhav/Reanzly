import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { computeResourceMetrics, parseWeekStart } from "../_lib";

function toDTO(
  r: {
    id: string; code: string; name: string; type: string; designation: string | null;
    homeBase: string; status: string; shiftStart: string; shiftEnd: string; skills: string | null;
  },
  metrics: { hours: number; count: number; conflicts: number } | undefined,
) {
  // utilisationWeek = scheduled hours / (7 days * 24h) - matches the mock's
  // 0-100% definition (a Bay/Vehicle scheduled around the clock hits 100%).
  const utilisationWeek = metrics ? Math.min(100, Math.round((metrics.hours / (7 * 24)) * 100)) : 0;
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    type: r.type,
    designation: r.designation ?? undefined,
    homeBase: r.homeBase,
    status: r.status,
    shiftStart: r.shiftStart,
    shiftEnd: r.shiftEnd,
    skills: r.skills ? r.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
    utilisationWeek,
    allocationsThisWeek: metrics?.count ?? 0,
    conflicts: metrics?.conflicts ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "planning");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const weekStart = parseWeekStart(searchParams.get("weekStart"));

  const [resources, metricsByResource] = await Promise.all([
    db.planningResource.findMany({
      where: { companyId: sessionUser.companyId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    computeResourceMetrics(sessionUser.companyId, weekStart),
  ]);

  return NextResponse.json({
    resources: resources.map((r) => toDTO(r, metricsByResource.get(r.id))),
  });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "planning");
  if (denied) return denied;

  const body = await req.json();
  const name = String(body.name || "").trim();
  const type = String(body.type || "").trim();
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });
  if (!["Driver", "Vehicle", "Bay"].includes(type)) {
    return NextResponse.json({ error: "type must be Driver, Vehicle, or Bay." }, { status: 400 });
  }

  const code = String(body.code || "").trim() || `${type.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const created = await db.planningResource.create({
    data: {
      companyId: sessionUser.companyId,
      code,
      name,
      type,
      designation: body.designation || null,
      homeBase: body.homeBase || "",
      status: body.status || "Available",
      shiftStart: body.shiftStart || "06:00",
      shiftEnd: body.shiftEnd || "18:00",
      skills: Array.isArray(body.skills) ? body.skills.join(", ") : (body.skills || null),
    },
  });

  return NextResponse.json({ resource: toDTO(created, undefined) }, { status: 201 });
}
