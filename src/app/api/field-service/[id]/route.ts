import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

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

// Accepts both the real cuid `id` and the display `taskId` (FS-####), since
// the module's own links/search use either interchangeably.
async function findTask(companyId: string, idOrTaskId: string) {
  return db.fieldServiceTask.findFirst({
    where: { companyId, OR: [{ id: idOrTaskId }, { taskId: idOrTaskId }] },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "field-service");
  if (denied) return denied;
  const { id } = await params;

  const task = await findTask(sessionUser.companyId, id);
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ task: toDTO(task) });
}

// Single generic PATCH covering every real mutation the detail/list UI
// performs - status transitions, reassign, reschedule, notes, checklist/
// parts/time-entry array replacement, signature, feedback, and direct
// field edits. The caller sends only the keys it's changing.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "field-service");
  if (denied) return denied;
  const { id } = await params;

  const existing = await findTask(sessionUser.companyId, id);
  if (!existing) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = String(body.title);
  if (body.type !== undefined) data.type = String(body.type);
  if (body.customer !== undefined) data.customer = String(body.customer);
  if (body.customerCode !== undefined) data.customerCode = body.customerCode || null;
  if (body.technician !== undefined) data.technician = String(body.technician);
  if (body.scheduledAt !== undefined) data.scheduledAt = new Date(body.scheduledAt);
  if (body.priority !== undefined) data.priority = String(body.priority);
  if (body.location !== undefined) data.location = String(body.location);
  if (body.vehicleRef !== undefined) data.vehicleRef = body.vehicleRef || null;
  if (body.contactName !== undefined) data.contactName = String(body.contactName);
  if (body.contactPhone !== undefined) data.contactPhone = String(body.contactPhone);
  if (body.description !== undefined) data.description = String(body.description);
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.checklist !== undefined) data.checklistJson = JSON.stringify(body.checklist);
  if (body.parts !== undefined) data.partsJson = JSON.stringify(body.parts);
  if (body.timeEntries !== undefined) data.timeEntriesJson = JSON.stringify(body.timeEntries);
  if (body.signatureCaptured !== undefined) data.signatureCaptured = Boolean(body.signatureCaptured);
  if (body.customerFeedback !== undefined) data.customerFeedback = body.customerFeedback || null;
  if (body.rating !== undefined) data.rating = body.rating === null ? null : Number(body.rating);

  let statusChanged = false;
  if (body.status !== undefined && body.status !== existing.status) {
    data.status = String(body.status);
    statusChanged = true;
    if (body.status === "Completed") data.completedAt = new Date();
  }

  const updated = await db.fieldServiceTask.update({ where: { id: existing.id }, data });

  if (statusChanged) {
    await logAudit({
      sessionUser,
      action: updated.status === "Cancelled" ? "STATUS_CHANGE" : "UPDATE",
      entity: "FieldServiceTask",
      entityId: updated.taskId,
      description: `${updated.taskId} status: ${existing.status} → ${updated.status}`,
    });
  } else if (body.technician !== undefined && body.technician !== existing.technician) {
    await logAudit({
      sessionUser,
      action: "UPDATE",
      entity: "FieldServiceTask",
      entityId: updated.taskId,
      description: `${updated.taskId} reassigned: ${existing.technician} → ${updated.technician}`,
    });
  }

  return NextResponse.json({ task: toDTO(updated) });
}
