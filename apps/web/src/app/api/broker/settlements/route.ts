import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheInvalidate } from "@/lib/cache";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { getSessionBrokerProfile, requireBrokerProfile } from "@/lib/broker";

// ===== Settlement Cycles API =====
// GET  - list all settlement cycles for this session's own broker profile,
//        newest first.
// POST - create a new settlement cycle in Draft status. The broker assembles a
//        cycle from the gross trip value, the system computes commission +
//        TDS + net payable.

const ALLOWED_GST_TREATMENTS = new Set(["Forward Charge", "Reverse Charge"]);

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

    const rows = await db.settlementCycle.findMany({
      where: { brokerProfileId: profile.id },
      orderBy: { periodEnd: "desc" },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[broker/settlements GET]", error);
    return NextResponse.json({ error: "Unable to fetch settlement cycles." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "broker-settlements");
  if (denied) return denied;

  try {
    const profile = await getSessionBrokerProfile(sessionUser);
    const notLinked = requireBrokerProfile(profile);
    if (notLinked) return notLinked;
    const brokerProfileId = profile!.id;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const periodStartRaw = typeof body.periodStart === "string" ? body.periodStart : "";
    const periodEndRaw = typeof body.periodEnd === "string" ? body.periodEnd : "";
    if (!periodStartRaw || !periodEndRaw) {
      return NextResponse.json(
        { error: "periodStart and periodEnd are required" },
        { status: 400 }
      );
    }
    const periodStart = new Date(periodStartRaw);
    const periodEnd = new Date(periodEndRaw);
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      return NextResponse.json({ error: "Invalid periodStart or periodEnd" }, { status: 400 });
    }

    const grossTrips = typeof body.grossTrips === "number" ? Math.max(0, Math.floor(body.grossTrips)) : 0;
    const grossValueINR = typeof body.grossValueINR === "number" ? body.grossValueINR : 0;
    const commissionPct = typeof body.commissionPct === "number" ? body.commissionPct : 8;
    const tdsPct = typeof body.tdsPct === "number" ? body.tdsPct : 1;
    const gstTreatment =
      typeof body.gstTreatment === "string" && ALLOWED_GST_TREATMENTS.has(body.gstTreatment)
        ? body.gstTreatment
        : "Forward Charge";

    const commissionEarnedINR = Math.round((grossValueINR * commissionPct) / 100);
    const tdsDeductedINR = Math.round((commissionEarnedINR * tdsPct) / 100);
    const netPayableINR = commissionEarnedINR - tdsDeductedINR;

    // Generate next cycle id: CYC-YYYY-XX based on count for the current year.
    const year = new Date().getFullYear();
    const count = await db.settlementCycle.count({ where: { brokerProfileId } });
    const cycleId = `CYC-${year}-${String(count + 1).padStart(2, "0")}`;

    const created = await db.settlementCycle.create({
      data: {
        brokerProfileId,
        cycleId,
        periodStart,
        periodEnd,
        grossTrips,
        grossValueINR,
        commissionPct,
        commissionEarnedINR,
        tdsPct,
        tdsDeductedINR,
        gstTreatment,
        netPayableINR,
        status: "Draft",
      },
    });

    cacheInvalidate("broker:settlements", "broker:dashboard");

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[broker/settlements POST]", error);
    return NextResponse.json({ error: "Unable to create settlement cycle." }, { status: 500 });
  }
}
