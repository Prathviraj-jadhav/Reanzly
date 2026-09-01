import { z } from "zod";

export const HelpdeskMessageSchema = z.record(z.string(), z.unknown());
export const HelpdeskActivitySchema = z.record(z.string(), z.unknown());

export const HelpdeskTicketDtoSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  subject: z.string(),
  description: z.string(),
  customer: z.string(),
  customerCode: z.string(),
  priority: z.string(),
  status: z.string(),
  channel: z.string(),
  team: z.string(),
  assignee: z.string(),
  requester: z.string(),
  requesterEmail: z.string(),
  category: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().optional(),
  relatedRef: z.string().optional(),
  sla: z.record(z.string(), z.unknown()),
  messages: z.array(z.unknown()),
  activity: z.array(z.unknown()),
});

export const HelpdeskListResponseSchema = z.object({
  tickets: z.array(HelpdeskTicketDtoSchema),
});

export const HelpdeskResponseSchema = z.object({
  ticket: HelpdeskTicketDtoSchema,
});

export const HelpdeskCreateSchema = z
  .object({
    subject: z.string().min(1),
    customer: z.string().min(1),
    requester: z.string().min(1),
    description: z.string().min(1),
    customerCode: z.string().optional(),
    priority: z.string().optional(),
    channel: z.string().optional(),
    team: z.string().optional(),
    requesterEmail: z.string().optional(),
    category: z.string().optional(),
    sla: z.record(z.string(), z.unknown()).optional(),
    messages: z.array(z.unknown()).optional(),
    activity: z.array(z.unknown()).optional(),
  })
  .strict();

export const HelpdeskNewMessageSchema = z
  .object({
    text: z.string(),
    internal: z.boolean().optional(),
  })
  .strict();

export const HelpdeskPatchSchema = z
  .object({
    subject: z.string().optional(),
    description: z.string().optional(),
    customer: z.string().optional(),
    customerCode: z.string().nullable().optional(),
    priority: z.string().optional(),
    channel: z.string().optional(),
    team: z.string().optional(),
    assignee: z.string().optional(),
    requester: z.string().optional(),
    requesterEmail: z.string().optional(),
    category: z.string().optional(),
    relatedRef: z.string().nullable().optional(),
    status: z.string().optional(),
    sla: z.record(z.string(), z.unknown()).optional(),
    newMessage: HelpdeskNewMessageSchema.optional(),
  })
  .strict();

export type HelpdeskTicketDto = z.infer<typeof HelpdeskTicketDtoSchema>;
