import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { toDTO } from "../route";

/** @deprecated Use `/api/v1/helpdesk/:id` (Fastify). Rollback via `NEXT_PUBLIC_HELPDESK_API_VERSION=legacy`. */

// Accepts both the real cuid `id` and the display `ticketId` (TKT-####),
// since the module's own links/search use either interchangeably.
async function findTicket(companyId: string, idOrTicketId: string) {
  return db.helpdeskTicket.findFirst({
    where: { companyId, OR: [{ id: idOrTicketId }, { ticketId: idOrTicketId }] },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "helpdesk");
  if (denied) return denied;
  const { id } = await params;

  const ticket = await findTicket(sessionUser.companyId, id);
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  return NextResponse.json({ ticket: toDTO(ticket) });
}

// Single generic PATCH covering every real mutation the detail/list UI
// performs - direct field edits, status transitions (auto-stamping
// resolvedAt + an activity entry), and replies/internal notes (appended as
// a real message from the signed-in user rather than local-only state).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "helpdesk");
  if (denied) return denied;
  const { id } = await params;

  const existing = await findTicket(sessionUser.companyId, id);
  if (!existing) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  const now = new Date();

  if (body.subject !== undefined) data.subject = String(body.subject);
  if (body.description !== undefined) data.description = String(body.description);
  if (body.customer !== undefined) data.customer = String(body.customer);
  if (body.customerCode !== undefined) data.customerCode = body.customerCode || null;
  if (body.priority !== undefined) data.priority = String(body.priority);
  if (body.channel !== undefined) data.channel = String(body.channel);
  if (body.team !== undefined) data.team = String(body.team);
  if (body.assignee !== undefined) data.assignee = String(body.assignee);
  if (body.requester !== undefined) data.requester = String(body.requester);
  if (body.requesterEmail !== undefined) data.requesterEmail = String(body.requesterEmail);
  if (body.category !== undefined) data.category = String(body.category);
  if (body.relatedRef !== undefined) data.relatedRef = body.relatedRef || null;
  if (body.sla !== undefined) data.slaJson = JSON.stringify(body.sla);

  const activity: unknown[] = JSON.parse(existing.activityJson || "[]");
  let statusChanged = false;

  if (body.status !== undefined && body.status !== existing.status) {
    data.status = String(body.status);
    statusChanged = true;
    if ((body.status === "Resolved" || body.status === "Closed") && !existing.resolvedAt) {
      data.resolvedAt = now;
      const sla = JSON.parse((data.slaJson as string) ?? existing.slaJson ?? "{}");
      sla.resolvedAt = now.toISOString();
      data.slaJson = JSON.stringify(sla);
    }
    activity.push({
      icon: body.status === "Resolved" ? "check" : body.status === "Closed" ? "archive" : "play",
      label: `Status → ${body.status}`,
      detail: `changed by ${sessionUser.name}`,
      ts: now.toISOString(),
    });
    data.activityJson = JSON.stringify(activity);
  }

  if (body.newMessage !== undefined) {
    const text = String(body.newMessage.text || "").trim();
    if (text) {
      const messages = JSON.parse(existing.messagesJson || "[]");
      messages.push({
        id: `m-${now.getTime()}`,
        author: sessionUser.name,
        role: "Agent",
        text,
        ts: now.toISOString(),
        internal: Boolean(body.newMessage.internal),
      });
      data.messagesJson = JSON.stringify(messages);
      if (!statusChanged) data.updatedAt = now;
    }
  }

  const updated = await db.helpdeskTicket.update({ where: { id: existing.id }, data });

  if (statusChanged) {
    await logAudit({
      sessionUser,
      action: updated.status === "Closed" ? "STATUS_CHANGE" : "UPDATE",
      entity: "HelpdeskTicket",
      entityId: updated.ticketId,
      description: `${updated.ticketId} status: ${existing.status} → ${updated.status}`,
    });
  } else if (body.assignee !== undefined && body.assignee !== existing.assignee) {
    await logAudit({
      sessionUser,
      action: "UPDATE",
      entity: "HelpdeskTicket",
      entityId: updated.ticketId,
      description: `${updated.ticketId} reassigned: ${existing.assignee} → ${updated.assignee}`,
    });
  }

  return NextResponse.json({ ticket: toDTO(updated) });
}
