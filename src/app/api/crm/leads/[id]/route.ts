import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

function toDTO(l: {
  id: string; leadId: string; name: string; company: string | null; source: string;
  laneInterest: string | null; status: string; ownerId: string | null; score: number;
  phone: string | null; email: string | null; city: string | null; createdAt: Date;
  nextFollowUp: Date | null; notes: string | null;
}) {
  return {
    id: l.id, leadId: l.leadId, name: l.name, company: l.company ?? "", source: l.source,
    laneInterest: l.laneInterest ?? "", status: l.status, owner: l.ownerId ?? "", score: l.score,
    phone: l.phone ?? "", email: l.email ?? "", city: l.city ?? "", created: l.createdAt.toISOString(),
    nextFollowUp: l.nextFollowUp ? l.nextFollowUp.toISOString() : undefined, notes: l.notes ?? "",
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name);
  if (body.company !== undefined) data.company = body.company || null;
  if (body.source !== undefined) data.source = body.source;
  if (body.laneInterest !== undefined) data.laneInterest = body.laneInterest || null;
  if (body.status !== undefined) data.status = body.status;
  if (body.owner !== undefined) data.ownerId = body.owner || null;
  if (body.score !== undefined) data.score = Number.isFinite(body.score) ? body.score : existing.score;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.city !== undefined) data.city = body.city || null;
  if (body.nextFollowUp !== undefined) data.nextFollowUp = body.nextFollowUp ? new Date(body.nextFollowUp) : null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const updated = await db.lead.update({ where: { id }, data });
  return NextResponse.json({ lead: toDTO(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  await db.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
