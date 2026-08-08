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
    id: a.id,
    activityId: a.activityId,
    type: a.type,
    title: a.title,
    description: a.description ?? "",
    owner: a.ownerId ?? "",
    date: (a.scheduledAt ?? a.createdAt).toISOString(),
    duration: a.durationMinutes ?? undefined,
    leadId: a.leadId ?? undefined,
    leadName: a.lead?.name,
    accountId: a.customerId ?? undefined,
    accountName: a.customer?.companyName,
    dealId: a.dealId ?? undefined,
    dealName: a.deal?.name,
    contactId: a.contactId ?? undefined,
    contactName: a.contact?.name,
    outcome: a.outcome ?? "",
    nextStep: a.nextStep ?? undefined,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "crm");
  if (denied) return denied;
  const activities = await db.crmActivity.findMany({
    where: { companyId: sessionUser.companyId },
    include: ACTIVITY_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ activities: activities.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "crm");
  if (denied) return denied;

  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "title is required." }, { status: 400 });

  const created = await db.crmActivity.create({
    data: {
      companyId: sessionUser.companyId,
      activityId: `RZ-ACT-${Date.now().toString(36).toUpperCase()}`,
      type: body.type || "Note",
      title,
      description: body.description || null,
      ownerId: body.owner || null,
      durationMinutes: Number.isFinite(body.duration) ? body.duration : null,
      leadId: body.leadId || null,
      dealId: body.dealId || null,
      contactId: body.contactId || null,
      customerId: body.accountId || null,
      outcome: body.outcome || null,
      nextStep: body.nextStep || null,
      scheduledAt: body.date ? new Date(body.date) : new Date(),
    },
    include: ACTIVITY_INCLUDE,
  });
  return NextResponse.json({ activity: toDTO(created) }, { status: 201 });
}
