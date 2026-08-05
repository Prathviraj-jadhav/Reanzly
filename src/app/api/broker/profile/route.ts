import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheWrap, cacheInvalidate, CACHE_TTL } from "@/lib/cache";
import { getDefaultBrokerProfile, safeParseJson, toJsonString } from "@/lib/broker";

// ===== Broker Profile API =====
// GET  - return the active broker profile (the demo RZB-000001 profile, or
//        the first profile by createdAt if no demo profile exists yet).
// PATCH - update commercial settings: markup, settlement cycle, GST treatment,
//         coverage lanes.
//
// For now there is no per-user broker auth, so all routes operate on the
// single default profile. When broker auth lands, swap getDefaultBrokerProfile
// to resolve the profile from the session.

const ALLOWED_SETTLEMENT_CYCLES = new Set(["Weekly", "Fortnightly", "Monthly"]);
const ALLOWED_GST_TREATMENTS = new Set(["Forward Charge", "Reverse Charge"]);

export async function GET() {
  try {
    const profile = await cacheWrap(
      "broker:profile",
      { ...CACHE_TTL.detail, tags: ["broker:profile", "broker:dashboard"] },
      async () => {
        const p = await getDefaultBrokerProfile();
        if (!p) return null;
        return p;
      }
    );

    if (!profile) {
      // Empty state - frontend hook will fall back to seed data.
      return NextResponse.json({}, { status: 200 });
    }
    return NextResponse.json({
      ...profile,
      coverageLanes: safeParseJson<string[]>(profile.coverageLanes, []),
    });
  } catch (error) {
    console.error("[broker/profile GET]", error);
    return NextResponse.json({ error: "Unable to fetch broker profile." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const profile = await getDefaultBrokerProfile();
    if (!profile) {
      return NextResponse.json({ error: "Broker profile not found." }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (typeof body.markupPct === "number") {
      if (body.markupPct < 0 || body.markupPct > 50) {
        return NextResponse.json({ error: "markupPct must be between 0 and 50" }, { status: 400 });
      }
      data.markupPct = body.markupPct;
    }

    if (typeof body.settlementCycle === "string") {
      if (!ALLOWED_SETTLEMENT_CYCLES.has(body.settlementCycle)) {
        return NextResponse.json(
          { error: `settlementCycle must be one of ${[...ALLOWED_SETTLEMENT_CYCLES].join(", ")}` },
          { status: 400 }
        );
      }
      data.settlementCycle = body.settlementCycle;
    }

    if (typeof body.gstTreatment === "string") {
      if (!ALLOWED_GST_TREATMENTS.has(body.gstTreatment)) {
        return NextResponse.json(
          { error: `gstTreatment must be one of ${[...ALLOWED_GST_TREATMENTS].join(", ")}` },
          { status: 400 }
        );
      }
      data.gstTreatment = body.gstTreatment;
    }

    if (Array.isArray(body.coverageLanes)) {
      const lanes = body.coverageLanes.filter((l) => typeof l === "string");
      data.coverageLanes = toJsonString(lanes);
    }

    if (typeof body.gstin === "string") data.gstin = body.gstin || null;
    if (typeof body.companyName === "string") data.companyName = body.companyName;
    if (typeof body.contactName === "string") data.contactName = body.contactName;
    if (typeof body.phone === "string") data.phone = body.phone;

    const updated = await db.brokerProfile.update({
      where: { id: profile.id },
      data,
    });

    cacheInvalidate("broker:profile", "broker:dashboard");

    return NextResponse.json({
      ...updated,
      coverageLanes: safeParseJson<string[]>(updated.coverageLanes, []),
    });
  } catch (error) {
    console.error("[broker/profile PATCH]", error);
    return NextResponse.json({ error: "Unable to update broker profile." }, { status: 500 });
  }
}
