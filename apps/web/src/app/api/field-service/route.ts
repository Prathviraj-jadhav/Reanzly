import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// Real CRUD for Field Service tasks, replacing the module's entirely
// client-only FIELD_TASKS mock array. checklist/parts/timeEntries are
// stored as JSON text columns (real, persisted, per-task nested lists -
// see prisma/schema.prisma's FieldServiceTask comment for why JSON
// columns rather than child tables here).

type Row = Awaited<ReturnType<typeof db.fieldServiceTask.findFirstOrThrow>>;

function toDTO(t: Row) {
  return {
    id: t.id,
    taskId: t.taskId,
    title: t.title,
    type: t.type,
    customer: t.customer,
    customerCode: t.customerCode ?? "",
    technician: t.technician,
    scheduledAt: t.scheduledAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
    status: t.status,
    priority: t.priority,
    location: t.location,
    locationLat: t.locationLat ?? undefined,
    locationLng: t.locationLng ?? undefined,
    vehicleRef: t.vehicleRef ?? undefined,
    contactName: t.contactName,
    contactPhone: t.contactPhone,
    description: t.description,
    notes: t.notes ?? "",
    checklist: JSON.parse(t.checklistJson || "[]"),
    parts: JSON.parse(t.partsJson || "[]"),
    timeEntries: JSON.parse(t.timeEntriesJson || "[]"),
    signatureCaptured: t.signatureCaptured,
    customerFeedback: t.customerFeedback ?? undefined,
    rating: t.rating ?? undefined,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "field-service");
  if (denied) return denied;

  const tasks = await db.fieldServiceTask.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { scheduledAt: "desc" },
  });
  return NextResponse.json({ tasks: tasks.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "field-service");
  if (denied) return denied;

  const body = await req.json();
  const title = String(body.title || "").trim();
  const customer = String(body.customer || "").trim();
  const technician = String(body.technician || "").trim();
  const location = String(body.location || "").trim();
  const description = String(body.description || "").trim();
  if (!title || !customer || !technician || !location || !description || !body.scheduledAt) {
    return NextResponse.json({ error: "title, customer, technician, location, description, and scheduledAt are required." }, { status: 400 });
  }

  const count = await db.fieldServiceTask.count({ where: { companyId: sessionUser.companyId } });
  const taskId = `FS-${String(4001 + count)}`;

  const created = await db.fieldServiceTask.create({
    data: {
      companyId: sessionUser.companyId,
      taskId,
      title,
      type: body.type || "Repair",
      customer,
      customerCode: body.customerCode || null,
      technician,
      scheduledAt: new Date(body.scheduledAt),
      status: "Scheduled",
      priority: body.priority || "Medium",
      location,
      vehicleRef: body.vehicleRef || null,
      contactName: body.contactName || "",
      contactPhone: body.contactPhone || "",
      description,
      checklistJson: "[]",
      partsJson: "[]",
      timeEntriesJson: "[]",
    },
  });

  await logAudit({
    sessionUser,
    action: "CREATE",
    entity: "FieldServiceTask",
    entityId: created.taskId,
    description: `Created field service task: ${created.title} (${created.type}) for ${created.customer}`,
  });

  return NextResponse.json({ task: toDTO(created) }, { status: 201 });
}
