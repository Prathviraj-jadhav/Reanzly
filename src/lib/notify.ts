import { db } from "@/lib/db";

// Real notification trigger point - the counterpart to logAudit() for
// user-facing alerts. Replaces the client-only mock-data.ts NOTIFICATIONS
// array: every call here writes a real row a real recipient will see in
// GET /api/notifications, instead of a static list nobody's actions ever
// touched.

export type NotificationSeverity = "critical" | "warning" | "info";

export async function notify(params: {
  companyId: string;
  userId: string;
  category: string;
  title: string;
  description?: string;
  severity?: NotificationSeverity;
  link?: { module: string; id?: string };
  dedupeKey?: string;
}): Promise<void> {
  const { companyId, userId, category, title, description, severity = "info", link, dedupeKey } = params;

  // Skip if a dedupe key is given and a notification with that key already
  // exists for this user - keeps recurring scan jobs from spamming the same
  // alert on every run.
  if (dedupeKey) {
    const existing = await db.notification.findFirst({ where: { userId, dedupeKey } });
    if (existing) return;
  }

  await db.notification.create({
    data: {
      companyId,
      userId,
      category,
      severity,
      title,
      description: description ?? null,
      linkModule: link?.module ?? null,
      linkId: link?.id ?? null,
      dedupeKey: dedupeKey ?? null,
    },
  });
}

/** Convenience: notify every user whose role matches `roleId` at this company. */
export async function notifyRole(params: {
  companyId: string;
  roleId: string;
  category: string;
  title: string;
  description?: string;
  severity?: NotificationSeverity;
  link?: { module: string; id?: string };
  dedupeKey?: string;
}): Promise<void> {
  const { roleId, ...rest } = params;
  const users = await db.user.findMany({ where: { companyId: params.companyId, role: roleId }, select: { id: true } });
  for (const u of users) {
    await notify({ ...rest, companyId: params.companyId, userId: u.id, dedupeKey: rest.dedupeKey ? `${rest.dedupeKey}:${u.id}` : undefined });
  }
}
