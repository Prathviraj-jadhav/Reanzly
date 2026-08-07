import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Real CRUD for the Maintenance module, replacing pure client-side state
// seeded from src/lib/mock-data.ts's WORK_ORDERS array. `vehicle` is a
// best-effort resolved name (via vehicleId's real relation); vendor/
// technician stay plain text, matching WorkOrder's own schema (no FK there).

function toDTO(w: {
  id: string; workOrderId: string; title: string; type: string; priority: string;
  status: string; vendor: string | null; technician: string | null; estimatedCost: number;
  actualCost: number | null; createdDate: Date; estimatedCompletion: Date | null;
  vehicle: { name: string } | null;
}) {
  return {
    id: w.id,
    workOrderId: w.workOrderId,
    title: w.title,
    vehicle: w.vehicle?.name ?? "Unassigned",
    type: w.type,
    priority: w.priority,
    vendor: w.vendor ?? undefined,
    technician: w.technician ?? undefined,
    status: w.status,
    createdDate: w.createdDate.toISOString(),
    estimatedCompletion: w.estimatedCompletion ? w.estimatedCompletion.toISOString() : undefined,
    actualCost: w.actualCost ?? undefined,
    estimatedCost: w.estimatedCost,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const workOrders = await db.workOrder.findMany({
    where: { companyId: sessionUser.companyId },
    include: { vehicle: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ workOrders: workOrders.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "title is required." }, { status: 400 });

  const vehicleName = String(body.vehicle || "").trim();
  const matchedVehicle = vehicleName
    ? await db.vehicle.findFirst({ where: { companyId: sessionUser.companyId, name: vehicleName } })
    : null;

  const workOrderId = body.workOrderId?.trim() || `WO-${Date.now()}`;

  try {
    const created = await db.workOrder.create({
      data: {
        companyId: sessionUser.companyId,
        workOrderId,
        vehicleId: matchedVehicle?.id ?? null,
        title,
        type: body.type || "Unscheduled",
        priority: body.priority || "Medium",
        status: body.status || "Open",
        vendor: body.vendor || null,
        technician: body.technician || null,
        estimatedCost: Number.isFinite(body.estimatedCost) ? body.estimatedCost : 0,
        actualCost: Number.isFinite(body.actualCost) ? body.actualCost : null,
        estimatedCompletion: body.estimatedCompletion ? new Date(body.estimatedCompletion) : null,
      },
      include: { vehicle: { select: { name: true } } },
    });
    return NextResponse.json({ workOrder: toDTO(created) }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "A work order with that number already exists." }, { status: 409 });
    }
    console.error("POST /api/work-orders error:", e);
    return NextResponse.json({ error: "Could not create work order." }, { status: 500 });
  }
}
