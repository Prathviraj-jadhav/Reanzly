import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// Real CRUD for Helpdesk tickets (the internal support-team ticketing tab
// inside the CRM cluster), replacing the module's entirely client-only
// HELPDESK_TICKETS mock array. This is deliberately a separate model from
// the existing SupportTicket (the customer-facing Vendor Portal's ticket
// model) - see prisma/schema.prisma's HelpdeskTicket comment for why.
// sla/messages/activity are stored as JSON text columns, same convention
// as FieldServiceTask.

type Row = Awaited<ReturnType<typeof db.helpdeskTicket.findFirstOrThrow>>;

export function toDTO(t: Row) {
  return {
    id: t.id,
    ticketId: t.ticketId,
    subject: t.subject,
    description: t.description,
    customer: t.customer,
    customerCode: t.customerCode ?? "",
    priority: t.priority,
    status: t.status,
    channel: t.channel,
    team: t.team,
    assignee: t.assignee,
    requester: t.requester,
    requesterEmail: t.requesterEmail,
    category: t.category,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : undefined,
    relatedRef: t.relatedRef ?? undefined,
    sla: JSON.parse(t.slaJson || "{}"),
    messages: JSON.parse(t.messagesJson || "[]"),
    activity: JSON.parse(t.activityJson || "[]"),
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "helpdesk");
  if (denied) return denied;

  const tickets = await db.helpdeskTicket.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tickets: tickets.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "helpdesk");
  if (denied) return denied;

  const body = await req.json();
  const subject = String(body.subject || "").trim();
  const customer = String(body.customer || "").trim();
  const requester = String(body.requester || "").trim();
  const description = String(body.description || "").trim();
  if (!subject || !customer || !requester || !description) {
    return NextResponse.json({ error: "subject, customer, requester, and description are required." }, { status: 400 });
  }

  const count = await db.helpdeskTicket.count({ where: { companyId: sessionUser.companyId } });
  const ticketId = `TKT-${String(2841 + count)}`;
  const now = new Date();

  const created = await db.helpdeskTicket.create({
    data: {
      companyId: sessionUser.companyId,
      ticketId,
      subject,
      description,
      customer,
      customerCode: body.customerCode || null,
      priority: body.priority || "Medium",
      status: "New",
      channel: body.channel || "Email",
      team: body.team || "Operations",
      requester,
      requesterEmail: body.requesterEmail || "-",
      category: body.category || "Documentation",
      slaJson: JSON.stringify(body.sla ?? {}),
      messagesJson: JSON.stringify(
        Array.isArray(body.messages) && body.messages.length > 0
          ? body.messages
          : [{ id: `m-${now.getTime()}`, author: requester, role: "Customer", text: description, ts: now.toISOString() }],
      ),
      activityJson: JSON.stringify(
        Array.isArray(body.activity) && body.activity.length > 0
          ? body.activity
          : [{ icon: "flag", label: "Ticket created", detail: `via ${body.channel || "Email"} · routed to ${body.team || "Operations"}`, ts: now.toISOString() }],
      ),
    },
  });

  await logAudit({
    sessionUser,
    action: "CREATE",
    entity: "HelpdeskTicket",
    entityId: created.ticketId,
    description: `Created support ticket: ${created.subject} (${created.priority}) for ${created.customer}`,
  });

  return NextResponse.json({ ticket: toDTO(created) }, { status: 201 });
}
