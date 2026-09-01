import type { PrismaClient } from "@reanzly/database";
import { DomainServiceError } from "../../lib/domain-error.js";
import {
  createReminder,
  deleteReminder,
  findReminderById,
  listReminders,
  patchReminder,
  toReminderDto,
} from "./repository.js";

export async function getReminders(db: PrismaClient, companyId: string) {
  const rows = await listReminders(db, companyId);
  return rows.map(toReminderDto);
}

export async function createReminderForCompany(
  db: PrismaClient,
  companyId: string,
  input: {
    name: string;
    dueDate: string;
    type?: string;
    entity?: string;
    entityType?: string;
  },
) {
  const dueDate = new Date(input.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    throw new DomainServiceError("VALIDATION_ERROR", "name and dueDate are required.", 400);
  }
  const created = await createReminder(db, companyId, {
    name: input.name,
    dueDate,
    type: input.type,
    entity: input.entity,
    entityType: input.entityType,
  });
  return toReminderDto(created);
}

export async function updateReminderForCompany(
  db: PrismaClient,
  companyId: string,
  id: string,
  patch: {
    name?: string;
    dueDate?: string;
    type?: string;
    status?: string;
  },
) {
  const updated = await patchReminder(db, companyId, id, patch);
  if (!updated) {
    throw new DomainServiceError("NOT_FOUND", "Reminder not found.", 404);
  }
  return toReminderDto(updated);
}

export async function removeReminderForCompany(
  db: PrismaClient,
  companyId: string,
  id: string,
) {
  const deleted = await deleteReminder(db, companyId, id);
  if (!deleted) {
    throw new DomainServiceError("NOT_FOUND", "Reminder not found.", 404);
  }
  return { ok: true as const };
}

export { findReminderById, toReminderDto };
