import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const ACTIVITY_INCLUDE = {
  lead: { select: { name: true } },
  deal: { select: { name: true } },
  contact: { select: { name: true } },
  customer: { select: { companyName: true } },
} as const;
type ActivityWithRelations = Awaited<ReturnType<typeof db.crmActivity.findFirst<{ include: typeof ACTIVITY_INCLUDE }>>>;

function toDTO(a: NonNullable<ActivityWithRelations>) {
  return {
    id: a.id, activityId: a.activityId, type: a.type, title: a.title,
    description: a.description ?? "", owner: a.ownerId ?? "",
    date: (a.scheduledAt ?? a.createdAt).toISOString(), duration: a.durationMinutes ?? undefined,
    leadId: a.leadId ?? undefined, leadName: a.lead?.name,
    accountId: a.customerId ?? undefined, accountName: a.customer?.companyName,
    dealId: a.dealId ?? undefined, dealName: a.deal?.name,
    contactId: a.contactId ?? undefined, contactName: a.contact?.name,
    outcome: a.outcome ?? "", nextStep: a.nextStep ?? undefined,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "crm");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.crmActivity.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Activity not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.type !== undefined) data.type = body.type;
  if (body.title !== undefined) data.title = String(body.title);
  if (body.description !== undefined) data.description = body.description || null;
  if (body.owner !== undefined) data.ownerId = body.owner || null;
  if (body.duration !== undefined) data.durationMinutes = Number.isFinite(body.duration) ? body.duration : null;
  if (body.leadId !== undefined) data.leadId = body.leadId || null;
  if (body.dealId !== undefined) data.dealId = body.dealId || null;
  if (body.contactId !== undefined) data.contactId = body.contactId || null;
  if (body.accountId !== undefined) data.customerId = body.accountId || null;
  if (body.outcome !== undefined) data.outcome = body.outcome || null;
  if (body.nextStep !== undefined) data.nextStep = body.nextStep || null;
  if (body.date !== undefined) data.scheduledAt = body.date ? new Date(body.date) : null;

  const updated = await db.crmActivity.update({ where: { id }, data, include: ACTIVITY_INCLUDE });
  return NextResponse.json({ activity: toDTO(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "crm");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.crmActivity.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Activity not found." }, { status: 404 });
  }
  await db.crmActivity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
