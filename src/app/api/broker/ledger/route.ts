import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDefaultBrokerProfileId } from "@/lib/broker";

// ===== Broker Ledger API =====
// GET - return all ledger entries (commission credits + payout debits) for the
//       broker profile, oldest first so the runningBalanceINR column reads
//       chronologically.
//
// Read-only. Ledger entries are written by the settlement cycle lifecycle
// (commission credit on approve, payout debit on Paid via NACH).

export async function GET() {
  try {
    const brokerProfileId = await getDefaultBrokerProfileId();
    if (!brokerProfileId) return NextResponse.json([]);

    const rows = await db.brokerLedgerEntry.findMany({
      where: { brokerProfileId },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[broker/ledger GET]", error);
    return NextResponse.json({ error: "Unable to fetch ledger entries." }, { status: 500 });
  }
}
