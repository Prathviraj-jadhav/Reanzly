import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const EDITABLE_FIELDS = ["status", "result", "score", "notes"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "quality");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.qualityCheck.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Quality check not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }

  if ("status" in body && body.status !== existing.status) {
    const activity = JSON.parse(existing.activityJson || "[]");
    activity.push({
      id: `act-${Date.now()}`,
      ts: new Date().toISOString(),
      actor: sessionUser.name,
      action: `Status → ${body.status}`,
    });
    data.activityJson = JSON.stringify(activity);
  }

  const updated = await db.qualityCheck.update({ where: { id }, data });

  return NextResponse.json({
    check: {
      id: updated.id,
      checkId: updated.checkId,
      type: updated.type,
      reference: updated.reference,
      referenceEntity: updated.referenceEntity ?? undefined,
      referenceModule: updated.referenceModule ?? undefined,
      inspector: updated.inspector,
      date: updated.date.toISOString(),
      result: updated.result,
      status: updated.status,
      score: updated.score,
      location: updated.location ?? "",
      findings: JSON.parse(updated.findingsJson || "[]"),
      controlPoints: JSON.parse(updated.controlPointsJson || "[]"),
      correctiveActions: JSON.parse(updated.correctiveActionsJson || "[]"),
      activity: JSON.parse(updated.activityJson || "[]"),
      notes: updated.notes ?? undefined,
    },
  });
}
