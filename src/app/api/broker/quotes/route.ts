import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheInvalidate } from "@/lib/cache";
import { getDefaultBrokerProfileId } from "@/lib/broker";

// ===== Broker Quotes API =====
// GET  - list all quotes the broker has sent on marketplace loads, newest first.
// POST - create a new quote on a marketplace load (the broker sees the base
//        rate + applies their markup to produce a quoted rate).

export async function GET() {
  try {
    const brokerProfileId = await getDefaultBrokerProfileId();
    if (!brokerProfileId) return NextResponse.json([]);

    const rows = await db.brokerQuote.findMany({
      where: { brokerProfileId },
      orderBy: { quotedAt: "desc" },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[broker/quotes GET]", error);
    return NextResponse.json({ error: "Unable to fetch quotes." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const brokerProfileId = await getDefaultBrokerProfileId();
    if (!brokerProfileId) {
      return NextResponse.json({ error: "Broker profile not found." }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const loadId = typeof body.loadId === "string" ? body.loadId : "";
    const lane = typeof body.lane === "string" ? body.lane : "";
    const vehicleType = typeof body.vehicleType === "string" ? body.vehicleType : "";
    const customer = typeof body.customer === "string" ? body.customer : "";
    if (!loadId || !lane || !vehicleType || !customer) {
      return NextResponse.json(
        { error: "loadId, lane, vehicleType, and customer are required" },
        { status: 400 }
      );
    }

    const baseRatePerKm = typeof body.baseRatePerKm === "number" ? body.baseRatePerKm : 0;
    const markupPct = typeof body.markupPct === "number" ? body.markupPct : 8;
    const quotedRatePerKm =
      typeof body.quotedRatePerKm === "number"
        ? body.quotedRatePerKm
        : Math.round(baseRatePerKm * (1 + markupPct / 100));

    // Generate next quote id: qte-XXXXX based on count + 6101 baseline (matches seed).
    const count = await db.brokerQuote.count({ where: { brokerProfileId } });
    const quoteId = `qte-${String(6101 + count).padStart(5, "0")}`;

    const created = await db.brokerQuote.create({
      data: {
        brokerProfileId,
        quoteId,
        loadId,
        lane,
        vehicleType,
        customer,
        quotedRatePerKm,
        baseRatePerKm,
        markupPct,
        status: "Pending",
      },
    });

    cacheInvalidate("broker:quotes", "broker:dashboard");

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[broker/quotes POST]", error);
    return NextResponse.json({ error: "Unable to create quote." }, { status: 500 });
  }
}
