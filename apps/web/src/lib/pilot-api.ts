import { api } from "@/lib/api-client";
import { ApiError, type ApiRequestOptions } from "@reanzly/shared";
import {
  ReminderListResponseSchema,
  ReminderResponseSchema,
  KnowledgeListResponseSchema,
  KnowledgeResponseSchema,
  HelpdeskListResponseSchema,
  HelpdeskResponseSchema,
} from "@reanzly/contracts";
import type { Reminder } from "@/lib/types";
import type { KnowledgeArticle } from "@/components/modules/knowledge/_helpers";
import type { HelpdeskTicket } from "@/components/modules/helpdesk/_helpers";

const REMINDERS_DOMAIN = "reminders" as const;
const KNOWLEDGE_DOMAIN = "knowledge" as const;
const HELPDESK_DOMAIN = "helpdesk" as const;

export function pilotErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  return fallback;
}

export async function fetchReminders(options?: ApiRequestOptions): Promise<Reminder[]> {
  const body = await api<unknown>("reminders", { domain: REMINDERS_DOMAIN, ...options });
  return ReminderListResponseSchema.parse(body).reminders as Reminder[];
}

export async function createReminder(
  payload: Omit<Reminder, "id" | "daysRemaining" | "status"> & Partial<Pick<Reminder, "status">>,
  options?: ApiRequestOptions,
): Promise<Reminder> {
  const body = await api<unknown>("reminders", {
    domain: REMINDERS_DOMAIN,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    ...options,
  });
  return ReminderResponseSchema.parse(body).reminder as Reminder;
}

export async function patchReminder(
  id: string,
  patch: Partial<Reminder>,
  options?: ApiRequestOptions,
): Promise<Reminder> {
  const body = await api<unknown>(`reminders/${id}`, {
    domain: REMINDERS_DOMAIN,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
    ...options,
  });
  return ReminderResponseSchema.parse(body).reminder as Reminder;
}

export async function fetchKnowledgeArticles(options?: ApiRequestOptions): Promise<KnowledgeArticle[]> {
  const body = await api<unknown>("knowledge", { domain: KNOWLEDGE_DOMAIN, ...options });
  return KnowledgeListResponseSchema.parse(body).articles as KnowledgeArticle[];
}

export async function fetchKnowledgeArticle(
  id: string,
  options?: ApiRequestOptions,
): Promise<KnowledgeArticle> {
  const body = await api<unknown>(`knowledge/${id}`, {
    domain: KNOWLEDGE_DOMAIN,
    cache: "no-store",
    ...options,
  });
  return KnowledgeResponseSchema.parse(body).article as KnowledgeArticle;
}

export async function createKnowledgeArticle(
  payload: Omit<KnowledgeArticle, "id" | "related"> & { related?: unknown[] },
  options?: ApiRequestOptions,
): Promise<KnowledgeArticle> {
  const { related: _related, ...bodyPayload } = payload;
  const body = await api<unknown>("knowledge", {
    domain: KNOWLEDGE_DOMAIN,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyPayload),
    ...options,
  });
  return KnowledgeResponseSchema.parse(body).article as KnowledgeArticle;
}

export async function patchKnowledgeArticle(
  id: string,
  patch: Record<string, unknown>,
  options?: ApiRequestOptions,
): Promise<KnowledgeArticle> {
  const body = await api<unknown>(`knowledge/${id}`, {
    domain: KNOWLEDGE_DOMAIN,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
    ...options,
  });
  return KnowledgeResponseSchema.parse(body).article as KnowledgeArticle;
}

export async function fetchHelpdeskTickets(options?: ApiRequestOptions): Promise<HelpdeskTicket[]> {
  const body = await api<unknown>("helpdesk", { domain: HELPDESK_DOMAIN, ...options });
  return HelpdeskListResponseSchema.parse(body).tickets as unknown as HelpdeskTicket[];
}

export async function fetchHelpdeskTicket(
  id: string,
  options?: ApiRequestOptions,
): Promise<HelpdeskTicket> {
  const body = await api<unknown>(`helpdesk/${id}`, {
    domain: HELPDESK_DOMAIN,
    cache: "no-store",
    ...options,
  });
  return HelpdeskResponseSchema.parse(body).ticket as unknown as HelpdeskTicket;
}

export async function createHelpdeskTicket(
  payload: Record<string, unknown>,
  options?: ApiRequestOptions,
): Promise<HelpdeskTicket> {
  const body = await api<unknown>("helpdesk", {
    domain: HELPDESK_DOMAIN,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    ...options,
  });
  return HelpdeskResponseSchema.parse(body).ticket as unknown as HelpdeskTicket;
}

export async function patchHelpdeskTicket(
  id: string,
  patch: Record<string, unknown>,
  options?: ApiRequestOptions,
): Promise<HelpdeskTicket> {
  const body = await api<unknown>(`helpdesk/${id}`, {
    domain: HELPDESK_DOMAIN,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
    ...options,
  });
  return HelpdeskResponseSchema.parse(body).ticket as unknown as HelpdeskTicket;
}
