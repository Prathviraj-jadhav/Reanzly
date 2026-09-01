import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { toAutomationDTO, scheduleNextRun } from "@/lib/automation-engine";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "automation");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.automation.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Automation not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.trigger !== undefined) data.trigger = body.trigger;
  if (body.triggerCategory !== undefined) data.triggerCategory = body.triggerCategory;
  if (body.conditions !== undefined) data.conditions = JSON.stringify(body.conditions ?? []);
  if (body.actions !== undefined) data.actions = JSON.stringify(body.actions ?? []);
  if (body.status !== undefined) data.status = body.status;
  if (body.scheduleEnabled !== undefined) data.scheduleEnabled = Boolean(body.scheduleEnabled);
  if (body.scheduleIntervalMinutes !== undefined) {
    data.scheduleIntervalMinutes = body.scheduleIntervalMinutes ? Number(body.scheduleIntervalMinutes) : null;
  }

  try {
    let updated = await db.automation.update({ where: { id }, data });

    // Re-derive the real schedule loop from the automation's final state -
    // covers enabling it, changing the interval, pausing, or disabling it.
    const finalScheduleEnabled = data.scheduleEnabled !== undefined ? Boolean(data.scheduleEnabled) : updated.scheduleEnabled;
    const finalInterval = data.scheduleIntervalMinutes !== undefined ? (data.scheduleIntervalMinutes as number | null) : updated.scheduleIntervalMinutes;
    if (finalScheduleEnabled && updated.status === "Active" && finalInterval) {
      await scheduleNextRun(id, finalInterval);
      updated = await db.automation.findUniqueOrThrow({ where: { id } });
    } else if (updated.nextRunAt) {
      // Not actively scheduled anymore - clear the stale nextRunAt display.
      // Any already-queued job self-terminates on its next fire (it checks
      // live scheduleEnabled/status before doing anything), so there's
      // nothing to cancel here.
      updated = await db.automation.update({ where: { id }, data: { nextRunAt: null } });
    }

    return NextResponse.json({ automation: toAutomationDTO(updated) });
  } catch (e) {
    console.error("PATCH /api/automation/[id] error:", e);
    return NextResponse.json({ error: "Could not update automation." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "automation");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.automation.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Automation not found." }, { status: 404 });

  await db.automation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
