import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

// Real CRUD for the Services module's reusable service-program TEMPLATE
// concept (replacing services/_helpers.tsx's static SERVICE_PROGRAMS
// array). Distinct from the per-vehicle ServiceProgram instance model
// (used by the Vehicles cluster's Maintenance/Service Due scheduling) -
// "linkedVehicles" here is the live count of ServiceProgram rows pointing
// at this template via templateId, not a stored/editable number.

function toTemplateDTO(t: {
  id: string; name: string; vehicleType: string; serviceType: string; triggerType: string;
  intervalValue: number; intervalUnit: string; tasksJson: string; defaultVendor: string | null;
  estDurationHours: number | null; estCostPaise: number | null; status: string; updatedAt: Date;
  _count: { instances: number };
}) {
  return {
    id: t.id,
    name: t.name,
    vehicleType: t.vehicleType,
    serviceType: t.serviceType,
    triggerType: t.triggerType,
    intervalValue: t.intervalValue,
    intervalUnit: t.intervalUnit,
    linkedVehicles: t._count.instances,
    tasks: JSON.parse(t.tasksJson || "[]"),
    defaultVendor: t.defaultVendor ?? "",
    estDurationHours: t.estDurationHours ?? 0,
    estCost: t.estCostPaise != null ? t.estCostPaise / 100 : 0,
    lastUpdated: t.updatedAt.toISOString(),
    status: t.status,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const templates = await db.serviceTemplate.findMany({
    where: { companyId: sessionUser.companyId },
    include: { _count: { select: { instances: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ templates: templates.map(toTemplateDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "services");
  if (denied) return denied;

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const tasks = Array.isArray(body.tasks)
    ? body.tasks.map((text: string, i: number) => ({ id: `t-${Date.now().toString(36)}-${i}`, text }))
    : [];

  try {
    const created = await db.serviceTemplate.create({
      data: {
        companyId: sessionUser.companyId,
        name,
        vehicleType: body.vehicleType || "Truck",
        serviceType: body.serviceType || "Periodic Maintenance",
        triggerType: body.triggerType || "Distance",
        intervalValue: Number.isFinite(body.intervalValue) ? body.intervalValue : 0,
        intervalUnit: body.intervalUnit || "km",
        tasksJson: JSON.stringify(tasks),
        defaultVendor: body.defaultVendor || null,
        estDurationHours: Number.isFinite(body.estDurationHours) ? body.estDurationHours : null,
        estCostPaise: Number.isFinite(body.estCost) ? Math.round(body.estCost * 100) : null,
        status: body.status || "Active",
      },
      include: { _count: { select: { instances: true } } },
    });
    return NextResponse.json({ template: toTemplateDTO(created) }, { status: 201 });
  } catch (e) {
    console.error("POST /api/service-templates error:", e);
    return NextResponse.json({ error: "Could not create service template." }, { status: 500 });
  }
}
