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

/**
 * Appends a real BrokerLedgerEntry row, chaining runningBalanceINR off the
 * broker's last entry. Used by the settlement cycle lifecycle (commission
 * credit on Approve, payout debit on Paid) - the settlements PATCH route's
 * own comment already documented this write path, but it was never
 * actually implemented anywhere until now.
 */
export async function appendBrokerLedgerEntry(
  brokerProfileId: string,
  entry: { type: "Credit" | "Debit"; description: string; refId: string; amountINR: number; date?: Date },
) {
  const last = await db.brokerLedgerEntry.findFirst({
    where: { brokerProfileId },
    orderBy: { date: "desc" },
  });
  const count = await db.brokerLedgerEntry.count({ where: { brokerProfileId } });
  const entryId = `led-${String(count + 1).padStart(3, "0")}`;
  const delta = entry.type === "Credit" ? entry.amountINR : -entry.amountINR;
  const runningBalanceINR = (last?.runningBalanceINR ?? 0) + delta;

  return db.brokerLedgerEntry.create({
    data: {
      brokerProfileId,
      entryId,
      date: entry.date ?? new Date(),
      type: entry.type,
      description: entry.description,
      refId: entry.refId,
      amountINR: entry.amountINR,
      runningBalanceINR,
    },
  });
}
