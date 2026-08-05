// ===== Broker request helpers =====
// Until broker auth (session) is wired, all broker API routes operate on a
// single "default" BrokerProfile - the demo RZB-000001 seeded by
// src/scripts/seed-broker.ts. When real auth lands, swap getDefaultBrokerProfile
// to read the session and resolve the BrokerProfile from the authenticated user.
//
// Returns null when the broker tables are empty (fresh DB before seeding) so
// route handlers can return an empty-array response that the frontend hook
// (useBrokerApi) will fall back to seed data from.

import { db } from "@/lib/db";

export async function getDefaultBrokerProfile() {
  // Prefer the seeded demo broker; fall back to the first profile by createdAt.
  const seeded = await db.brokerProfile.findUnique({
    where: { brokerCode: "RZB-000001" },
  });
  if (seeded) return seeded;
  return db.brokerProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });
}

/** Returns the brokerProfileId or null if no profile exists. */
export async function getDefaultBrokerProfileId(): Promise<string | null> {
  const profile = await getDefaultBrokerProfile();
  return profile?.id ?? null;
}

/** Parse a JSON string field safely. Returns the fallback on parse failure. */
export function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Stringify a value for JSON-string DB columns (coverageLanes, vehicleTypes). */
export function toJsonString(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[]";
  }
}
