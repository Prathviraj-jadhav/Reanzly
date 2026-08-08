import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const DEAL_INCLUDE = {
  customer: { select: { companyName: true } },
  contact: { select: { name: true } },
} as const;

type DealWithRelations = Awaited<ReturnType<typeof db.deal.findFirst<{ include: typeof DEAL_INCLUDE }>>>;

function toDTO(d: NonNullable<DealWithRelations>) {
  return {
    id: d.id, dealId: d.dealId, title: d.name,
    company: d.customer?.companyName ?? d.company ?? "",
    contact: d.contact?.name ?? "", contactId: d.contactId ?? undefined,
    value: Math.round(d.value / 100), stage: d.stage,
    expectedClose: d.expectedClose ? d.expectedClose.toISOString() : "",
    owner: d.ownerId ?? "", lane: d.lane ?? "", accountId: d.customerId ?? undefined,
    leadId: d.leadId ?? undefined, created: d.createdAt.toISOString(),
    probability: d.probability, lossReason: d.lostReason ?? undefined, winReason: d.winReason ?? undefined,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "crm");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.deal.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.name = String(body.title);
  if (body.company !== undefined) data.company = body.company || null;
  if (body.lane !== undefined) data.lane = body.lane || null;
  if (body.value !== undefined) data.value = Math.round((Number(body.value) || 0) * 100);
  if (body.stage !== undefined) {
    data.stage = body.stage;
    if (body.stage === "Won") data.wonAt = new Date();
  }
  if (body.probability !== undefined) data.probability = Number.isFinite(body.probability) ? body.probability : existing.probability;
  if (body.expectedClose !== undefined) data.expectedClose = body.expectedClose ? new Date(body.expectedClose) : null;
  if (body.owner !== undefined) data.ownerId = body.owner || null;
  if (body.lossReason !== undefined) data.lostReason = body.lossReason || null;
  if (body.winReason !== undefined) data.winReason = body.winReason || null;
  if (body.accountId !== undefined) data.customerId = body.accountId || null;
  if (body.contactId !== undefined) data.contactId = body.contactId || null;

  const updated = await db.deal.update({ where: { id }, data, include: DEAL_INCLUDE });
  return NextResponse.json({ deal: toDTO(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "crm");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.deal.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }
  await db.deal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
