import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.candidate.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.stage !== undefined) data.stage = body.stage;
  if (body.rating !== undefined) data.rating = body.rating;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const updated = await db.candidate.update({ where: { id }, data });
  return NextResponse.json({
    candidate: {
      id: updated.id,
      positionId: updated.positionId,
      name: updated.name,
      phone: updated.phone ?? "",
      email: updated.email ?? "",
      experience: updated.experience ?? 0,
      currentCTC: Math.round((updated.currentCtc ?? 0) / 100),
      expectedCTC: Math.round((updated.expectedCtc ?? 0) / 100),
      stage: updated.stage,
      appliedOn: updated.appliedAt.toISOString(),
      rating: updated.rating ?? 0,
      source: updated.source ?? "",
      notes: updated.notes ?? "",
    },
  });
}
