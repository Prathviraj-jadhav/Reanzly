import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { hasModuleAccess, forbidden, unauthorized } from "@/lib/permissions";
import { findDriverForSession, isDriverRole } from "@/lib/driver-session";

export function canReadFleetDrivers(role: string): boolean {
  return (
    hasModuleAccess(role, "trips") ||
    hasModuleAccess(role, "vehicles") ||
    hasModuleAccess(role, "fleet-map") ||
    hasModuleAccess(role, "drivers-staff")
  );
}

export type DriverScopeResult =
  | { ok: true; driverId: string }
  | { ok: false; response: NextResponse };

/**
 * Resolve which driverId a session may read/write activity for.
 * Drivers: own profile only. Fleet roles: any driver in same company.
 */
export async function resolveDriverScope(
  sessionUser: SessionUser | null,
  requestedDriverId?: string,
): Promise<DriverScopeResult> {
  if (!sessionUser) {
    return { ok: false, response: unauthorized() };
  }

  if (isDriverRole(sessionUser.role)) {
    const me = await findDriverForSession(sessionUser);
    if (!me) {
      return { ok: false, response: forbidden("No driver profile is linked to this account.") };
    }
    if (requestedDriverId && requestedDriverId !== me.id) {
      return { ok: false, response: forbidden("You can only access your own driver activity.") };
    }
    return { ok: true, driverId: me.id };
  }

  if (!canReadFleetDrivers(sessionUser.role)) {
    return { ok: false, response: forbidden() };
  }

  if (!requestedDriverId) {
    return { ok: false, response: NextResponse.json({ error: "driverId is required" }, { status: 400 }) };
  }

  const driver = await db.driver.findFirst({
    where: { id: requestedDriverId, companyId: sessionUser.companyId },
    select: { id: true },
  });
  if (!driver) {
    return { ok: false, response: NextResponse.json({ error: "Driver not found." }, { status: 404 }) };
  }

  return { ok: true, driverId: driver.id };
}
