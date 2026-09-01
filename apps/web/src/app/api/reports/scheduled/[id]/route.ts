import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { toScheduledReportDTO, computeNextRun } from "../_lib";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reports");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.scheduledReport.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.frequency !== undefined) data.frequency = body.frequency;
  if (body.deliveryTime !== undefined) data.deliveryTime = body.deliveryTime;
  if (body.recipients !== undefined) {
    data.recipients = JSON.stringify(String(body.recipients).split(",").map((s: string) => s.trim()).filter(Boolean));
  }
  if (body.format !== undefined) data.format = body.format;
  if (body.status !== undefined) data.status = body.status;

  const finalFrequency = (data.frequency as string) ?? existing.frequency;
  const finalDeliveryTime = (data.deliveryTime as string) ?? existing.deliveryTime;
  if (data.frequency !== undefined || data.deliveryTime !== undefined) {
    data.nextRun = computeNextRun(finalFrequency, finalDeliveryTime);
  }

  try {
    const updated = await db.scheduledReport.update({ where: { id }, data });
    return NextResponse.json({ schedule: toScheduledReportDTO(updated) });
  } catch (e) {
    console.error("PATCH /api/reports/scheduled/[id] error:", e);
    return NextResponse.json({ error: "Could not update schedule." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "reports");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.scheduledReport.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });

  await db.scheduledReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
