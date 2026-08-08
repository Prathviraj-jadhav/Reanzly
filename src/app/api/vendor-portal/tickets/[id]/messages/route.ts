import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// POST /api/vendor-portal/tickets/[id]/messages  { body }
// Appends a real reply to a ticket's real message thread, replacing the
// previous client-only reply mutation.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;
  const { id } = await params;

  const ticket = await db.supportTicket.findUnique({ where: { id } });
  if (!ticket || ticket.customerId !== customer!.id) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  const body = String((await req.json())?.body || "").trim();
  if (!body) {
    return NextResponse.json({ error: "A message body is required." }, { status: 400 });
  }

  const message = await db.ticketMessage.create({
    data: { ticketId: id, fromName: customer!.contactPerson || sessionUser.name, fromRole: "customer", body },
  });
  await db.supportTicket.update({
    where: { id },
    data: { status: ticket.status === "Resolved" || ticket.status === "Closed" ? "Open" : "Awaiting Reply", updatedAt: new Date() },
  });

  return NextResponse.json({
    message: { id: message.id, fromName: message.fromName, fromRole: message.fromRole, body: message.body, createdAt: message.createdAt.toISOString() },
  }, { status: 201 });
}
