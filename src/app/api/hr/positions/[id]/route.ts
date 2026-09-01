import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const INCLUDE = { candidates: { orderBy: { appliedAt: "desc" as const } } } as const;
import type { Prisma } from "@prisma/client";
type Row = Prisma.HrPositionGetPayload<{ include: typeof INCLUDE }>;

function candidateDTO(c: NonNullable<Row>["candidates"][number]) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone ?? "",
    email: c.email ?? "",
    experience: c.experience ?? 0,
    currentCTC: Math.round((c.currentCtc ?? 0) / 100),
    expectedCTC: Math.round((c.expectedCtc ?? 0) / 100),
    stage: c.stage,
    appliedOn: c.appliedAt.toISOString(),
    rating: c.rating ?? 0,
    source: c.source ?? "",
    notes: c.notes ?? "",
  };
}

function toDTO(p: NonNullable<Row>) {
  return {
    id: p.id,
    positionId: p.positionId,
    role: p.title,
    branch: p.branchId ?? "",
    openings: p.openings,
    budget: Math.round(p.budgetMax / 100),
    hiringManager: p.hiringManagerId ?? "",
    status: p.status,
    postedOn: p.postedAt.toISOString(),
    description: p.description ?? "",
    candidates: p.candidates.map(candidateDTO),
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.hrPosition.findFirst({
    where: { id, companyId: sessionUser.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Position not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.status === "string") {
    if (!["Open", "On Hold", "Closed"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = body.status;
    data.closedAt = body.status === "Closed" ? new Date() : null;
  }
  if (typeof body.role === "string" && body.role.trim()) data.title = body.role.trim();
  if (typeof body.branch === "string") data.branchId = body.branch || null;
  if (typeof body.description === "string") data.description = body.description || null;
  if (Number.isFinite(body.openings)) data.openings = body.openings;
  if (Number.isFinite(body.budget)) {
    data.budgetMin = Math.round(body.budget * 100);
    data.budgetMax = Math.round(body.budget * 100);
  }
  if (typeof body.hiringManager === "string") data.hiringManagerId = body.hiringManager || null;

  const updated = await db.hrPosition.update({
    where: { id },
    data,
    include: INCLUDE,
  });
  await logAudit({
    sessionUser,
    action: "UPDATE",
    entity: "Position",
    entityId: updated.positionId,
    description: `Updated position ${updated.title}${typeof body.status === "string" ? ` → ${body.status}` : ""}`,
  });
  return NextResponse.json({ position: toDTO(updated) });
}
