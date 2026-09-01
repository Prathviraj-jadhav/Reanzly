import type { PrismaClient } from "@reanzly/database";
import type { AuthContext } from "@reanzly/auth";
import { DomainServiceError } from "../../lib/domain-error.js";
import { logAudit } from "../../lib/audit.js";
import {
  createTicket,
  findTicketByIdOrCode,
  listTickets,
  patchTicket,
  toHelpdeskTicketDto,
} from "./repository.js";

export async function getTickets(db: PrismaClient, companyId: string) {
  const rows = await listTickets(db, companyId);
  return rows.map(toHelpdeskTicketDto);
}

export async function getTicketDetail(db: PrismaClient, companyId: string, id: string) {
  const ticket = await findTicketByIdOrCode(db, companyId, id);
  if (!ticket) {
    throw new DomainServiceError("NOT_FOUND", "Ticket not found.", 404);
  }
  return toHelpdeskTicketDto(ticket);
}

export async function createTicketForCompany(
  db: PrismaClient,
  auth: AuthContext,
  input: {
    subject: string;
    customer: string;
    requester: string;
    description: string;
    customerCode?: string;
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
  const created = await createTicket(db, auth.companyId, input);

  await logAudit(db, {
    auth,
    action: "CREATE",
    entity: "HelpdeskTicket",
    entityId: created.ticketId,
    description: `Created support ticket: ${created.subject} (${created.priority}) for ${created.customer}`,
  });

  return toHelpdeskTicketDto(created);
}

export async function updateTicketForCompany(
  db: PrismaClient,
  auth: AuthContext,
  id: string,
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
  },
) {
  const result = await patchTicket(db, auth.companyId, id, {
    ...patch,
    actorName: auth.name,
  });
  if (!result) {
    throw new DomainServiceError("NOT_FOUND", "Ticket not found.", 404);
  }

  const { existing, updated, statusChanged } = result;

  if (statusChanged) {
    await logAudit(db, {
      auth,
      action: updated.status === "Closed" ? "STATUS_CHANGE" : "UPDATE",
      entity: "HelpdeskTicket",
      entityId: updated.ticketId,
      description: `${updated.ticketId} status: ${existing.status} → ${updated.status}`,
    });
  } else if (patch.assignee !== undefined && patch.assignee !== existing.assignee) {
    await logAudit(db, {
      auth,
      action: "UPDATE",
      entity: "HelpdeskTicket",
      entityId: updated.ticketId,
      description: `${updated.ticketId} reassigned: ${existing.assignee} → ${updated.assignee}`,
    });
  }

  return toHelpdeskTicketDto(updated);
}
