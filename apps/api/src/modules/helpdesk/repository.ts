import type { PrismaClient } from "@reanzly/database";

type TicketRow = NonNullable<Awaited<ReturnType<PrismaClient["helpdeskTicket"]["findFirst"]>>>;

export function toHelpdeskTicketDto(t: TicketRow) {
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
    sla: JSON.parse(t.slaJson || "{}") as Record<string, unknown>,
    messages: JSON.parse(t.messagesJson || "[]") as unknown[],
    activity: JSON.parse(t.activityJson || "[]") as unknown[],
  };
}

export async function listTickets(db: PrismaClient, companyId: string) {
  return db.helpdeskTicket.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function findTicketByIdOrCode(
  db: PrismaClient,
  companyId: string,
  idOrTicketId: string,
) {
  return db.helpdeskTicket.findFirst({
    where: { companyId, OR: [{ id: idOrTicketId }, { ticketId: idOrTicketId }] },
  });
}

export async function nextTicketDisplayId(db: PrismaClient, companyId: string) {
  const count = await db.helpdeskTicket.count({ where: { companyId } });
  return `TKT-${String(2841 + count)}`;
}

export async function createTicket(
  db: PrismaClient,
  companyId: string,
  input: {
    subject: string;
    customer: string;
    requester: string;
    description: string;
    customerCode?: string | null;
    priority?: string;
    channel?: string;
    team?: string;
    requesterEmail?: string;
    category?: string;
    sla?: Record<string, unknown>;
    messages?: unknown[];
    activity?: unknown[];
  },
) {
  const ticketId = await nextTicketDisplayId(db, companyId);
  const now = new Date();
  return db.helpdeskTicket.create({
    data: {
      companyId,
      ticketId,
      subject: input.subject,
      description: input.description,
      customer: input.customer,
      customerCode: input.customerCode || null,
      priority: input.priority || "Medium",
      status: "New",
      channel: input.channel || "Email",
      team: input.team || "Operations",
      requester: input.requester,
      requesterEmail: input.requesterEmail || "-",
      category: input.category || "Documentation",
      slaJson: JSON.stringify(input.sla ?? {}),
      messagesJson: JSON.stringify(
        Array.isArray(input.messages) && input.messages.length > 0
          ? input.messages
          : [
              {
                id: `m-${now.getTime()}`,
                author: input.requester,
                role: "Customer",
                text: input.description,
                ts: now.toISOString(),
              },
            ],
      ),
      activityJson: JSON.stringify(
        Array.isArray(input.activity) && input.activity.length > 0
          ? input.activity
          : [
              {
                icon: "flag",
                label: "Ticket created",
                detail: `via ${input.channel || "Email"} · routed to ${input.team || "Operations"}`,
                ts: now.toISOString(),
              },
            ],
      ),
    },
  });
}

export async function patchTicket(
  db: PrismaClient,
  companyId: string,
  idOrTicketId: string,
  patch: {
    subject?: string;
    description?: string;
    customer?: string;
    customerCode?: string | null;
    priority?: string;
    channel?: string;
    team?: string;
    assignee?: string;
    requester?: string;
    requesterEmail?: string;
    category?: string;
    relatedRef?: string | null;
    status?: string;
    sla?: Record<string, unknown>;
    newMessage?: { text: string; internal?: boolean };
    actorName: string;
  },
) {
  const existing = await findTicketByIdOrCode(db, companyId, idOrTicketId);
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  const now = new Date();

  if (patch.subject !== undefined) data.subject = String(patch.subject);
  if (patch.description !== undefined) data.description = String(patch.description);
  if (patch.customer !== undefined) data.customer = String(patch.customer);
  if (patch.customerCode !== undefined) data.customerCode = patch.customerCode || null;
  if (patch.priority !== undefined) data.priority = String(patch.priority);
  if (patch.channel !== undefined) data.channel = String(patch.channel);
  if (patch.team !== undefined) data.team = String(patch.team);
  if (patch.assignee !== undefined) data.assignee = String(patch.assignee);
  if (patch.requester !== undefined) data.requester = String(patch.requester);
  if (patch.requesterEmail !== undefined) data.requesterEmail = String(patch.requesterEmail);
  if (patch.category !== undefined) data.category = String(patch.category);
  if (patch.relatedRef !== undefined) data.relatedRef = patch.relatedRef || null;
  if (patch.sla !== undefined) data.slaJson = JSON.stringify(patch.sla);

  const activity: unknown[] = JSON.parse(existing.activityJson || "[]");
  let statusChanged = false;

  if (patch.status !== undefined && patch.status !== existing.status) {
    data.status = String(patch.status);
    statusChanged = true;
    if ((patch.status === "Resolved" || patch.status === "Closed") && !existing.resolvedAt) {
      data.resolvedAt = now;
      const sla = JSON.parse((data.slaJson as string) ?? existing.slaJson ?? "{}") as Record<
        string,
        unknown
      >;
      sla.resolvedAt = now.toISOString();
      data.slaJson = JSON.stringify(sla);
    }
    activity.push({
      icon:
        patch.status === "Resolved" ? "check" : patch.status === "Closed" ? "archive" : "play",
      label: `Status → ${patch.status}`,
      detail: `changed by ${patch.actorName}`,
      ts: now.toISOString(),
    });
    data.activityJson = JSON.stringify(activity);
  }

  if (patch.newMessage !== undefined) {
    const text = String(patch.newMessage.text || "").trim();
    if (text) {
      const messages = JSON.parse(existing.messagesJson || "[]") as unknown[];
      messages.push({
        id: `m-${now.getTime()}`,
        author: patch.actorName,
        role: "Agent",
        text,
        ts: now.toISOString(),
        internal: Boolean(patch.newMessage.internal),
      });
      data.messagesJson = JSON.stringify(messages);
      if (!statusChanged) data.updatedAt = now;
    }
  }

  const updated = await db.helpdeskTicket.update({ where: { id: existing.id }, data });
  return { existing, updated, statusChanged };
}
