import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

// Real CRUD for CRM Deals (Pipeline), replacing the Zustand+localStorage
// `reanzly-crm` store's deals slice. `value` is stored in paise (matching
// the schema comment and the Expense/LorryReceipt convention elsewhere in
// this codebase) but the frontend's Deal.value works in whole rupees - the
// DTO boundary converts both ways.

const DEAL_INCLUDE = {
  customer: { select: { companyName: true } },
  contact: { select: { name: true } },
} as const;

import type { Prisma } from "@prisma/client";
type DealWithRelations = Prisma.DealGetPayload<{ include: typeof DEAL_INCLUDE }>;

function toDTO(d: NonNullable<DealWithRelations>) {
  return {
    id: d.id,
    dealId: d.dealId,
    title: d.name,
    company: d.customer?.companyName ?? d.company ?? "",
    contact: d.contact?.name ?? "",
    contactId: d.contactId ?? undefined,
    value: Math.round(d.value / 100),
    stage: d.stage,
    expectedClose: d.expectedClose ? d.expectedClose.toISOString() : "",
    owner: d.ownerId ?? "",
    lane: d.lane ?? "",
    accountId: d.customerId ?? undefined,
    leadId: d.leadId ?? undefined,
    created: d.createdAt.toISOString(),
    probability: d.probability,
    lossReason: d.lostReason ?? undefined,
    winReason: d.winReason ?? undefined,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "crm");
  if (denied) return denied;
  const deals = await db.deal.findMany({
    where: { companyId: sessionUser.companyId },
    include: DEAL_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ deals: deals.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "crm");
  if (denied) return denied;

  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "title is required." }, { status: 400 });

  // accountId/contactId come from real fetched Customers/Contacts pickers -
  // verify they belong to this company rather than trusting them blindly.
  const customerId = body.accountId ? String(body.accountId) : null;
  if (customerId) {
    const c = await db.customer.findUnique({ where: { id: customerId } });
    if (!c || c.companyId !== sessionUser.companyId) {
      return NextResponse.json({ error: "Account not found." }, { status: 400 });
    }
  }
  const contactId = body.contactId ? String(body.contactId) : null;
  if (contactId) {
    const c = await db.crmContact.findUnique({ where: { id: contactId } });
    if (!c || c.companyId !== sessionUser.companyId) {
      return NextResponse.json({ error: "Contact not found." }, { status: 400 });
    }
  }

  const created = await db.deal.create({
    data: {
      companyId: sessionUser.companyId,
      dealId: `RZ-DEAL-${Date.now().toString(36).toUpperCase()}`,
      name: title,
      company: body.company || null,
      customerId,
      contactId,
      leadId: body.leadId || null,
      lane: body.lane || null,
      value: Math.round((Number(body.value) || 0) * 100),
      stage: body.stage || "New Lead",
      probability: Number.isFinite(body.probability) ? body.probability : 10,
      expectedClose: body.expectedClose ? new Date(body.expectedClose) : null,
      ownerId: body.owner || null,
    },
    include: DEAL_INCLUDE,
  });
  return NextResponse.json({ deal: toDTO(created) }, { status: 201 });
}
