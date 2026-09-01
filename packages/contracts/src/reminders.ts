import { z } from "zod";

export const ReminderTypeSchema = z.enum(["Service", "Renewal"]);
export const ReminderEntityTypeSchema = z.enum(["Vehicle", "Driver"]);
export const ReminderDisplayStatusSchema = z.enum(["Overdue", "Due Soon", "Upcoming"]);
export const ReminderStoredStatusSchema = z.enum(["Pending", "Done", "Snoozed"]);

export const ReminderDtoSchema = z.object({
  id: z.string(),
  type: ReminderTypeSchema,
  entity: z.string(),
  entityType: ReminderEntityTypeSchema,
  name: z.string(),
  dueDate: z.string(),
  daysRemaining: z.number(),
  status: z.union([ReminderDisplayStatusSchema, ReminderStoredStatusSchema]),
});

export const ReminderListResponseSchema = z.object({
  reminders: z.array(ReminderDtoSchema),
});

export const ReminderResponseSchema = z.object({
  reminder: ReminderDtoSchema,
});

export const ReminderCreateSchema = z
  .object({
    name: z.string().min(1),
    dueDate: z.string().min(1),
    type: ReminderTypeSchema.optional(),
    entity: z.string().optional(),
    entityType: ReminderEntityTypeSchema.optional(),
  })
  .strict();

export const ReminderPatchSchema = z
  .object({
    name: z.string().optional(),
    dueDate: z.string().optional(),
    type: ReminderTypeSchema.optional(),
    status: z.string().optional(),
  })
  .strict();

export type ReminderDto = z.infer<typeof ReminderDtoSchema>;
