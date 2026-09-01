import type { PrismaClient } from "@reanzly/database";

const INCLUDE = {
  vehicle: { select: { name: true } },
  driver: { select: { name: true } },
} as const;

export type ReminderRow = Awaited<
  ReturnType<PrismaClient["reminder"]["findFirst"]>
> & {
  vehicle: { name: string } | null;
  driver: { name: string } | null;
};

export function statusForDays(days: number): string {
  if (days < 0) return "Overdue";
  if (days <= 7) return "Due Soon";
  return "Upcoming";
}

export function toReminderDto(r: {
  id: string;
  category: string;
  title: string;
  dueDate: Date;
  vehicle: { name: string } | null;
  driver: { name: string } | null;
}) {
  const daysRemaining = Math.round((r.dueDate.getTime() - Date.now()) / 86400000);
  return {
    id: r.id,
    type: r.category === "Service" ? ("Service" as const) : ("Renewal" as const),
    entity: r.vehicle?.name ?? r.driver?.name ?? "",
    entityType: r.vehicle ? ("Vehicle" as const) : ("Driver" as const),
    name: r.title,
    dueDate: r.dueDate.toISOString(),
    daysRemaining,
    status: statusForDays(daysRemaining),
  };
}

export async function listReminders(db: PrismaClient, companyId: string) {
  return db.reminder.findMany({
    where: { companyId },
    include: INCLUDE,
    orderBy: { dueDate: "asc" },
  });
}

export async function findReminderById(db: PrismaClient, companyId: string, id: string) {
  const row = await db.reminder.findUnique({ where: { id }, include: INCLUDE });
  if (!row || row.companyId !== companyId) return null;
  return row;
}

export async function resolveEntityIds(
  db: PrismaClient,
  companyId: string,
  entityName: string,
  entityType: string | undefined,
) {
  const trimmed = entityName.trim();
  const isVehicle = entityType !== "Driver";
  const matchedVehicle =
    isVehicle && trimmed
      ? await db.vehicle.findFirst({ where: { companyId, name: trimmed } })
      : null;
  const matchedDriver =
    !isVehicle && trimmed
      ? await db.driver.findFirst({ where: { companyId, name: trimmed } })
      : null;
  return {
    vehicleId: matchedVehicle?.id ?? null,
    driverId: matchedDriver?.id ?? null,
  };
}

export async function createReminder(
  db: PrismaClient,
  companyId: string,
  data: {
    name: string;
    dueDate: Date;
    type?: string;
    entity?: string;
    entityType?: string;
  },
) {
  const { vehicleId, driverId } = await resolveEntityIds(
    db,
    companyId,
    data.entity ?? "",
    data.entityType,
  );
  return db.reminder.create({
    data: {
      companyId,
      vehicleId,
      driverId,
      title: data.name,
      category: data.type === "Service" ? "Service" : "Custom",
      dueDate: data.dueDate,
      status: "Pending",
    },
    include: INCLUDE,
  });
}

export async function patchReminder(
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
  const existing = await findReminderById(db, companyId, id);
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.title = patch.name;
  if (patch.dueDate !== undefined) data.dueDate = new Date(patch.dueDate);
  if (patch.type !== undefined) data.category = patch.type === "Service" ? "Service" : "Custom";
  if (
    patch.status !== undefined &&
    patch.status !== "Overdue" &&
    patch.status !== "Due Soon" &&
    patch.status !== "Upcoming"
  ) {
    data.status = patch.status;
  }

  return db.reminder.update({ where: { id }, data, include: INCLUDE });
}

export async function deleteReminder(db: PrismaClient, companyId: string, id: string) {
  const existing = await findReminderById(db, companyId, id);
  if (!existing) return false;
  await db.reminder.delete({ where: { id } });
  return true;
}
