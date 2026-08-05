import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheInvalidate } from "@/lib/cache";

// ===== Broker Quote Detail API =====
// PATCH - update quote status (Pending -> Accepted/Rejected/Expired). Used when
//         the marketplace accepts or rejects the broker's quote, or it expires
//         past the time-to-quote window.

const ALLOWED_STATUSES = new Set(["Pending", "Accepted", "Rejected", "Expired"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.status === "string") {
      if (!ALLOWED_STATUSES.has(body.status)) {
        return NextResponse.json(
          { error: `status must be one of ${[...ALLOWED_STATUSES].join(", ")}` },
          { status: 400 }
        );
      }
      data.status = body.status;
    }
    if (typeof body.quotedRatePerKm === "number") {
      data.quotedRatePerKm = body.quotedRatePerKm;
    }

    const updated = await db.brokerQuote.update({
      where: { id },
      data,
    });

    cacheInvalidate("broker:quotes", "broker:dashboard");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[broker/quotes/[id] PATCH]", error);
    return NextResponse.json({ error: "Unable to update quote." }, { status: 500 });
  }
}
