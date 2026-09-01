import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

// Real CRUD for the Reminders module. daysRemaining/status are computed
// live from dueDate rather than stored, so they can't go stale.

function statusForDays(days: number): string {
  if (days < 0) return "Overdue";
  if (days <= 7) return "Due Soon";
  return "Upcoming";
}

function toDTO(r: {
  id: string; category: string; title: string; dueDate: Date;
  vehicle: { name: string } | null; driver: { name: string } | null;
}) {
  const daysRemaining = Math.round((r.dueDate.getTime() - Date.now()) / 86400000);
  return {
    id: r.id,
    type: r.category === "Service" ? "Service" : "Renewal",
    entity: r.vehicle?.name ?? r.driver?.name ?? "",
    entityType: r.vehicle ? "Vehicle" : "Driver",
    name: r.title,
    dueDate: r.dueDate.toISOString(),
    daysRemaining,
    status: statusForDays(daysRemaining),
  };
}

const INCLUDE = { vehicle: { select: { name: true } }, driver: { select: { name: true } } } as const;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reminders");
  if (denied) return denied;
  const reminders = await db.reminder.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json({ reminders: reminders.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reminders");
  if (denied) return denied;

  const body = await req.json();
  const name = String(body.name || "").trim();
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (!name || !dueDate) {
    return NextResponse.json({ error: "name and dueDate are required." }, { status: 400 });
  }

  const entityName = String(body.entity || "").trim();
  const isVehicle = body.entityType !== "Driver";
  const matchedVehicle = isVehicle && entityName
    ? await db.vehicle.findFirst({ where: { companyId: sessionUser.companyId, name: entityName } })
    : null;
  const matchedDriver = !isVehicle && entityName
    ? await db.driver.findFirst({ where: { companyId: sessionUser.companyId, name: entityName } })
    : null;

  const created = await db.reminder.create({
    data: {
      companyId: sessionUser.companyId,
      vehicleId: matchedVehicle?.id ?? null,
      driverId: matchedDriver?.id ?? null,
      title: name,
      category: body.type === "Service" ? "Service" : "Custom",
      dueDate,
      status: "Pending",
    },
    include: INCLUDE,
  });
  return NextResponse.json({ reminder: toDTO(created) }, { status: 201 });
}
