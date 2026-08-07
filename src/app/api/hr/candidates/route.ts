import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

function toDTO(c: Awaited<ReturnType<typeof db.candidate.findFirstOrThrow>>) {
  return {
    id: c.id,
    positionId: c.positionId,
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

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  const positionId = String(body.positionId || "");
  if (!name || !positionId) {
    return NextResponse.json({ error: "name and positionId are required." }, { status: 400 });
  }
  const position = await db.hrPosition.findUnique({ where: { id: positionId } });
  if (!position || position.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Position not found." }, { status: 400 });
  }

  const created = await db.candidate.create({
    data: {
      companyId: sessionUser.companyId,
      positionId,
      name,
      phone: body.phone || null,
      email: body.email || null,
      experience: Number.isFinite(body.experience) ? body.experience : null,
      currentCtc: Number.isFinite(body.currentCTC) ? Math.round(body.currentCTC * 100) : null,
      expectedCtc: Number.isFinite(body.expectedCTC) ? Math.round(body.expectedCTC * 100) : null,
      source: body.source || null,
      stage: body.stage || "Applied",
      rating: Number.isFinite(body.rating) ? body.rating : null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json({ candidate: toDTO(created) }, { status: 201 });
}
