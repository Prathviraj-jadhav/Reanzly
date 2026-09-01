import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const CONTACT_INCLUDE = { customer: { select: { companyName: true } } } as const;
import type { Prisma } from "@prisma/client";
type ContactWithRelations = Prisma.CrmContactGetPayload<{ include: typeof CONTACT_INCLUDE }>;

function toDTO(c: NonNullable<ContactWithRelations>) {
  return {
    id: c.id, contactId: c.contactId, name: c.name, title: c.title ?? "",
    accountId: c.customerId ?? undefined, accountName: c.customer?.companyName ?? "",
    phone: c.phone ?? "", email: c.email ?? "", city: c.city ?? "",
    decisionMaker: c.decisionMaker,
    lastContacted: c.lastContactedAt ? c.lastContactedAt.toISOString() : undefined,
    linkedIn: c.linkedIn ?? undefined,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "crm");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.crmContact.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name);
  if (body.title !== undefined) data.title = body.title || null;
  if (body.accountId !== undefined) data.customerId = body.accountId || null;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.city !== undefined) data.city = body.city || null;
  if (body.linkedIn !== undefined) data.linkedIn = body.linkedIn || null;
  if (body.decisionMaker !== undefined) data.decisionMaker = Boolean(body.decisionMaker);
  if (body.lastContacted !== undefined) data.lastContactedAt = body.lastContacted ? new Date(body.lastContacted) : null;

  const updated = await db.crmContact.update({ where: { id }, data, include: CONTACT_INCLUDE });
  return NextResponse.json({ contact: toDTO(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "crm");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.crmContact.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }
  await db.crmContact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
