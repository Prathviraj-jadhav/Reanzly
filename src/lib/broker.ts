// ===== Broker request helpers =====
// Resolves the real BrokerProfile a Broker Portal session represents, via
// BrokerProfile.userId (mirrors src/lib/vendor-portal.ts's Customer.userId
// pattern). This replaced the earlier getDefaultBrokerProfile(), which
// operated on a single global "default" profile with no real auth at all -
// every broker route trusted whichever BrokerProfile row came back first,
// so any caller could read or write any broker's data.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

/** Resolves the real BrokerProfile linked to this session's User, or null. */
export async function getSessionBrokerProfile(sessionUser: SessionUser) {
  return db.brokerProfile.findUnique({ where: { userId: sessionUser.id } });
}

/** Returns a 404 NextResponse if this session has no linked BrokerProfile, else null. */
export function requireBrokerProfile(profile: unknown): NextResponse | null {
  if (!profile) {
    return NextResponse.json(
      { error: "No broker account is linked to this login." },
      { status: 404 },
    );
  }
  return null;
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
