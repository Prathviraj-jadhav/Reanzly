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

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;
  const positions = await db.hrPosition.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ positions: positions.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const body = await req.json();
  const role = String(body.role || "").trim();
  if (!role) return NextResponse.json({ error: "role is required." }, { status: 400 });

  const created = await db.hrPosition.create({
    data: {
      companyId: sessionUser.companyId,
      positionId: `RZ-POS-${Date.now().toString(36).toUpperCase()}`,
      title: role,
      branchId: body.branch || null,
      description: body.description || null,
      openings: Number.isFinite(body.openings) ? body.openings : 1,
      budgetMin: Math.round((Number(body.budget) || 0) * 100),
      budgetMax: Math.round((Number(body.budget) || 0) * 100),
      hiringManagerId: body.hiringManager || null,
      status: body.status || "Open",
    },
    include: INCLUDE,
  });
  await logAudit({
    sessionUser,
    action: "CREATE",
    entity: "Position",
    entityId: created.positionId,
    description: `Opened new position: ${created.title} (${created.openings} opening${created.openings === 1 ? "" : "s"})`,
  });
  return NextResponse.json({ position: toDTO(created) }, { status: 201 });
}
