import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const CONTACT_INCLUDE = { customer: { select: { companyName: true } } } as const;
type ContactWithRelations = Awaited<ReturnType<typeof db.crmContact.findFirst<{ include: typeof CONTACT_INCLUDE }>>>;

function toDTO(c: NonNullable<ContactWithRelations>) {
  return {
    id: c.id,
    contactId: c.contactId,
    name: c.name,
    title: c.title ?? "",
    accountId: c.customerId ?? undefined,
    accountName: c.customer?.companyName ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    city: c.city ?? "",
    decisionMaker: c.decisionMaker,
    lastContacted: c.lastContactedAt ? c.lastContactedAt.toISOString() : undefined,
    linkedIn: c.linkedIn ?? undefined,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "crm");
  if (denied) return denied;
  const contacts = await db.crmContact.findMany({
    where: { companyId: sessionUser.companyId },
    include: CONTACT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ contacts: contacts.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "crm");
  if (denied) return denied;

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const customerId = body.accountId ? String(body.accountId) : null;
  if (customerId) {
    const c = await db.customer.findUnique({ where: { id: customerId } });
    if (!c || c.companyId !== sessionUser.companyId) {
      return NextResponse.json({ error: "Account not found." }, { status: 400 });
    }
  }

  const created = await db.crmContact.create({
    data: {
      companyId: sessionUser.companyId,
      contactId: `RZ-CONTACT-${Date.now().toString(36).toUpperCase()}`,
      customerId,
      name,
      title: body.title || null,
      email: body.email || null,
      phone: body.phone || null,
      city: body.city || null,
      linkedIn: body.linkedIn || null,
      decisionMaker: Boolean(body.decisionMaker),
      lastContactedAt: body.lastContacted ? new Date(body.lastContacted) : null,
    },
    include: CONTACT_INCLUDE,
  });
  return NextResponse.json({ contact: toDTO(created) }, { status: 201 });
}
