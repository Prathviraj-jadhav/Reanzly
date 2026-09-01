import { db } from "@/lib/db";

// Monday-based week start, matching the frontend's startOfWeek() in
// planning/_helpers.tsx so "current week" means the same thing on both sides.
export function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // Mon = 0
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseWeekStart(param: string | null): Date {
  if (!param) return startOfWeek();
  // Date-only (YYYY-MM-DD) is local calendar day — avoids UTC shifting a
  // Monday 00:00 IST into the previous week when sent as toISOString().
  if (/^\d{4}-\d{2}-\d{2}/.test(param)) {
    const [y, m, d] = param.slice(0, 10).split("-").map(Number);
    return startOfWeek(new Date(y, m - 1, d));
  }
  const d = new Date(param);
  return isNaN(d.getTime()) ? startOfWeek() : startOfWeek(d);
}

export type AllocationRow = { id: string; resourceId: string; startAt: Date; durationHours: number };

// Overlap-based conflict detection, same logic as the old client-side
// findConflicts() in planning/_helpers.tsx, just operating on real rows.
export function findConflictIds(allocations: AllocationRow[]): Set<string> {
  const conflictIds = new Set<string>();
  const byResource = new Map<string, AllocationRow[]>();
  for (const a of allocations) {
    if (!byResource.has(a.resourceId)) byResource.set(a.resourceId, []);
    byResource.get(a.resourceId)!.push(a);
  }
  for (const list of byResource.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const aStart = a.startAt.getTime();
        const aEnd = aStart + a.durationHours * 3600000;
        const bStart = b.startAt.getTime();
        const bEnd = bStart + b.durationHours * 3600000;
        if (aStart < bEnd && bStart < aEnd) {
          conflictIds.add(a.id);
          conflictIds.add(b.id);
        }
      }
    }
  }
  return conflictIds;
}

// Resource metrics (utilisationWeek/allocationsThisWeek/conflicts) computed
// live from real PlanningAllocation rows for the given week - never stored,
// so they can't go stale (same pattern as Reminder.daysRemaining).
export async function computeResourceMetrics(companyId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const allocations = await db.planningAllocation.findMany({
    where: { companyId, startAt: { gte: weekStart, lt: weekEnd } },
    select: { id: true, resourceId: true, startAt: true, durationHours: true },
  });
  const conflictIds = findConflictIds(allocations);
  const byResource = new Map<string, { hours: number; count: number; conflicts: number }>();
  for (const a of allocations) {
    const cur = byResource.get(a.resourceId) ?? { hours: 0, count: 0, conflicts: 0 };
    cur.hours += a.durationHours;
    cur.count += 1;
    if (conflictIds.has(a.id)) cur.conflicts += 1;
    byResource.set(a.resourceId, cur);
  }
  return byResource;
}
