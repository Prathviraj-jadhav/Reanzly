import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { getSessionBrokerProfile } from "@/lib/broker";

// ===== Broker Ledger API =====
// GET - return all ledger entries (commission credits + payout debits) for
//       this session's own broker profile, oldest first so the
//       runningBalanceINR column reads chronologically.
//
// Read-only. Ledger entries are written by the settlement cycle lifecycle
// (commission credit on approve, payout debit on Paid via NACH).

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "broker-settlements");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    if (!profile) return NextResponse.json([]);

    const rows = await db.brokerLedgerEntry.findMany({
      where: { brokerProfileId: profile.id },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[broker/ledger GET]", error);
    return NextResponse.json({ error: "Unable to fetch ledger entries." }, { status: 500 });
  }
}
