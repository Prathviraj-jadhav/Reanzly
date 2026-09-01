import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// GET/POST /api/vendor-portal/tickets
// Real SupportTicket + TicketMessage rows scoped to this portal session's
// linked Customer, replacing VENDOR_TICKETS and the client-only
// setTickets()/reply mutation (previously lost on refresh - see
// schema.prisma's SupportTicket/TicketMessage comment).
async function toDTO(t: { id: string; ticketNumber: string; subject: string; category: string; priority: string; status: string; createdAt: Date; linkedRef: string | null; description: string }) {
  const messages = await db.ticketMessage.findMany({ where: { ticketId: t.id }, orderBy: { createdAt: "asc" } });
  const last = messages[messages.length - 1];
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    lastReplyAt: last ? last.createdAt.toISOString() : undefined,
    lastReplyBy: last ? last.fromName : undefined,
    messageCount: messages.length,
    linkedRef: t.linkedRef ?? undefined,
    description: t.description,
    messages: messages.map((m) => ({
      id: m.id,
      fromName: m.fromName,
      fromRole: m.fromRole,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  const tickets = await db.supportTicket.findMany({
    where: { customerId: customer!.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tickets: await Promise.all(tickets.map(toDTO)) });
}

async function nextTicketNumber(companyId: string) {
  const existing = await db.supportTicket.findMany({ where: { companyId }, select: { ticketNumber: true } });
  const max = existing
    .map((x) => parseInt(x.ticketNumber.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 4000);
  return `TKT-${String(max + 1).padStart(5, "0")}`;
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  const body = await req.json();
  const subject = String(body.subject || "").trim();
  const description = String(body.description || "").trim();
  if (!subject || !description) {
    return NextResponse.json({ error: "subject and description are required." }, { status: 400 });
  }

  const ticketNumber = await nextTicketNumber(sessionUser.companyId);
  const created = await db.supportTicket.create({
    data: {
      companyId: sessionUser.companyId,
      customerId: customer!.id,
      ticketNumber,
      subject,
      category: body.category || "Other",
      priority: body.priority || "Medium",
      status: "Open",
      linkedRef: body.linkedRef || null,
      description,
      messages: {
        create: { fromName: customer!.contactPerson || sessionUser.name, fromRole: "customer", body: description },
      },
    },
  });

  return NextResponse.json({ ticket: await toDTO(created) }, { status: 201 });
}
