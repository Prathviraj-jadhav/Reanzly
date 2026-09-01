import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export function isDriverRole(role: string): boolean {
  return role === "driver";
}

/** Resolve the Driver roster row for this login (email, then name, same company). */
export async function findDriverForSession(sessionUser: SessionUser) {
  const byEmail = await db.driver.findFirst({
    where: { companyId: sessionUser.companyId, email: sessionUser.email },
  });
  if (byEmail) return byEmail;

  const byName = await db.driver.findFirst({
    where: { companyId: sessionUser.companyId, name: sessionUser.name },
  });
  if (byName) {
    if (!byName.email) {
      return db.driver.update({
        where: { id: byName.id },
        data: { email: sessionUser.email },
      });
    }
    return byName;
  }
  return null;
}

/** Find or create the roster row so field-app and /api/trips share one identity. */
export async function ensureDriverForSession(sessionUser: SessionUser) {
  const existing = await findDriverForSession(sessionUser);
  if (existing) return existing;
  return db.driver.create({
    data: {
      companyId: sessionUser.companyId,
      name: sessionUser.name,
      email: sessionUser.email,
      role: "Driver",
      status: "Active",
    },
  });
}

/** Stage a new driver onto a couple of Planned/Active trips so first login isn't empty. */
export async function assignDemoTripsIfEmpty(companyId: string, driverId: string) {
  const existing = await db.trip.count({ where: { companyId, driverId } });
  if (existing > 0) return existing;
  const unstaffed = await db.trip.findMany({
    where: { companyId, status: { in: ["Planned", "Active"] } },
    orderBy: { createdAt: "desc" },
    take: 2,
  });
  if (unstaffed.length === 0) return 0;
  await db.trip.updateMany({
    where: { id: { in: unstaffed.map((t) => t.id) } },
    data: { driverId },
  });
  return unstaffed.length;
}
