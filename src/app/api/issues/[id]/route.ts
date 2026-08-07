import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const EDITABLE_FIELDS = [
  "category", "severity", "title", "description", "status", "assignee", "source",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.issue.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  if ("reporter" in body) data.reportedBy = body.reporter;
  if ("resolutionDate" in body) data.resolvedAt = body.resolutionDate ? new Date(body.resolutionDate) : null;
  if (body.status === "Resolved" || body.status === "Closed") {
    if (!("resolutionDate" in body)) data.resolvedAt = new Date();
  }
  if ("vehicle" in body) {
    const name = String(body.vehicle || "").trim();
    const matched = name ? await db.vehicle.findFirst({ where: { companyId: sessionUser.companyId, name } }) : null;
    data.vehicleId = matched?.id ?? null;
  }

  const updated = await db.issue.update({
    where: { id },
    data,
    include: { vehicle: { select: { name: true } } },
  });

  return NextResponse.json({
    issue: {
      id: updated.id,
      issueId: updated.issueId,
      title: updated.title,
      severity: updated.severity,
      vehicle: updated.vehicle?.name ?? undefined,
      reporter: updated.reportedBy ?? "Unknown",
      assignee: updated.assignee ?? "Unassigned",
      status: updated.status,
      createdDate: updated.createdAt.toISOString(),
      resolutionDate: updated.resolvedAt ? updated.resolvedAt.toISOString() : undefined,
      source: updated.source,
      description: updated.description ?? "",
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.issue.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  await db.issue.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
