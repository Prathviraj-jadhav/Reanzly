import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

function statusForDays(days: number): string {
  if (days < 0) return "Overdue";
  if (days <= 7) return "Due Soon";
  return "Upcoming";
}

const INCLUDE = { vehicle: { select: { name: true } }, driver: { select: { name: true } } } as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reminders");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.reminder.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("name" in body) data.title = body.name;
  if ("dueDate" in body) data.dueDate = new Date(body.dueDate);
  if ("type" in body) data.category = body.type === "Service" ? "Service" : "Custom";
  if ("status" in body && body.status !== "Overdue" && body.status !== "Due Soon" && body.status !== "Upcoming") {
    data.status = body.status; // e.g. "Done"/"Snoozed" from a quick action, not the computed display status
  }

  const updated = await db.reminder.update({ where: { id }, data, include: INCLUDE });
  const daysRemaining = Math.round((updated.dueDate.getTime() - Date.now()) / 86400000);

  return NextResponse.json({
    reminder: {
      id: updated.id,
      type: updated.category === "Service" ? "Service" : "Renewal",
      entity: updated.vehicle?.name ?? updated.driver?.name ?? "",
      entityType: updated.vehicle ? "Vehicle" : "Driver",
      name: updated.title,
      dueDate: updated.dueDate.toISOString(),
      daysRemaining,
      status: statusForDays(daysRemaining),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reminders");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.reminder.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
  }

  await db.reminder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
